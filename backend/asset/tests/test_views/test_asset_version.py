from re import S
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from asset.models import Task, Asset, AssetVersion
from core.models import Organization, Team
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
import tempfile
import os

User = get_user_model()


class AssetVersionAPITest(APITestCase):
    """Test Asset Version endpoints"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
        
        # Create test file
        self.test_file_content = b'test file content for version'
        self.test_file = SimpleUploadedFile(
            'test_version.txt',
            self.test_file_content,
            content_type='text/plain'
        )
        
        # URL for asset version list
        self.url = reverse('asset:asset-version-list', kwargs={'asset_id': self.asset.id})
    
    def create_finalized_version(self, asset=None):
        """Helper method to create a finalized version for testing"""
        if asset is None:
            asset = self.asset
        
        # Create a new file object for each call to avoid file pointer issues
        test_file = SimpleUploadedFile(
            'test_version.txt',
            self.test_file_content,
            content_type='text/plain'
        )
        
        # Create version
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING,
            checksum='1234567890'
        )
        
        # Start scan and mark as clean
        version.start_scan()
        version.mark_clean()
        version.save()
        # Finalize the version
        version.finalize(finalized_by=self.user)
        version.save()
        return version
    
    def test_list_asset_versions(self):
        """Test listing asset versions"""
        # Create a version with SimpleUploadedFile
        test_file = SimpleUploadedFile(
            'test_version.txt',
            self.test_file_content,
            content_type='text/plain'
        )
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=test_file,
            uploaded_by=self.user
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], version.id)
        self.assertEqual(response.data['results'][0]['version_number'], 1)
        self.assertEqual(response.data['results'][0]['version_status'], AssetVersion.DRAFT)
        self.assertEqual(response.data['results'][0]['scan_status'], AssetVersion.PENDING)
        
        # Clean up the version to avoid affecting other tests
        version.delete()
    
    def test_list_asset_versions_unauthenticated(self):
        """Test that unauthenticated user gets 401 when trying to list versions"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_asset_versions_nonexistent_asset(self):
        """Test listing versions for non-existent asset returns 404"""
        self.client.force_authenticate(user=self.user)
        url = reverse('asset:asset-version-list', kwargs={'asset_id': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_asset_version(self):
        """Test creating asset version with file upload"""
        self.client.force_authenticate(user=self.user)
        
        with open('test_file.txt', 'wb') as f:
            f.write(b'test file content')
        
        with open('test_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssetVersion.objects.count(), 1)
        
        version = AssetVersion.objects.first()
        self.assertEqual(version.version_number, 1)
        self.assertEqual(version.scan_status, AssetVersion.PENDING)
        self.assertEqual(version.version_status, AssetVersion.DRAFT)
        self.assertEqual(version.uploaded_by, self.user)
        self.assertEqual(version.asset, self.asset)
        
        # Check response data
        self.assertEqual(response.data['version_number'], 1)
        self.assertEqual(response.data['scan_status'], AssetVersion.PENDING)
        self.assertEqual(response.data['version_status'], AssetVersion.DRAFT)
        
        # Clean up test file
        os.remove('test_file.txt')
    
    def test_create_asset_version_without_file(self):
        """Test creating asset version without file should fail"""
        self.client.force_authenticate(user=self.user)
        data = {}
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
        self.assertIn('File is required', str(response.data['non_field_errors'][0]))
    
    def test_create_asset_version_unauthenticated(self):
        """Test that unauthenticated user gets 401 when trying to create version"""
        with open('test_file.txt', 'wb') as f:
            f.write(b'test file content')
        
        with open('test_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Clean up test file
        os.remove('test_file.txt')
    
    def test_create_asset_version_nonexistent_asset(self):
        """Test creating version for non-existent asset returns 404"""
        self.client.force_authenticate(user=self.user)
        url = reverse('asset:asset-version-list', kwargs={'asset_id': 99999})
        
        with open('test_file.txt', 'wb') as f:
            f.write(b'test file content')
        
        with open('test_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Clean up test file
        os.remove('test_file.txt')
    
    def test_create_multiple_versions(self):
        """Test creating multiple versions with auto-incrementing version numbers"""
        self.client.force_authenticate(user=self.user)
        
        # Create first version
        with open('test_file1.txt', 'wb') as f:
            f.write(b'test file content 1')
        
        with open('test_file1.txt', 'rb') as f:
            data = {'file': f}
            response1 = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response1.data['version_number'], 1)
        
        # Finalize the first version so we can create a second version
        version1 = AssetVersion.objects.first()
        version1.start_scan()
        version1.mark_clean()
        version1.finalize(finalized_by=self.user)
        version1.save()
        
        # Create second version
        with open('test_file2.txt', 'wb') as f:
            f.write(b'test file content 2')
        
        with open('test_file2.txt', 'rb') as f:
            data = {'file': f}
            response2 = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response2.data['version_number'], 2)
        
        # Verify both versions exist
        self.assertEqual(AssetVersion.objects.count(), 2)
        versions = AssetVersion.objects.order_by('version_number')
        self.assertEqual(versions[0].version_number, 1)
        self.assertEqual(versions[1].version_number, 2)
        
        # Clean up test files
        os.remove('test_file1.txt')
        os.remove('test_file2.txt')
    
    def test_create_version_with_different_file_types(self):
        """Test creating versions with different file types"""
        self.client.force_authenticate(user=self.user)
        
        # Test with text file
        with open('test.txt', 'wb') as f:
            f.write(b'text content')
        
        with open('test.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Finalize the first version so we can create a second version
        version1 = AssetVersion.objects.first()
        version1.start_scan()
        version1.mark_clean()
        version1.finalize(finalized_by=self.user)
        version1.save()
        
        # Test with image file
        with open('test.jpg', 'wb') as f:
            f.write(b'fake image content')
        
        with open('test.jpg', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['version_number'], 2)
        
        # Clean up test files
        os.remove('test.txt')
        os.remove('test.jpg')
    
    def test_create_version_with_large_file(self):
        """Test creating version with large file"""
        self.client.force_authenticate(user=self.user)
        
        # Create a large file (1MB)
        large_content = b'x' * (1024 * 1024)
        with open('large_file.txt', 'wb') as f:
            f.write(large_content)
        
        with open('large_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        version = AssetVersion.objects.first()
        self.assertIsNotNone(version.checksum)
        self.assertEqual(len(version.checksum), 64)  # SHA-256 hex digest
        
        # Clean up test file
        os.remove('large_file.txt')
    
    def test_create_version_checksum_calculation(self):
        """Test that checksum is calculated correctly for uploaded files"""
        self.client.force_authenticate(user=self.user)
        
        test_content = b'This is test content for checksum calculation'
        with open('checksum_test.txt', 'wb') as f:
            f.write(test_content)
        
        with open('checksum_test.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        version = AssetVersion.objects.first()
        self.assertIsNotNone(version.checksum)
        self.assertEqual(len(version.checksum), 64)  # SHA-256 hex digest
        
        # Verify checksum matches expected value
        import hashlib
        expected_checksum = hashlib.sha256(test_content).hexdigest()
        self.assertEqual(version.checksum, expected_checksum)
        
        # Clean up test file
        os.remove('checksum_test.txt')
    
    def test_create_version_with_empty_file(self):
        """Test creating version with empty file should be rejected"""
        self.client.force_authenticate(user=self.user)
        
        # Use SimpleUploadedFile instead of creating a real file
        empty_file = SimpleUploadedFile(
            'empty_file.txt',
            b'',  # Empty content
            content_type='text/plain'
        )
        
        data = {'file': empty_file}
        response = self.client.post(self.url, data, format='multipart')
        
        # Empty files should be rejected with 400 error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('file', response.data)
        self.assertIn('empty', str(response.data['file'][0]))
    
    def test_create_version_with_special_characters_filename(self):
        """Test creating version with filename containing special characters"""
        self.client.force_authenticate(user=self.user)
        
        with open('test file with spaces.txt', 'wb') as f:
            f.write(b'content with special filename')
        
        with open('test file with spaces.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        version = AssetVersion.objects.first()
        self.assertIsNotNone(version.file)
        self.assertIsNotNone(version.checksum)
        
        # Clean up test file
        os.remove('test file with spaces.txt')
    
    def test_create_version_with_unicode_filename(self):
        """Test creating version with unicode filename"""
        self.client.force_authenticate(user=self.user)
        
        with open('测试文件.txt', 'wb') as f:
            f.write(b'unicode filename content')
        
        with open('测试文件.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        version = AssetVersion.objects.first()
        self.assertIsNotNone(version.file)
        self.assertIsNotNone(version.checksum)
        
        # Clean up test file
        os.remove('测试文件.txt')
    
    def test_list_versions_pagination(self):
        """Test that version listing supports pagination"""
        self.client.force_authenticate(user=self.user)
        
        # Create multiple versions
        for i in range(10):
            with open(f'test_file_{i}.txt', 'wb') as f:
                f.write(f'test content {i}'.encode())
            
            with open(f'test_file_{i}.txt', 'rb') as f:
                data = {'file': f}
                response = self.client.post(self.url, data, format='multipart')
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                
                # Finalize the version so we can create the next one
                version = AssetVersion.objects.latest('id')
                version.start_scan()
                version.mark_clean()
                version.finalize(finalized_by=self.user)
                version.save()
        
        # Test pagination
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 10)
        
        # Test page size parameter
        response = self.client.get(f'{self.url}?page_size=3')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
        
        # Clean up test files
        for i in range(10):
            os.remove(f'test_file_{i}.txt')
    
    def test_create_version_with_asset_in_wrong_state(self):
        """Test creating version when asset is not in NotSubmitted state"""
        self.client.force_authenticate(user=self.user)
        
        # Create a finalized version first (required for submission)
        self.create_finalized_version()
 
        # Move asset to PendingReview state using the proper method
        self.asset.submit(submitted_by=self.user)
        self.asset.save()  # Make sure the state change is saved
        
        # Verify the asset is in PendingReview state
        asset = Asset.objects.get(pk=self.asset.id)
        self.assertEqual(asset.status, Asset.PENDING_REVIEW)
        
        # Try to create a new version - should fail because asset is not in NotSubmitted state
        with open('test_file.txt', 'wb') as f:
            f.write(b'test content')
        
        with open('test_file.txt', 'rb') as f:
            data = {'file': f}
            # Should fail because asset is not in NotSubmitted state
            with self.assertRaises(ValidationError) as context:
                self.client.post(self.url, data, format='multipart')
            
            # Verify the error message
            self.assertIn('asset must be in NotSubmitted state', str(context.exception))
        
        # Clean up test file
        os.remove('test_file.txt')
    
    def test_create_version_with_existing_draft(self):
        """Test creating version when asset already has a draft version"""
        self.client.force_authenticate(user=self.user)
        
        # Create first version (draft)
        with open('test_file1.txt', 'wb') as f:
            f.write(b'first draft content')
        
        with open('test_file1.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Try to create second version while first is still draft
        with open('test_file2.txt', 'wb') as f:
            f.write(b'second draft content')
        
        with open('test_file2.txt', 'rb') as f:
            data = {'file': f}
            # Should fail because asset already has a draft version
            with self.assertRaises(ValidationError) as context:
                self.client.post(self.url, data, format='multipart')
            
            # Verify the error message
            self.assertIn('have no draft version', str(context.exception))
        
        # Clean up test files
        os.remove('test_file1.txt')
        os.remove('test_file2.txt')
    
    def test_create_version_after_finalizing_previous(self):
        """Test creating version after finalizing the previous version"""
        self.client.force_authenticate(user=self.user)
        
        # Create and finalize first version
        version1 = self.create_finalized_version()
        
        # Create second version
        with open('test_file2.txt', 'wb') as f:
            f.write(b'second version content')
        
        with open('test_file2.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['version_number'], 2)
        
        # Clean up test file
        os.remove('test_file2.txt')
    
    def test_version_ordering(self):
        """Test that versions are ordered by version number (newest first)"""
        self.client.force_authenticate(user=self.user)
        
        # Create multiple versions
        for i in range(3):
            with open(f'test_file_{i}.txt', 'wb') as f:
                f.write(f'content {i}'.encode())
            
            with open(f'test_file_{i}.txt', 'rb') as f:
                data = {'file': f}
                response = self.client.post(self.url, data, format='multipart')
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                
                # Finalize the version so we can create the next one
                version = AssetVersion.objects.latest('id')
                version.start_scan()
                version.mark_clean()
                version.finalize(finalized_by=self.user)
                version.save()
        
        # Check ordering in list response
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        results = response.data['results']
        self.assertEqual(len(results), 3)
        # Should be ordered by version number descending (newest first)
        self.assertEqual(results[0]['version_number'], 3)
        self.assertEqual(results[1]['version_number'], 2)
        self.assertEqual(results[2]['version_number'], 1)
        
        # Clean up test files
        for i in range(3):
            os.remove(f'test_file_{i}.txt')
    
    def test_version_read_only_fields(self):
        """Test that read-only fields are properly handled"""
        self.client.force_authenticate(user=self.user)
        
        with open('test_file.txt', 'wb') as f:
            f.write(b'test content')
        
        with open('test_file.txt', 'rb') as f:
            data = {
                'file': f,
                'version_number': 999,  # Should be ignored
                'uploaded_by': 999,     # Should be ignored
                'checksum': 'fake_checksum',  # Should be ignored
                'version_status': AssetVersion.FINALIZED,  # Should be ignored
                'scan_status': AssetVersion.CLEAN,  # Should be ignored
            }
            response = self.client.post(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        version = AssetVersion.objects.first()
        self.assertEqual(version.version_number, 1)  # Should be auto-assigned
        self.assertEqual(version.uploaded_by, self.user)  # Should be current user
        self.assertNotEqual(version.checksum, 'fake_checksum')  # Should be calculated
        self.assertEqual(version.version_status, AssetVersion.DRAFT)  # Should be default
        self.assertEqual(version.scan_status, AssetVersion.PENDING)  # Should be default
        
        # Clean up test file
        os.remove('test_file.txt')


class AssetVersionDetailViewTest(APITestCase):
    """Test Asset Version Detail endpoints (GET, PUT, DELETE)"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
        
        # Create test file
        self.test_file_content = b'test file content for version'
        self.test_file = SimpleUploadedFile(
            'test_version.txt',
            self.test_file_content,
            content_type='text/plain'
        )
        
        # Create test version
        self.version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=self.test_file,
            uploaded_by=self.user
        )
        # Calculate and set checksum for the version
        self.version.checksum = self.version.compute_checksum(self.test_file)
        self.version.save()
        
        # URL for asset version detail
        self.url = reverse('asset:asset-version-detail', kwargs={
            'asset_id': self.asset.id,
            'version_id': self.version.id
        })
    
    def create_finalized_version(self, asset=None):
        """Helper method to create a finalized version for testing"""
        if asset is None:
            asset = self.asset
        
        # Create version
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=2,
            file=self.test_file,
            uploaded_by=self.user
        )
        
        # Start scan and mark as clean
        version.start_scan()
        version.mark_clean()
        
        # Finalize the version
        version.finalize(finalized_by=self.user)
        
        return version
    
    def test_get_version_detail(self):
        """Test retrieving a single asset version"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.version.id)
        self.assertEqual(response.data['version_number'], 1)
        self.assertEqual(response.data['version_status'], AssetVersion.DRAFT)
        self.assertEqual(response.data['scan_status'], AssetVersion.PENDING)
        self.assertEqual(response.data['uploaded_by'], self.user.id)
        self.assertEqual(response.data['asset'], self.asset.id)
    
    def test_get_version_detail_unauthenticated(self):
        """Test that unauthenticated user gets 401 when trying to get version detail"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_nonexistent_version(self):
        """Test getting non-existent version returns 404"""
        self.client.force_authenticate(user=self.user)
        url = reverse('asset:asset-version-detail', kwargs={
            'asset_id': self.asset.id,
            'version_id': 99999
        })
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_version_wrong_asset(self):
        """Test getting version with wrong asset ID returns 404"""
        self.client.force_authenticate(user=self.user)
        
        # Create another asset and version
        other_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        url = reverse('asset:asset-version-detail', kwargs={
            'asset_id': other_asset.id,
            'version_id': self.version.id
        })
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_version_with_new_file(self):
        """Test updating version with a new file"""
        self.client.force_authenticate(user=self.user)
        
        with open('new_file.txt', 'wb') as f:
            f.write(b'new file content')
        
        with open('new_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh version from database
        self.version.refresh_from_db()
        self.assertIsNotNone(self.version.file)
        self.assertIsNotNone(self.version.checksum)
        
        # Clean up test file
        os.remove('new_file.txt')
    
    def test_update_version_without_file(self):
        """Test updating version without file should fail"""
        self.client.force_authenticate(user=self.user)
        data = {}
        
        response = self.client.put(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_version_unauthenticated(self):
        """Test that unauthenticated user gets 401 when trying to update version"""
        with open('test_file.txt', 'wb') as f:
            f.write(b'test content')
        
        with open('test_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Clean up test file
        os.remove('test_file.txt')
    
    def test_update_finalized_version(self):
        """Test updating finalized version should fail"""
        self.client.force_authenticate(user=self.user)
        
        # Finalize the version
        self.version.start_scan()
        self.version.mark_clean()
        self.version.finalize(finalized_by=self.user)
        self.version.save()
        
        with open('test_file.txt', 'wb') as f:
            f.write(b'test content')
        
        with open('test_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot update a finalized version', response.data['detail'])
        
        # Clean up test file
        os.remove('test_file.txt')
    
    def test_update_version_with_unchanged_file(self):
        """Test updating version with unchanged file content should return 409"""
        self.client.force_authenticate(user=self.user)
        
        # Create file with same content as original
        with open('same_content.txt', 'wb') as f:
            f.write(self.test_file_content)
        
        with open('same_content.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('File content unchanged', response.data['detail'])
        
        # Clean up test file
        os.remove('same_content.txt')
    
    def test_update_version_read_only_fields_ignored(self):
        """Test that read-only fields are ignored during update"""
        self.client.force_authenticate(user=self.user)
        
        with open('test_file.txt', 'wb') as f:
            f.write(b'new content')
        
        with open('test_file.txt', 'rb') as f:
            data = {
                'file': f,
                'version_number': 999,  # Should be ignored
                'uploaded_by': 999,     # Should be ignored
                'checksum': 'fake_checksum',  # Should be ignored
                'version_status': AssetVersion.FINALIZED,  # Should be ignored
                'scan_status': AssetVersion.CLEAN,  # Should be ignored
            }
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh version from database
        self.version.refresh_from_db()
        self.assertEqual(self.version.version_number, 1)  # Should remain unchanged
        self.assertEqual(self.version.uploaded_by, self.user)  # Should remain unchanged
        self.assertNotEqual(self.version.checksum, 'fake_checksum')  # Should be recalculated
        self.assertEqual(self.version.version_status, AssetVersion.DRAFT)  # Should remain unchanged
        self.assertEqual(self.version.scan_status, AssetVersion.PENDING)  # Should remain unchanged
        
        # Clean up test file
        os.remove('test_file.txt')
    
    def test_delete_version(self):
        """Test deleting a version"""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(AssetVersion.objects.filter(id=self.version.id).exists())
    
    def test_delete_version_unauthenticated(self):
        """Test that unauthenticated user gets 401 when trying to delete version"""
        response = self.client.delete(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(AssetVersion.objects.filter(id=self.version.id).exists())
    
    def test_delete_finalized_version(self):
        """Test deleting finalized version should fail"""
        self.client.force_authenticate(user=self.user)
        
        # Finalize the version
        self.version.start_scan()
        self.version.mark_clean()
        self.version.finalize(finalized_by=self.user)
        self.version.save()
        
        response = self.client.delete(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot delete a finalized version', response.data['detail'])
        self.assertTrue(AssetVersion.objects.filter(id=self.version.id).exists())
    
    def test_delete_nonexistent_version(self):
        """Test deleting non-existent version returns 404"""
        self.client.force_authenticate(user=self.user)
        url = reverse('asset:asset-version-detail', kwargs={
            'asset_id': self.asset.id,
            'version_id': 99999
        })
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_version_twice(self):
        """Test deleting version twice should return 404 on second attempt"""
        self.client.force_authenticate(user=self.user)
        
        # First delete
        response1 = self.client.delete(self.url)
        self.assertEqual(response1.status_code, status.HTTP_204_NO_CONTENT)
        
        # Second delete
        response2 = self.client.delete(self.url)
        self.assertEqual(response2.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_http_methods_not_allowed(self):
        """Test that only GET, PUT, DELETE methods are allowed"""
        self.client.force_authenticate(user=self.user)
        
        # Test POST method (not allowed)
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        # Test PATCH method (not allowed)
        response = self.client.patch(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_update_version_checksum_recalculation(self):
        """Test that checksum is recalculated when file is updated"""
        self.client.force_authenticate(user=self.user)
        
        # Get original checksum
        original_checksum = self.version.checksum
        
        # Update with new file
        new_content = b'completely different content'
        with open('new_file.txt', 'wb') as f:
            f.write(new_content)
        
        with open('new_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh version from database
        self.version.refresh_from_db()
        self.assertNotEqual(self.version.checksum, original_checksum)
        
        # Verify new checksum is correct
        import hashlib
        expected_checksum = hashlib.sha256(new_content).hexdigest()
        self.assertEqual(self.version.checksum, expected_checksum)
        
        # Clean up test file
        os.remove('new_file.txt')
    
    def test_update_version_with_different_file_types(self):
        """Test updating version with different file types"""
        self.client.force_authenticate(user=self.user)
        
        # Update with text file
        with open('text_file.txt', 'wb') as f:
            f.write(b'text content')
        
        with open('text_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update with image file
        with open('image_file.jpg', 'wb') as f:
            f.write(b'fake image content')
        
        with open('image_file.jpg', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Clean up test files
        os.remove('text_file.txt')
        os.remove('image_file.jpg')
    
    def test_update_version_with_large_file(self):
        """Test updating version with large file"""
        self.client.force_authenticate(user=self.user)
        
        # Create a large file (1MB)
        large_content = b'x' * (1024 * 1024)
        with open('large_file.txt', 'wb') as f:
            f.write(large_content)
        
        with open('large_file.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh version from database
        self.version.refresh_from_db()
        self.assertIsNotNone(self.version.checksum)
        self.assertEqual(len(self.version.checksum), 64)  # SHA-256 hex digest
        
        # Clean up test file
        os.remove('large_file.txt')
    
    def test_update_version_with_special_characters_filename(self):
        """Test updating version with filename containing special characters"""
        self.client.force_authenticate(user=self.user)
        
        with open('test file with spaces.txt', 'wb') as f:
            f.write(b'content with special filename')
        
        with open('test file with spaces.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh version from database
        self.version.refresh_from_db()
        self.assertIsNotNone(self.version.file)
        self.assertIsNotNone(self.version.checksum)
        
        # Clean up test file
        os.remove('test file with spaces.txt')
    
    def test_update_version_with_unicode_filename(self):
        """Test updating version with unicode filename"""
        self.client.force_authenticate(user=self.user)
        
        with open('测试文件.txt', 'wb') as f:
            f.write(b'unicode filename content')
        
        with open('测试文件.txt', 'rb') as f:
            data = {'file': f}
            response = self.client.put(self.url, data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh version from database
        self.version.refresh_from_db()
        self.assertIsNotNone(self.version.file)
        self.assertIsNotNone(self.version.checksum)
        
        # Clean up test file
        os.remove('测试文件.txt')

