"""
Integration tests for file status download restrictions
Tests downloading files in different states (scanning, infected, error, deleted, missing)
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
class FileStatusDownloadRestrictionsTest(TestCase):
    """Test download restrictions based on file status"""
    
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
        
        # Upload a test file
        self.test_file = SimpleUploadedFile(
            'test.txt',
            b'Test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': self.test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        self.file_id = upload_response.data['id']
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_download_scanning_file_returns_423(self):
        """Test that downloading a file in SCANNING state returns 423"""
        # Create a new file specifically for this test to avoid FSM state conflicts
        test_file = SimpleUploadedFile(
            'scanning_test.txt',
            b'Scanning test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        scanning_file_id = upload_response.data['id']
        
        # Set file status to SCANNING
        metric_file = MetricFile.objects.get(id=scanning_file_id)
        
        # With CELERY_TASK_ALWAYS_EAGER=False, file should be in INCOMING state
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        
        metric_file.start_scan()
        metric_file.save()
        
        # Verify the status is actually SCANNING
        metric_file = MetricFile.objects.get(id=scanning_file_id)
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': scanning_file_id})
        
        response = self.client.get(content_url)
        self.assertEqual(response.status_code, 423)
        self.assertIn('File is being scanned', response.data['detail'])
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_download_incoming_file_returns_423(self):
        """Test that downloading a file in INCOMING state returns 423"""
        # Create a new file specifically for this test to avoid FSM state conflicts
        test_file = SimpleUploadedFile(
            'incoming_test.txt',
            b'Incoming test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        incoming_file_id = upload_response.data['id']
        
        # With CELERY_TASK_ALWAYS_EAGER=False, file should be in INCOMING state
        metric_file = MetricFile.objects.get(id=incoming_file_id)
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': incoming_file_id})
        
        response = self.client.get(content_url)
        self.assertEqual(response.status_code, 423)
        self.assertIn('File is being scanned', response.data['detail'])
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_download_infected_file_returns_403(self):
        """Test that downloading an infected file returns 403"""
        # Create a new file specifically for this test to avoid FSM state conflicts
        test_file = SimpleUploadedFile(
            'infected_test.txt',
            b'Infected test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        infected_file_id = upload_response.data['id']
        
        # Set file status to INFECTED
        metric_file = MetricFile.objects.get(id=infected_file_id)
        
        # With CELERY_TASK_ALWAYS_EAGER=False, file should be in INCOMING state
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        
        # Force file to INFECTED state for testing
        metric_file.start_scan()
        metric_file.save()
        metric_file = MetricFile.objects.get(id=infected_file_id)
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        metric_file.mark_infected()
        metric_file.save()
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': infected_file_id})
        
        response = self.client.get(content_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('File blocked due to malware', response.data['detail'])
        self.assertEqual(response.data['code'], 'INFECTED')
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_download_error_scanning_file_returns_404(self):
        """Test that downloading a file with scan error returns 404"""
        # Create a new file specifically for this test to avoid FSM state conflicts
        test_file = SimpleUploadedFile(
            'error_test.txt',
            b'Error test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        error_file_id = upload_response.data['id']
        
        # Set file status to ERROR_SCANNING
        metric_file = MetricFile.objects.get(id=error_file_id)
        
        # With CELERY_TASK_ALWAYS_EAGER=False, file should be in INCOMING state
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        
        # Force file to ERROR_SCANNING state for testing
        metric_file.start_scan()
        metric_file.save()
        metric_file = MetricFile.objects.get(id=error_file_id)
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        metric_file.mark_error_scanning()
        metric_file.save()
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': error_file_id})
        
        response = self.client.get(content_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Not found', response.data['detail'])
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_download_missing_file_returns_404(self):
        """Test that downloading a missing file returns 404"""
        # Create a new file specifically for this test to avoid FSM state conflicts
        test_file = SimpleUploadedFile(
            'missing_test.txt',
            b'Missing test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        missing_file_id = upload_response.data['id']
        
        # Set file status to MISSING
        metric_file = MetricFile.objects.get(id=missing_file_id)
        
        # With CELERY_TASK_ALWAYS_EAGER=False, file should be in INCOMING state
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        
        # Force file to MISSING state for testing
        metric_file.start_scan()
        metric_file.save()
        metric_file = MetricFile.objects.get(id=missing_file_id)
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        metric_file.mark_missing()
        metric_file.save()
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': missing_file_id})
        
        response = self.client.get(content_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Not found', response.data['detail'])
    
    def test_download_deleted_file_returns_404(self):
        """Test that downloading a deleted file returns 404"""
        # Mark file as deleted
        metric_file = MetricFile.objects.get(id=self.file_id)
        metric_file.is_deleted = True
        metric_file.save()
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': self.file_id})
        
        response = self.client.get(content_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Not found', response.data['detail'])
    
    def test_download_nonexistent_file_returns_404(self):
        """Test that downloading a non-existent file returns 404"""
        content_url = reverse('metric_upload:file-content', kwargs={'pk': 99999})
        
        response = self.client.get(content_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Not found', response.data['detail'])
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_head_request_scanning_file_returns_423(self):
        """Test that HEAD request for scanning file returns 423"""
        # Create a new file specifically for this test to avoid FSM state conflicts
        test_file = SimpleUploadedFile(
            'head_scanning_test.txt',
            b'HEAD scanning test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        scanning_file_id = upload_response.data['id']
        
        # Set file status to SCANNING
        metric_file = MetricFile.objects.get(id=scanning_file_id)
        
        # With CELERY_TASK_ALWAYS_EAGER=False, file should be in INCOMING state
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        
        metric_file.start_scan()
        metric_file.save()
        # Verify the status is actually SCANNING
        metric_file = MetricFile.objects.get(id=scanning_file_id)
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': scanning_file_id})
        
        response = self.client.head(content_url)
        self.assertEqual(response.status_code, 423)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_head_request_infected_file_returns_403(self):
        """Test that HEAD request for infected file returns 403"""
        # Create a new file specifically for this test to avoid FSM state conflicts
        test_file = SimpleUploadedFile(
            'head_infected_test.txt',
            b'HEAD infected test file content',
            content_type='text/plain'
        )
        
        upload_response = self.client.post(self.upload_url, {
            'file': test_file
        }, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        infected_file_id = upload_response.data['id']
        
        # Set file status to INFECTED
        metric_file = MetricFile.objects.get(id=infected_file_id)
        
        # With CELERY_TASK_ALWAYS_EAGER=False, file should be in INCOMING state
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        
        # Force file to INFECTED state for testing
        metric_file.start_scan()
        metric_file.save()
        metric_file = MetricFile.objects.get(id=infected_file_id)
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        metric_file.mark_infected()
        metric_file.save()
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': infected_file_id})
        
        response = self.client.head(content_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_head_request_deleted_file_returns_404(self):
        """Test that HEAD request for deleted file returns 404"""
        # Mark file as deleted
        metric_file = MetricFile.objects.get(id=self.file_id)
        metric_file.is_deleted = True
        metric_file.save()
        
        content_url = reverse('metric_upload:file-content', kwargs={'pk': self.file_id})
        
        response = self.client.head(content_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_head_request_nonexistent_file_returns_404(self):
        """Test that HEAD request for non-existent file returns 404"""
        content_url = reverse('metric_upload:file-content', kwargs={'pk': 99999})
        
        response = self.client.head(content_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def tearDown(self):
        """Clean up test files"""
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
