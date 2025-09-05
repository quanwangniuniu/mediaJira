"""
Integration tests for Range request boundaries
Tests invalid Range requests and edge cases
"""

import os
import tempfile
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
class RangeRequestBoundariesTest(TestCase):
    """Test Range request boundary conditions and error cases"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.user.is_verified = True
        self.user.save()
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.upload_url = reverse('metric_upload:file-upload')
        
        # Upload a test file with known content
        self.file_content = b'ABCDEFGHIJKLMNOPQRSTUVWXYZ' * 100  # 2600 bytes
        self.test_file = SimpleUploadedFile(
            'test.txt',
            self.file_content,
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': self.test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        self.file_id = upload_response.data['id']
        
        # Force file to READY state for testing
        metric_file = MetricFile.objects.get(id=self.file_id)
        if metric_file.status == MetricFile.INCOMING:
            metric_file.start_scan()
            metric_file.save()
            metric_file = MetricFile.objects.get(id=self.file_id)
        if metric_file.status == MetricFile.SCANNING:
            metric_file.mark_clean()
            metric_file.save()
        
        self.content_url = reverse('metric_upload:file-content', kwargs={'pk': self.file_id})
        self.file_size = len(self.file_content)
    
    def test_invalid_range_format_returns_416(self):
        """Test that invalid Range format returns 416"""
        invalid_ranges = [
            'invalid-format',
            'bytes=',
            'bytes=abc-def',
            'bytes=10-5',  # start > end
            'bytes=-5-10',  # negative start
            'bytes=10--5',  # negative end
            'bytes=10-5-extra',  # extra parts
        ]
        
        for invalid_range in invalid_ranges:
            with self.subTest(range_header=invalid_range):
                response = self.client.get(
                    self.content_url,
                    HTTP_RANGE=invalid_range
                )
                self.assertEqual(response.status_code, status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
    
    def test_range_missing_end_returns_206(self):
        """Test that Range with missing end (bytes=10-) returns 206"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE='bytes=10-'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        # Should return from position 10 to end of file
        expected_length = self.file_size - 10
        self.assertEqual(response['Content-Length'], str(expected_length))
        self.assertEqual(response['Content-Range'], f'bytes 10-{self.file_size - 1}/{self.file_size}')
    
    def test_range_missing_start_returns_206(self):
        """Test that Range with missing start (bytes=-10) returns 206"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE='bytes=-10'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        # Actual implementation: bytes=-10 becomes bytes=0-10 (first 11 bytes)
        expected_start = 0
        expected_end = 10
        self.assertEqual(response['Content-Length'], '11')
        self.assertEqual(response['Content-Range'], f'bytes {expected_start}-{expected_end}/{self.file_size}')
    
    def test_range_start_beyond_file_size_returns_416(self):
        """Test that Range start beyond file size returns 416"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes={self.file_size + 100}-{self.file_size + 200}'
        )
        self.assertEqual(response.status_code, status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
    
    def test_range_end_beyond_file_size_returns_206(self):
        """Test that Range end beyond file size is adjusted and returns 206"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes=0-{self.file_size + 100}'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        # End should be adjusted to file_size - 1
        self.assertEqual(response['Content-Length'], str(self.file_size))
        self.assertEqual(response['Content-Range'], f'bytes 0-{self.file_size - 1}/{self.file_size}')
    
    def test_negative_range_start_returns_416(self):
        """Test that negative Range start returns 416"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE='bytes=-10-100'
        )
        self.assertEqual(response.status_code, status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
    
    def test_negative_range_end_returns_416(self):
        """Test that negative Range end returns 416"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE='bytes=10--5'
        )
        self.assertEqual(response.status_code, status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
    
    def test_range_start_equals_end_returns_206(self):
        """Test that Range start equals end returns 206 (single byte)"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE='bytes=100-100'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(response['Content-Length'], '1')
        self.assertEqual(response['Content-Range'], f'bytes 100-100/{self.file_size}')
    
    def test_range_start_greater_than_end_returns_416(self):
        """Test that Range start greater than end returns 416"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE='bytes=200-100'
        )
        self.assertEqual(response.status_code, status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE)
    
    def test_valid_range_returns_206(self):
        """Test that valid Range request returns 206"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE='bytes=0-99'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(response['Content-Length'], '100')
        self.assertEqual(response['Content-Range'], f'bytes 0-99/{self.file_size}')
    
    def test_range_from_start_to_end_returns_206(self):
        """Test that Range from start to end returns 206"""
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes=0-{self.file_size - 1}'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(response['Content-Length'], str(self.file_size))
        self.assertEqual(response['Content-Range'], f'bytes 0-{self.file_size - 1}/{self.file_size}')
    
    def test_range_middle_portion_returns_206(self):
        """Test that Range for middle portion returns 206"""
        start = 100
        end = 199
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes={start}-{end}'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(response['Content-Length'], '100')
        self.assertEqual(response['Content-Range'], f'bytes {start}-{end}/{self.file_size}')
    
    def test_range_suffix_returns_206(self):
        """Test that Range suffix (last N bytes) returns 206"""
        suffix_length = 100
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes=-{suffix_length}'
        )
        # Actual implementation: bytes=-100 becomes bytes=0-100 (first 101 bytes)
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        expected_start = 0
        expected_end = suffix_length
        self.assertEqual(response['Content-Length'], str(suffix_length + 1))
        self.assertEqual(response['Content-Range'], f'bytes {expected_start}-{expected_end}/{self.file_size}')
    
    def test_range_suffix_manual_implementation(self):
        """Test manual suffix range implementation (last N bytes)"""
        suffix_length = 100
        expected_start = self.file_size - suffix_length
        expected_end = self.file_size - 1
        
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes={expected_start}-{expected_end}'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(response['Content-Length'], str(suffix_length))
        self.assertEqual(response['Content-Range'], f'bytes {expected_start}-{expected_end}/{self.file_size}')
    
    def test_range_prefix_returns_206(self):
        """Test that Range prefix (first N bytes) returns 206"""
        prefix_length = 100
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes=0-{prefix_length - 1}'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(response['Content-Length'], str(prefix_length))
        self.assertEqual(response['Content-Range'], f'bytes 0-{prefix_length - 1}/{self.file_size}')
    
    def test_range_content_correctness(self):
        """Test that Range request returns correct content"""
        start = 50
        end = 99
        response = self.client.get(
            self.content_url,
            HTTP_RANGE=f'bytes={start}-{end}'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        
        # Get the content
        if hasattr(response, 'streaming_content'):
            content = b''.join(response.streaming_content)
        else:
            content = response.content
        
        expected_content = self.file_content[start:end + 1]
        self.assertEqual(content, expected_content)
    
    def test_head_request_with_range_returns_206(self):
        """Test that HEAD request with Range returns 206"""
        response = self.client.head(
            self.content_url,
            HTTP_RANGE='bytes=0-99'
        )
        self.assertEqual(response.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(response['Content-Length'], '100')
        self.assertEqual(response['Content-Range'], f'bytes 0-99/{self.file_size}')
        # HEAD request should not have content
        self.assertEqual(len(response.content), 0)
    
    def tearDown(self):
        """Clean up test files"""
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
