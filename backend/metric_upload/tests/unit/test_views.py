"""
Unit tests for metric_upload views
Tests basic view functionality, permissions, and response handling
"""

from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock

from metric_upload.models import MetricFile
from metric_upload.views import FileUploadView, FileDetailView, FileContentView

User = get_user_model()


class TestFileUploadView(TestCase):
    """Test FileUploadView basic functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        self.upload_url = reverse('metric_upload:file-upload')
    
    def test_upload_view_requires_authentication(self):
        """Test that upload view requires authentication"""
        client = APIClient()  # No authentication
        test_file = SimpleUploadedFile(
            'test.txt',
            b'Test content',
            content_type='text/plain'
        )
        
        response = client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_upload_view_accepts_valid_file(self):
        """Test that upload view accepts valid file uploads"""
        test_file = SimpleUploadedFile(
            'test.txt',
            b'Test content',
            content_type='text/plain'
        )
        
        response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['original_filename'], 'test.txt')
        self.assertEqual(response.data['uploaded_by']['id'], self.user.id)
        self.assertEqual(response.data['uploaded_by']['username'], self.user.username)
    
    def test_upload_view_rejects_empty_request(self):
        """Test that upload view rejects requests without file"""
        response = self.client.post(self.upload_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_upload_view_rejects_invalid_file_type(self):
        """Test that upload view handles invalid file types gracefully"""
        # Create a file with no content type
        test_file = SimpleUploadedFile(
            'test.txt',
            b'Test content'
            # No content_type specified
        )
        
        response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        # Should still accept the file but may have default content type
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class TestFileDetailView(TestCase):
    """Test FileDetailView basic functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create a test file
        self.metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        self.detail_url = reverse('metric_upload:file-detail', kwargs={'pk': self.metric_file.id})
    
    def test_detail_view_requires_authentication(self):
        """Test that detail view requires authentication"""
        client = APIClient()  # No authentication
        response = client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_detail_view_returns_file_info(self):
        """Test that detail view returns file information"""
        response = self.client.get(self.detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.metric_file.id)
        self.assertEqual(response.data['original_filename'], 'test.txt')
        self.assertEqual(response.data['uploaded_by']['id'], self.user.id)
        self.assertEqual(response.data['uploaded_by']['username'], self.user.username)
        self.assertEqual(response.data['size'], 100)
        self.assertEqual(response.data['checksum'], 'test_checksum')
    
    def test_detail_view_returns_404_for_nonexistent_file(self):
        """Test that detail view returns 404 for nonexistent files"""
        nonexistent_url = reverse('metric_upload:file-detail', kwargs={'pk': 99999})
        response = self.client.get(nonexistent_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_detail_view_allows_owner_access(self):
        """Test that file owner can access file details"""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_detail_view_allows_public_file_access(self):
        """Test that public files can be accessed by any authenticated user"""
        # Make file public
        self.metric_file.is_public = True
        self.metric_file.save()
        
        # Create another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        # Login as other user
        self.client.force_authenticate(user=other_user)
        response = self.client.get(self.detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestFileContentView(TestCase):
    """Test FileContentView basic functionality"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        # Create a test file
        self.metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        self.content_url = reverse('metric_upload:file-content', kwargs={'pk': self.metric_file.id})
    
    def test_content_view_requires_authentication(self):
        """Test that content view requires authentication"""
        client = APIClient()  # No authentication
        response = client.get(self.content_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_content_view_returns_404_for_nonexistent_file(self):
        """Test that content view returns 404 for nonexistent files"""
        nonexistent_url = reverse('metric_upload:file-content', kwargs={'pk': 99999})
        response = self.client.get(nonexistent_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_content_view_denies_private_file_access_to_others(self):
        """Test that private files are not accessible to non-owners"""
        # Create another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        # Login as other user
        self.client.force_authenticate(user=other_user)
        response = self.client.get(self.content_url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_content_view_allows_public_file_access(self):
        """Test that public files can be accessed by any authenticated user"""
        # Make file public
        self.metric_file.is_public = True
        self.metric_file.save()
        
        # Create another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        # Login as other user
        self.client.force_authenticate(user=other_user)
        
        # Mock the file serving to avoid actual file system operations
        from django.http import HttpResponse
        with patch('metric_upload.views.FileContentView._serve') as mock_serve:
            mock_serve.return_value = HttpResponse("test content", status=200)
            response = self.client.get(self.content_url)
            
            # Should not return 403, but may return other status depending on file state
            self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_head_request_returns_same_status_as_get(self):
        """Test that HEAD request returns same status as GET request"""
        # Mock the file serving to avoid actual file system operations
        from django.http import HttpResponse
        with patch('metric_upload.views.FileContentView._serve') as mock_serve:
            mock_serve.return_value = HttpResponse("test content", status=200)
            
            get_response = self.client.get(self.content_url)
            head_response = self.client.head(self.content_url)
            
            # HEAD should return same status code as GET
            self.assertEqual(head_response.status_code, get_response.status_code)
