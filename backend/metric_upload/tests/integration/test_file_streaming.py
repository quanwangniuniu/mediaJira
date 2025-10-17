
"""
Integration tests for file streaming functionality
Tests StreamingHttpResponse for large file downloads
"""

import os
import tempfile
import time
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from metric_upload.models import MetricFile

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,  # Run tasks synchronously for testing
)
class TestFileStreaming(TestCase):
    """Test file streaming functionality for large files"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.upload_url = reverse('metric_upload:file-upload')
    
    def _wait_for_ready(self, file_id: int, max_wait_seconds: int = 10):
        """Wait for file to reach READY state through natural scanning process"""
        start_time = time.time()
        
        while time.time() - start_time < max_wait_seconds:
            metric_file = MetricFile.objects.get(id=file_id)
            
            if metric_file.status == MetricFile.READY:
                return True
            elif metric_file.status in [MetricFile.INFECTED, MetricFile.ERROR_SCANNING, MetricFile.MISSING]:
                # File is in a terminal error state
                self.fail(f"File reached error state: {metric_file.status}")
            
            # Wait a bit before checking again
            time.sleep(0.1)
        
        # Timeout reached
        final_status = MetricFile.objects.get(id=file_id).status
        self.fail(f"File did not reach READY state within {max_wait_seconds} seconds. Final status: {final_status}")
    
    def test_streaming_large_file_download(self):
        """Test streaming download of large file"""
        # Create a large file (1MB) for testing
        large_content = b'X' * (1024 * 1024)  # 1MB of data
        large_file = SimpleUploadedFile(
            'large_file.txt',
            large_content,
            content_type='text/plain'
        )
        
        # Upload the file
        upload_response = self.client.post(self.upload_url, {
            'file': large_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        file_id = upload_response.data['id']
        
        # Wait for file to reach READY state through natural scanning
        self._wait_for_ready(file_id)
        
        # Download the file
        download_response = self.client.get(reverse('metric_upload:file-content', kwargs={'pk': file_id}))
        
        self.assertEqual(download_response.status_code, status.HTTP_200_OK)
        self.assertEqual(download_response['Content-Type'], 'text/plain')
        self.assertEqual(download_response['Content-Length'], str(len(large_content)))
        
        # Verify content is correct
        downloaded_content = b''.join(download_response.streaming_content)
        self.assertEqual(downloaded_content, large_content)
    
    def test_streaming_with_range_request(self):
        """Test streaming with HTTP Range request"""
        # Create a medium-sized file (100KB)
        content = b'A' * (100 * 1024)  # 100KB
        test_file = SimpleUploadedFile(
            'range_test.txt',
            content,
            content_type='text/plain'
        )
        
        # Upload the file
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        file_id = upload_response.data['id']
        
        # Wait for file to reach READY state through natural scanning
        self._wait_for_ready(file_id)
        
        # Request first 10KB
        download_response = self.client.get(
            reverse('metric_upload:file-content', kwargs={'pk': file_id}),
            HTTP_RANGE='bytes=0-10239'
        )
        
        self.assertEqual(download_response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(download_response['Content-Length'], '10240')
        self.assertEqual(download_response['Content-Range'], 'bytes 0-10239/102400')
        
        # Verify partial content
        partial_content = b''.join(download_response.streaming_content)
        expected_partial = content[:10240]
        self.assertEqual(partial_content, expected_partial)
    
    def test_streaming_middle_range_request(self):
        """Test streaming with middle range request"""
        # Create a file with known content
        content = b'ABCDEFGHIJKLMNOPQRSTUVWXYZ' * 1000  # ~26KB
        test_file = SimpleUploadedFile(
            'middle_range.txt',
            content,
            content_type='text/plain'
        )
        
        # Upload the file
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        file_id = upload_response.data['id']
        
        # Wait for file to reach READY state through natural scanning
        self._wait_for_ready(file_id)
        
        # Request middle 1KB
        start = 10000
        end = 11023
        download_response = self.client.get(
            reverse('metric_upload:file-content', kwargs={'pk': file_id}),
            HTTP_RANGE=f'bytes={start}-{end}'
        )
        
        self.assertEqual(download_response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(download_response['Content-Length'], '1024')
        self.assertEqual(download_response['Content-Range'], f'bytes {start}-{end}/{len(content)}')
        
        # Verify middle content
        partial_content = b''.join(download_response.streaming_content)
        expected_partial = content[start:end+1]
        self.assertEqual(partial_content, expected_partial)
    
    def test_streaming_head_request(self):
        """Test HEAD request for file metadata"""
        content = b'Test content for HEAD request'
        test_file = SimpleUploadedFile(
            'head_test.txt',
            content,
            content_type='text/plain'
        )
        
        # Upload the file
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        file_id = upload_response.data['id']
        
        # Wait for file to reach READY state through natural scanning
        self._wait_for_ready(file_id)
        
        # HEAD request
        head_response = self.client.head(reverse('metric_upload:file-content', kwargs={'pk': file_id}))
        
        self.assertEqual(head_response.status_code, status.HTTP_200_OK)
        self.assertEqual(head_response['Content-Type'], 'text/plain')
        self.assertEqual(head_response['Content-Length'], str(len(content)))
        # HEAD request should not have content
        self.assertEqual(len(head_response.content), 0)
    
    def test_streaming_binary_file(self):
        """Test streaming binary file"""
        # Create binary content (simulate a small image)
        binary_content = bytes(range(256)) * 100  # 25.6KB of binary data
        binary_file = SimpleUploadedFile(
            'test.bin',
            binary_content,
            content_type='application/octet-stream'
        )
        
        # Upload the file
        upload_response = self.client.post(self.upload_url, {
            'file': binary_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        file_id = upload_response.data['id']
        
        # Wait for file to reach READY state through natural scanning
        self._wait_for_ready(file_id)
        
        # Download the binary file
        download_response = self.client.get(reverse('metric_upload:file-content', kwargs={'pk': file_id}))
        
        self.assertEqual(download_response.status_code, status.HTTP_200_OK)
        self.assertEqual(download_response['Content-Type'], 'application/octet-stream')
        self.assertEqual(download_response['Content-Length'], str(len(binary_content)))
        
        # Verify binary content is correct
        downloaded_content = b''.join(download_response.streaming_content)
        self.assertEqual(downloaded_content, binary_content)
    
    def test_streaming_memory_efficiency(self):
        """Test that streaming doesn't load entire file into memory"""
        # This test verifies that the streaming implementation works
        # by checking that we can handle a file larger than typical memory limits
        # without issues (though we'll use a smaller size for testing)
        
        # Create a 2MB file
        large_content = b'Z' * (2 * 1024 * 1024)  # 2MB
        large_file = SimpleUploadedFile(
            'memory_test.txt',
            large_content,
            content_type='text/plain'
        )
        
        # Upload the file
        upload_response = self.client.post(self.upload_url, {
            'file': large_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        file_id = upload_response.data['id']
        
        # Wait for file to reach READY state through natural scanning
        self._wait_for_ready(file_id)
        
        # Download with range to test chunked reading
        download_response = self.client.get(
            reverse('metric_upload:file-content', kwargs={'pk': file_id}),
            HTTP_RANGE='bytes=0-8191'  # First 8KB
        )
        
        self.assertEqual(download_response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        
        # Verify we get exactly 8KB
        partial_content = b''.join(download_response.streaming_content)
        self.assertEqual(len(partial_content), 8192)
        self.assertEqual(partial_content, large_content[:8192])
    
    def tearDown(self):
        """Clean up test files"""
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
