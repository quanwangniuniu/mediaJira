from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from asset.models import AssetVersion, Asset
from core.models import Organization, Team, Project
from task.models import Task
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()


class AssetDownloadAPITest(APITestCase):
    """Test Asset Download endpoint"""
    
    def setUp(self):
        # Create test users
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='testpass123'
        )
        
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            username='user2',
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
        
        # Create project and task
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Authenticate user1 by default
        self.client.force_authenticate(user=self.user1)
    
    def test_download_finalized_version(self):
        """Test downloading finalized version (should succeed)"""
        # Create a finalized version
        test_file_content = b'test file content for download'
        uploaded_file = SimpleUploadedFile(
            'test_file.txt',
            test_file_content,
            content_type='text/plain'
        )
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=uploaded_file,
            uploaded_by=self.user1,
            scan_status=AssetVersion.CLEAN
        )
        
        # Finalize the version
        version.finalize(finalized_by=self.user1)
        version.save()
        
        url = reverse('asset:asset-version-download', kwargs={'asset_id': self.asset.id, 'version_id': version.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['asset_id'], self.asset.id)
        self.assertEqual(response.data['version_number'], 1)
        self.assertEqual(response.data['version_status'], AssetVersion.FINALIZED)
        self.assertEqual(response.data['scan_status'], AssetVersion.CLEAN)
        self.assertIn('download_url', response.data)
    
    def test_download_draft_version(self):
        """Test downloading draft version (should fail)"""
        # Create a draft version
        test_file_content = b'test file content for download'
        uploaded_file = SimpleUploadedFile(
            'test_file.txt',
            test_file_content,
            content_type='text/plain'
        )
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=uploaded_file,
            uploaded_by=self.user1,
            scan_status=AssetVersion.CLEAN
        )
        
        # Version is in draft state (default)
        url = reverse('asset:asset-version-download', kwargs={'asset_id': self.asset.id, 'version_id': version.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Only finalized versions can be downloaded', response.data['detail'])
    
    def test_download_nonexistent_version(self):
        """Test downloading non-existent version"""
        url = reverse('asset:asset-version-download', kwargs={'asset_id': self.asset.id, 'version_id': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_download_version_without_file(self):
        """Test downloading version without file"""
        # Create a version without file
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user1,
            scan_status=AssetVersion.CLEAN
        )
        
        # Finalize the version
        version.finalize(finalized_by=self.user1)
        version.save()
        
        url = reverse('asset:asset-version-download', kwargs={'asset_id': self.asset.id, 'version_id': version.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('No file available for download', response.data['detail'])
    
    def test_download_unauthenticated(self):
        """Test downloading without authentication"""
        # Create a finalized version
        test_file_content = b'test file content for download'
        uploaded_file = SimpleUploadedFile(
            'test_file.txt',
            test_file_content,
            content_type='text/plain'
        )
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=uploaded_file,
            uploaded_by=self.user1,
            scan_status=AssetVersion.CLEAN
        )
        
        # Finalize the version
        version.finalize(finalized_by=self.user1)
        version.save()
        
        # Remove authentication
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:asset-version-download', kwargs={'asset_id': self.asset.id, 'version_id': version.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_download_different_user(self):
        """Test downloading with different authenticated user"""
        # Create a finalized version
        test_file_content = b'test file content for download'
        uploaded_file = SimpleUploadedFile(
            'test_file.txt',
            test_file_content,
            content_type='text/plain'
        )
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=uploaded_file,
            uploaded_by=self.user1,
            scan_status=AssetVersion.CLEAN
        )
        
        # Finalize the version
        version.finalize(finalized_by=self.user1)
        version.save()
        
        # Authenticate as different user
        self.client.force_authenticate(user=self.user2)
        
        url = reverse('asset:asset-version-download', kwargs={'asset_id': self.asset.id, 'version_id': version.id})
        response = self.client.get(url)
        
        # Should still be able to download (authentication is sufficient)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['asset_id'], self.asset.id)
        self.assertEqual(response.data['version_number'], 1)
