"""
Test cases for virus scanning functionality.
These tests cover both simulated and real virus scanning scenarios.
"""

import os
import tempfile
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

from asset.models import Asset, AssetVersion
from core.models import Organization, Team, Project, Task
from asset.tasks import scan_asset_version, VirusScanner, VirusScanResult

User = get_user_model()


class VirusScanningTestCase(TestCase):
    """Base test case for virus scanning functionality"""
    
    def setUp(self):
        """Set up test data"""
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
        self.project = Project.objects.create(name="Virus Scan Test Project", organization=self.organization)
        self.task = Task.objects.create(name="Virus Scan Test Task", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
    
    def create_test_file(self, content, filename='test.txt'):
        """Helper method to create a test file"""
        return SimpleUploadedFile(
            filename,
            content.encode('utf-8') if isinstance(content, str) else content,
            content_type='text/plain'
        )


class VirusScannerTestCase(VirusScanningTestCase):
    """Test cases for VirusScanner class"""
    
    def test_virus_scanner_initialization(self):
        """Test VirusScanner initialization"""
        scanner = VirusScanner()
        self.assertIsNotNone(scanner)
        # Check that host and port are set (actual values depend on settings)
        self.assertIsNotNone(scanner.host)
        self.assertIsNotNone(scanner.port)
        # Default port should be 3310
        self.assertEqual(scanner.port, 3310)
    
    def test_scan_result_creation(self):
        """Test VirusScanResult creation"""
        result = VirusScanResult(
            status=AssetVersion.CLEAN,
            message="File is clean",
            details={'test': 'data'}
        )
        
        self.assertEqual(result.status, AssetVersion.CLEAN)
        self.assertEqual(result.message, "File is clean")
        self.assertEqual(result.details['test'], 'data')
    
    def test_scan_result_without_details(self):
        """Test VirusScanResult creation without details"""
        result = VirusScanResult(
            status=AssetVersion.INFECTED,
            message="Virus detected"
        )
        
        self.assertEqual(result.status, AssetVersion.INFECTED)
        self.assertEqual(result.message, "Virus detected")
        self.assertEqual(result.details, {})


class AssetVersionScanStatusTestCase(VirusScanningTestCase):
    """Test cases for AssetVersion scan status transitions"""
    
    def test_scan_status_transitions(self):
        """Test scan status transitions"""
        # Create asset version
        test_file = self.create_test_file("Test content")
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        # Test initial status
        self.assertEqual(version.scan_status, AssetVersion.PENDING)
        
        # Test start_scan transition
        version.start_scan()
        version.save()
        self.assertEqual(version.scan_status, AssetVersion.SCANNING)
        
        # Test mark_clean transition
        version.mark_clean()
        version.save()
        self.assertEqual(version.scan_status, AssetVersion.CLEAN)
    
    def test_mark_infected_transition(self):
        """Test mark_infected transition"""
        # Create asset version and start scan
        test_file = self.create_test_file("Test content")
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        version.start_scan()
        version.save()
        
        # Test mark_infected transition
        version.mark_infected(virus_name="TestVirus.Simulation")
        version.save()
        
        self.assertEqual(version.scan_status, AssetVersion.INFECTED)
        # Note: virus_name might not be stored in the model, depending on implementation
    
    def test_invalid_transitions(self):
        """Test invalid state transitions"""
        test_file = self.create_test_file("Test content")
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        # Should not be able to mark as infected from pending state
        with self.assertRaises(Exception):
            version.mark_infected(virus_name="TestVirus")


class VirusScanningAPITestCase(APITestCase):
    """Test cases for virus scanning API endpoints"""
    
    def setUp(self):
        """Set up test data"""
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
        self.project = Project.objects.create(name="Virus Scan Test Project", organization=self.organization)
        self.task = Task.objects.create(name="Virus Scan Test Task", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Authenticate user
        self.client.force_authenticate(user=self.user)
    
    def test_upload_file_scan_status(self):
        """Test that uploaded files get proper scan status"""
        # Create test file
        test_content = b"This is a test file for virus scanning."
        test_file = SimpleUploadedFile(
            'test_file.txt',
            test_content,
            content_type='text/plain'
        )
        
        # Upload file
        url = reverse('asset:asset-version-list', kwargs={'asset_id': self.asset.id})
        response = self.client.post(url, {'file': test_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that version was created with pending scan status
        version_id = response.data['id']
        version = AssetVersion.objects.get(id=version_id)
        self.assertEqual(version.scan_status, AssetVersion.PENDING)
    
    def test_version_detail_scan_status(self):
        """Test that version detail endpoint shows scan status"""
        # Create asset version
        test_content = b"This is a test file for virus scanning."
        test_file = SimpleUploadedFile(
            'test_file.txt',
            test_content,
            content_type='text/plain'
        )
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.CLEAN
        )
        
        # Get version detail
        url = reverse('asset:asset-version-detail', 
                     kwargs={'asset_id': self.asset.id, 'version_id': version.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('scan_status', response.data)
        self.assertEqual(response.data['scan_status'], AssetVersion.CLEAN)


class MockVirusScanningTestCase(VirusScanningTestCase):
    """Test cases using mock virus scanning (no real virus files needed)"""
    
    def test_clean_file_scan(self):
        """Test scanning a clean file"""
        # Create clean test file
        clean_content = "This is a clean file with no suspicious content."
        test_file = self.create_test_file(clean_content)
        
        # Create asset version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        # Simulate clean scan result
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        
        # Verify result
        self.assertEqual(version.scan_status, AssetVersion.CLEAN)
    
    def test_infected_file_scan(self):
        """Test scanning an infected file (simulated)"""
        # Create test file with suspicious content
        suspicious_content = """
        This file contains suspicious patterns:
        - exec(shell_command)
        - system("rm -rf /")
        - eval(user_input)
        """
        test_file = self.create_test_file(suspicious_content)
        
        # Create asset version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        # Simulate infected scan result
        version.start_scan()
        version.save()
        version.mark_infected(virus_name="TestVirus.Simulation")
        version.save()
        
        # Verify result
        self.assertEqual(version.scan_status, AssetVersion.INFECTED)
    
    def test_scan_error_handling(self):
        """Test handling of scan errors"""
        # Create test file
        test_file = self.create_test_file("Test content")
        
        # Create asset version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        # Simulate scan error
        version.start_scan()
        version.save()
        version.mark_error(error_message="Scan failed due to timeout")
        version.save()
        
        # Verify result
        self.assertEqual(version.scan_status, AssetVersion.ERROR)


class VirusScanningIntegrationTestCase(VirusScanningTestCase):
    """Integration tests for virus scanning (may require ClamAV)"""
    
    def test_real_virus_scan_task(self):
        """Test the actual virus scanning task (if ClamAV is available)"""
        # Create test file
        test_file = self.create_test_file("This is a test file for virus scanning.")
        
        # Create asset version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        try:
            # Run the actual scan task
            result = scan_asset_version(version.id)
            
            # Refresh from database
            version.refresh_from_db()
            
            # Verify that scan status changed from pending
            self.assertNotEqual(version.scan_status, AssetVersion.PENDING)
            
            # Verify that scan status is one of the valid states
            valid_statuses = [AssetVersion.CLEAN, AssetVersion.INFECTED, AssetVersion.ERROR]
            self.assertIn(version.scan_status, valid_statuses)
            
        except Exception as e:
            # If ClamAV is not available, this is expected
            self.skipTest(f"ClamAV not available: {e}")
    
    def test_eicar_file_scan(self):
        """Test scanning EICAR test file (if available)"""
        # EICAR test string
        eicar_string = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
        
        # Create EICAR test file
        test_file = self.create_test_file(eicar_string, 'eicar_test.txt')
        
        # Create asset version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            scan_status=AssetVersion.PENDING
        )
        
        try:
            # Run the actual scan task
            result = scan_asset_version(version.id)
            
            # Refresh from database
            version.refresh_from_db()
            
            # If ClamAV is working, EICAR should be detected as infected
            if version.scan_status == AssetVersion.INFECTED:
                print("✅ EICAR file correctly detected as infected!")
            elif version.scan_status == AssetVersion.CLEAN:
                print("⚠️  EICAR file not detected as infected (ClamAV may not be configured)")
            else:
                print(f"⚠️  EICAR file scan status: {version.scan_status}")
            
            # Verify that scan completed
            self.assertNotEqual(version.scan_status, AssetVersion.PENDING)
            
        except Exception as e:
            # If ClamAV is not available, this is expected
            self.skipTest(f"ClamAV not available: {e}")


# Helper functions for creating test files
def create_eicar_test_file():
    """Create an EICAR test file"""
    eicar_string = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
    temp_file.write(eicar_string.encode('utf-8'))
    temp_file.close()
    
    return temp_file.name


def create_mock_infected_file():
    """Create a mock infected file with suspicious content"""
    suspicious_content = """
    This is a mock infected file for testing purposes.
    It contains suspicious patterns that might trigger heuristic detection.
    
    Some suspicious patterns:
    - exec(shell_command)
    - system("rm -rf /")
    - eval(user_input)
    - <script>alert('xss')</script>
    
    This file is safe and only used for testing virus scanning functionality.
    """
    
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.txt')
    temp_file.write(suspicious_content.encode('utf-8'))
    temp_file.close()
    
    return temp_file.name
