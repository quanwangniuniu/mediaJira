"""
Integration tests for file content boundary conditions
Tests edge cases related to file content and size
"""

import os
import tempfile
import hashlib
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from metric_upload.models import MetricFile

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    FILE_STORAGE_DIR=tempfile.mkdtemp()
)
class FileContentBoundariesTest(TestCase):
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            email='test_content_boundaries@example.com',
            username='testcontentboundaries',
            password='testpass123'
        )
        self.user.is_verified = True
        self.user.save()
        
        # URLs
        self.login_url = reverse('login')
        self.upload_url = reverse('metric_upload:file-upload')
        
        # Login and get token
        login_data = {
            'email': 'test_content_boundaries@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post(self.login_url, login_data)
        self.token = login_response.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_upload_empty_file_zero_bytes(self):
        """Test uploading an empty file (0 bytes)"""
        empty_file = SimpleUploadedFile(
            'empty.txt',
            b'',  # Empty content
            content_type='text/plain'
        )
        
        upload_data = {'file': empty_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], 0)
        self.assertEqual(file_data['original_filename'], 'empty.txt')
        
        # Verify checksum for empty file
        expected_checksum = hashlib.sha256(b'').hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify file was saved correctly
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        self.assertTrue(os.path.exists(full_path))
        
        # Verify file is actually empty
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(len(saved_content), 0)
        
    
    def test_upload_single_byte_file(self):
        """Test uploading a file with exactly 1 byte"""
        single_byte_file = SimpleUploadedFile(
            'single_byte.txt',
            b'A',  # Single byte
            content_type='text/plain'
        )
        
        upload_data = {'file': single_byte_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], 1)
        self.assertEqual(file_data['original_filename'], 'single_byte.txt')
        
        # Verify checksum
        expected_checksum = hashlib.sha256(b'A').hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, b'A')
        
    
    def test_upload_file_with_only_newlines(self):
        """Test uploading a file containing only newline characters"""
        newline_content = b'\n\n\n\n\n'  # 5 newlines
        
        newline_file = SimpleUploadedFile(
            'newlines.txt',
            newline_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': newline_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], 5)
        self.assertEqual(file_data['original_filename'], 'newlines.txt')
        
        # Verify checksum
        expected_checksum = hashlib.sha256(newline_content).hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, newline_content)
        
    
    def test_upload_file_with_binary_content(self):
        """Test uploading file with binary content (all possible byte values)"""
        # Create content with all possible byte values (0-255)
        binary_content = bytes(range(256))
        
        binary_file = SimpleUploadedFile(
            'binary.bin',
            binary_content,
            content_type='application/octet-stream'
        )
        
        upload_data = {'file': binary_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], 256)
        self.assertEqual(file_data['mime_type'], 'application/octet-stream')
        
        # Verify checksum
        expected_checksum = hashlib.sha256(binary_content).hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content integrity
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, binary_content)
        
    
    def test_upload_file_with_null_bytes(self):
        """Test uploading file containing null bytes"""
        null_content = b'Hello\x00World\x00Test'
        
        null_file = SimpleUploadedFile(
            'null_bytes.txt',
            null_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': null_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], len(null_content))
        
        # Verify checksum
        expected_checksum = hashlib.sha256(null_content).hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content integrity
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, null_content)
        
    
    def test_upload_file_with_unicode_content(self):
        """Test uploading file with Unicode content"""
        unicode_content = 'Hello 世界 🌍 测试'.encode('utf-8')
        
        unicode_file = SimpleUploadedFile(
            'unicode.txt',
            unicode_content,
            content_type='text/plain; charset=utf-8'
        )
        
        upload_data = {'file': unicode_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], len(unicode_content))
        
        # Verify checksum
        expected_checksum = hashlib.sha256(unicode_content).hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content integrity
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, unicode_content)
        
    
    def test_upload_file_with_very_long_single_line(self):
        """Test uploading file with a very long single line"""
        # Create a line with 10,000 characters
        long_line = 'A' * 10000 + '\n'
        long_line_content = long_line.encode('utf-8')
        
        long_line_file = SimpleUploadedFile(
            'long_line.txt',
            long_line_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': long_line_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], len(long_line_content))
        
        # Verify checksum
        expected_checksum = hashlib.sha256(long_line_content).hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content integrity
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, long_line_content)
        
    
    def test_upload_file_with_mixed_line_endings(self):
        """Test uploading file with mixed line endings (CRLF, LF, CR)"""
        mixed_endings_content = b'Line 1\r\nLine 2\nLine 3\rLine 4\r\n'
        
        mixed_endings_file = SimpleUploadedFile(
            'mixed_endings.txt',
            mixed_endings_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': mixed_endings_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], len(mixed_endings_content))
        
        # Verify checksum
        expected_checksum = hashlib.sha256(mixed_endings_content).hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content integrity
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, mixed_endings_content)
        
    
    def test_upload_file_with_repeated_content(self):
        """Test uploading file with repeated content (for deduplication testing)"""
        repeated_content = b'Hello World! ' * 1000  # Repeat 1000 times
        
        repeated_file = SimpleUploadedFile(
            'repeated.txt',
            repeated_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': repeated_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['size'], len(repeated_content))
        
        # Verify checksum
        expected_checksum = hashlib.sha256(repeated_content).hexdigest()
        self.assertEqual(file_data['checksum'], expected_checksum)
        
        # Verify content integrity
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        with open(full_path, 'rb') as f:
            saved_content = f.read()
        self.assertEqual(saved_content, repeated_content)
        
    
    def tearDown(self):
        """Clean up test files"""
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
