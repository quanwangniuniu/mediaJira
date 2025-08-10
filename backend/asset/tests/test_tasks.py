"""
Test cases for Celery tasks related to virus scanning.
These tests focus on the asynchronous task execution and error handling.
"""

import os
import tempfile
from unittest.mock import patch, MagicMock
from django.test import TransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model

from asset.models import Asset, AssetVersion
from core.models import Project, Task
from asset.tasks import scan_asset_version, scan_all_pending_versions, _scanner
from core.models import Organization, Team

User = get_user_model()


class BaseTaskTestCase(TransactionTestCase):
    """Base test case for task testing with common setup"""
    
    def setUp(self):
        """Set up common test data"""
        # Reset the global scanner instance to ensure test isolation
        self._reset_global_scanner()
        
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

        # Create project and task (core models)
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(name="Test Task", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
    
    def _reset_global_scanner(self):
        """Reset the global scanner instance to ensure test isolation"""
        from asset.tasks import AssetVersionScanner
        import asset.tasks
        asset.tasks._scanner = AssetVersionScanner()
    
    def create_test_version(self, version_number=1, scan_status=AssetVersion.PENDING, has_file=True):
        """Helper method to create a test asset version"""
        if has_file:
            test_content = f'Test file content for version {version_number}'.encode('utf-8')
            file_obj = SimpleUploadedFile(
                f'test_file_v{version_number}.txt',
                test_content,
                content_type='text/plain'
            )
        else:
            file_obj = None
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=version_number,
            uploaded_by=self.user,
            file=file_obj,
            scan_status=scan_status
        )
        
        # Double-check that the file field is correctly set
        if not has_file:
            # Use update to ensure the file field is set to None
            AssetVersion.objects.filter(id=version.id).update(file=None)
            version.refresh_from_db()
        
        return version


class ScanAssetVersionTaskTest(BaseTaskTestCase):
    """Test the scan_asset_version Celery task"""
    
    def setUp(self):
        super().setUp()
        # Create a test version with file
        self.test_version = self.create_test_version(version_number=1)
    
    @patch('clamd.ClamdNetworkSocket')
    def test_scan_clean_file_success(self, mock_clamd):
        """Test successful scanning of a clean file"""
        # Mock ClamAV response for clean file
        mock_cd = MagicMock()
        mock_cd.ping.return_value = 'PONG'
        mock_cd.instream.return_value = {'stream': ('OK', None)}
        mock_clamd.return_value = mock_cd
        
        # Execute the task
        result = scan_asset_version(self.test_version.id)
        
        # Verify the result
        self.assertEqual(result, "File is clean")
        
        # Verify the asset version was updated
        self.test_version.refresh_from_db()
        self.assertEqual(self.test_version.scan_status, AssetVersion.CLEAN)
    
    @patch('clamd.ClamdNetworkSocket')
    def test_scan_infected_file_success(self, mock_clamd):
        """Test successful scanning of an infected file"""
        # Mock ClamAV response for infected file
        mock_cd = MagicMock()
        mock_cd.ping.return_value = 'PONG'
        mock_cd.instream.return_value = {'stream': ('FOUND', 'Win.Test.EICAR_HDB-1')}
        mock_clamd.return_value = mock_cd
        
        # Execute the task
        result = scan_asset_version(self.test_version.id)
        
        # Verify the result
        self.assertEqual(result, "Virus detected: Win.Test.EICAR_HDB-1")
        
        # Verify the asset version was updated
        self.test_version.refresh_from_db()
        self.assertEqual(self.test_version.scan_status, AssetVersion.INFECTED)
    
    def test_scan_version_without_file(self):
        """Test scanning a version without a file"""
        # Create version without file
        version_no_file = self.create_test_version(version_number=2, has_file=False)
        
        # Execute the task
        result = scan_asset_version(version_no_file.id)
        
        # Verify the result
        self.assertIn("No file available", result)
        
        # Verify the asset version was updated to error status
        version_no_file.refresh_from_db()
        self.assertEqual(version_no_file.scan_status, AssetVersion.ERROR)
    
    @patch('asset.tasks.os.path.exists')
    def test_scan_file_not_found_on_disk(self, mock_exists):
        """Test scanning when file doesn't exist on disk"""
        # Mock file not existing
        mock_exists.return_value = False
        
        # Execute the task
        result = scan_asset_version(self.test_version.id)
        
        # Verify the result
        self.assertEqual(result, "File not found on disk")
        
        # Verify the asset version was updated
        self.test_version.refresh_from_db()
        self.assertEqual(self.test_version.scan_status, AssetVersion.ERROR)
    
    @patch('clamd.ClamdNetworkSocket')
    def test_scan_clamav_connection_failed(self, mock_clamd):
        """Test scanning when ClamAV connection fails"""
        # Mock ClamAV connection failure
        mock_clamd.side_effect = Exception("Connection refused")
        
        # Execute the task
        result = scan_asset_version(self.test_version.id)
        
        # Verify the result contains error information
        self.assertIn("Scan failed", result)
        self.assertIn("Connection refused", result)
        
        # Verify the asset version was updated to error status
        self.test_version.refresh_from_db()
        self.assertEqual(self.test_version.scan_status, AssetVersion.ERROR)
    
    @patch('clamd.ClamdNetworkSocket')
    def test_scan_clamav_scan_failed(self, mock_clamd):
        """Test scanning when ClamAV scan operation fails"""
        # Mock ClamAV to raise an exception during scan
        mock_cd = MagicMock()
        mock_cd.ping.return_value = 'PONG'
        mock_cd.instream.side_effect = Exception("Scan operation failed")
        mock_clamd.return_value = mock_cd
        
        # Execute the task
        result = scan_asset_version(self.test_version.id)
        
        # Verify the result contains error information
        self.assertIn("Scan failed", result)
        self.assertIn("Scan operation failed", result)
        
        # Verify the asset version was updated to error status
        self.test_version.refresh_from_db()
        self.assertEqual(self.test_version.scan_status, AssetVersion.ERROR)
    
    def test_scan_nonexistent_version(self):
        """Test scanning a non-existent asset version"""
        # Execute the task with non-existent version ID
        result = scan_asset_version(99999)
        
        # Verify the result
        self.assertEqual(result, "Asset version 99999 not found")
    
    @patch('clamd.ClamdNetworkSocket')
    def test_scan_unexpected_error(self, mock_clamd):
        """Test scanning when an unexpected error occurs"""
        # Mock ClamAV to raise an exception during scan
        mock_clamd.side_effect = Exception("Unexpected ClamAV error")
        
        # Execute the task
        result = scan_asset_version(self.test_version.id)
        
        # Verify the result contains error information
        self.assertIn("Scan failed", result)
        self.assertIn("Unexpected ClamAV error", result)
        
        # Verify the asset version was updated to error status
        self.test_version.refresh_from_db()
        self.assertEqual(self.test_version.scan_status, AssetVersion.ERROR)


class ScanAllPendingVersionsTaskTest(BaseTaskTestCase):
    """Test the scan_all_pending_versions Celery task"""
    
    def setUp(self):
        super().setUp()
        # Create test versions with different scan statuses
        self.pending_version1 = self.create_test_version(version_number=1, scan_status=AssetVersion.PENDING)
        self.pending_version2 = self.create_test_version(version_number=2, scan_status=AssetVersion.PENDING)
        self.error_version = self.create_test_version(version_number=3, scan_status=AssetVersion.ERROR)
        self.clean_version = self.create_test_version(version_number=4, scan_status=AssetVersion.CLEAN)
    
    @patch('asset.tasks.scan_asset_version.delay')
    def test_scan_all_pending_versions_success(self, mock_scan_delay):
        """Test scanning all pending versions successfully"""
        # Execute the task
        result = scan_all_pending_versions()
        
        # Verify the result format
        self.assertIn("Queued", result)
        self.assertIn("versions for scanning", result)
        
        # Verify scan_asset_version.delay was called for pending and error versions
        expected_calls = 3  # 2 pending + 1 error
        self.assertEqual(mock_scan_delay.call_count, expected_calls)
        
        # Verify specific version IDs were called
        called_version_ids = [call[0][0] for call in mock_scan_delay.call_args_list]
        self.assertIn(self.pending_version1.id, called_version_ids)
        self.assertIn(self.pending_version2.id, called_version_ids)
        self.assertIn(self.error_version.id, called_version_ids)
        
        # Verify clean version was not called
        self.assertNotIn(self.clean_version.id, called_version_ids)
    
    @patch('asset.tasks.scan_asset_version.delay')
    def test_scan_all_pending_versions_no_pending(self, mock_scan_delay):
        """Test scanning when no versions are pending"""
        # Update all versions to non-pending status
        self.pending_version1.scan_status = AssetVersion.CLEAN
        self.pending_version1.save()
        self.pending_version2.scan_status = AssetVersion.INFECTED
        self.pending_version2.save()
        self.error_version.scan_status = AssetVersion.CLEAN
        self.error_version.save()
        
        # Execute the task
        result = scan_all_pending_versions()
        
        # Verify the result
        self.assertEqual(result, "No pending versions to scan")
        
        # Verify scan_asset_version.delay was not called
        mock_scan_delay.assert_not_called()
    
    @patch('asset.tasks.scan_asset_version.delay')
    def test_scan_all_pending_versions_with_versions_without_files(self, mock_scan_delay):
        """Test scanning with versions that don't have files"""
        # Create versions without files
        version_no_file1 = self.create_test_version(version_number=5, has_file=False)
        version_no_file2 = self.create_test_version(version_number=6, has_file=False)
        
        # Execute the task
        result = scan_all_pending_versions()
        
        # Verify the result
        self.assertIn("Queued", result)
        self.assertIn("versions for scanning", result)
        
        # Verify scan_asset_version.delay was called for versions with files only
        # Should be 3: 2 pending + 1 error (all have files from setUp)
        # The 2 versions without files should not be included
        self.assertEqual(mock_scan_delay.call_count, 3)
        
        # Verify versions without files were not called
        called_version_ids = [call[0][0] for call in mock_scan_delay.call_args_list]
        self.assertNotIn(version_no_file1.id, called_version_ids)
        self.assertNotIn(version_no_file2.id, called_version_ids)
        
        # Verify versions with files were called
        self.assertIn(self.pending_version1.id, called_version_ids)
        self.assertIn(self.pending_version2.id, called_version_ids)
        self.assertIn(self.error_version.id, called_version_ids) 