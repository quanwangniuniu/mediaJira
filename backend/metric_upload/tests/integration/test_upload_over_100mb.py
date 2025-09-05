"""
Integration test for file size limit (100MB)
Tests that files over 100MB are rejected
"""

import tempfile
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    FILE_STORAGE_DIR=tempfile.mkdtemp()
)
class FileSizeLimitTest(TestCase):
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        
        # Create test user
        self.test_email = 'test_size_limit@example.com'
        self.test_password = 'testpass123'
        
        self.user = User.objects.create_user(
            email=self.test_email,
            username='testsizelimit',
            password=self.test_password
        )
        # Set user as verified (required for login)
        self.user.is_verified = True
        self.user.save()
        
        # URLs
        self.login_url = reverse('login')  # No namespace for authentication
        self.upload_url = reverse('metric_upload:file-upload')
    
    def test_upload_file_over_100mb(self):
        """Test that files over 100MB are rejected"""
        # Login first
        login_data = {
            'email': self.test_email,
            'password': self.test_password
        }
        login_response = self.client.post(self.login_url, login_data)
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        token = login_response.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create a file that's just over 100MB (100MB + 1 byte)
        oversized_content = b'x' * (100 * 1024 * 1024 + 1)  # 100MB + 1 byte
        
        test_file = SimpleUploadedFile(
            'oversized.txt',
            oversized_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': test_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        # Should be rejected with 413 Request Entity Too Large
        self.assertEqual(upload_response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        
        # Check error message
        error_data = upload_response.data
        self.assertIn('detail', error_data)
        self.assertIn('100MB', error_data['detail'])
        
    
    def test_upload_file_under_100mb(self):
        """Test that files under 100MB are accepted"""
        # Login first
        login_data = {
            'email': self.test_email,
            'password': self.test_password
        }
        login_response = self.client.post(self.login_url, login_data)
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        token = login_response.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create a file that's under 100MB (e.g., 50MB)
        under_size_content = b'x' * (50 * 1024 * 1024)  # 50MB
        
        test_file = SimpleUploadedFile(
            'under_100mb.txt',
            under_size_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': test_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        # Should be accepted
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], 50 * 1024 * 1024)
        
    
    def test_upload_file_exactly_100mb(self):
        """Test that files exactly 100MB are accepted"""
        # Login first
        login_data = {
            'email': self.test_email,
            'password': self.test_password
        }
        login_response = self.client.post(self.login_url, login_data)
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        token = login_response.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create a file that's exactly 100MB
        exact_size_content = b'x' * (100 * 1024 * 1024)  # Exactly 100MB
        
        test_file = SimpleUploadedFile(
            'exact_100mb.txt',
            exact_size_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': test_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        # Should be accepted
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], 100 * 1024 * 1024)
        
