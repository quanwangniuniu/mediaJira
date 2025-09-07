"""
Integration tests for file detail API boundaries
Tests accessing file details in different states and edge cases
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
class FileDetailBoundariesTest(TestCase):
    """Test file detail API boundary conditions"""
    
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
    
    def test_access_nonexistent_file_detail_returns_404(self):
        """Test accessing details of non-existent file returns 404"""
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': 99999})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Not found', response.data['detail'])
    
    def test_access_deleted_file_detail_returns_404(self):
        """Test accessing details of deleted file returns 404"""
        # Mark file as deleted
        metric_file = MetricFile.objects.get(id=self.file_id)
        metric_file.is_deleted = True
        metric_file.save()
        
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': self.file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Not found', response.data['detail'])
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_access_scanning_file_detail_returns_200(self):
        """Test accessing details of scanning file returns 200 (details are always accessible)"""
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
        # Re-fetch to ensure status is updated
        metric_file = MetricFile.objects.get(id=scanning_file_id)
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': scanning_file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], scanning_file_id)
        self.assertEqual(response.data['status'], MetricFile.SCANNING)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_access_infected_file_detail_returns_200(self):
        """Test accessing details of infected file returns 200 (details are always accessible)"""
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
        # Re-fetch to ensure status is updated
        metric_file = MetricFile.objects.get(id=infected_file_id)
        self.assertEqual(metric_file.status, MetricFile.INFECTED)
        
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': infected_file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], infected_file_id)
        self.assertEqual(response.data['status'], MetricFile.INFECTED)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_access_error_scanning_file_detail_returns_200(self):
        """Test accessing details of error scanning file returns 200 (details are always accessible)"""
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
        # Re-fetch to ensure status is updated
        metric_file = MetricFile.objects.get(id=error_file_id)
        self.assertEqual(metric_file.status, MetricFile.ERROR_SCANNING)
        
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': error_file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], error_file_id)
        self.assertEqual(response.data['status'], MetricFile.ERROR_SCANNING)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=False)
    def test_access_missing_file_detail_returns_200(self):
        """Test accessing details of missing file returns 200 (details are always accessible)"""
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
        # Re-fetch to ensure status is updated
        metric_file = MetricFile.objects.get(id=missing_file_id)
        self.assertEqual(metric_file.status, MetricFile.MISSING)
        
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': missing_file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], missing_file_id)
        self.assertEqual(response.data['status'], MetricFile.MISSING)
    
    def test_access_ready_file_detail_returns_200(self):
        """Test accessing details of ready file returns 200"""
        # Set file status to READY
        metric_file = MetricFile.objects.get(id=self.file_id)
        # Force file to READY state for testing
        if metric_file.status == MetricFile.INCOMING:
            metric_file.start_scan()
            metric_file.save()
            metric_file = MetricFile.objects.get(id=self.file_id)
        if metric_file.status == MetricFile.SCANNING:
            metric_file.mark_clean()
            metric_file.save()
        
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': self.file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.file_id)
        self.assertEqual(response.data['status'], MetricFile.READY)
    
    def test_file_detail_includes_all_required_fields(self):
        """Test that file detail response includes all required fields"""
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': self.file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        required_fields = [
            'id', 'status', 'mime_type', 'size', 'checksum', 'storage_key',
            'original_filename', 'is_public', 'is_deleted', 'uploaded_by', 
            'created_at', 'updated_at'
        ]
        
        for field in required_fields:
            self.assertIn(field, data, f"Field '{field}' missing from response")
    
    def test_file_detail_uploaded_by_field_structure(self):
        """Test that uploaded_by field has correct structure"""
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': self.file_id})
        
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        uploaded_by = response.data['uploaded_by']
        self.assertIsInstance(uploaded_by, dict)
        self.assertIn('id', uploaded_by)
        self.assertIn('username', uploaded_by)
        self.assertIn('email', uploaded_by)
        self.assertEqual(uploaded_by['id'], self.user.id)
        self.assertEqual(uploaded_by['username'], self.user.username)
        self.assertEqual(uploaded_by['email'], self.user.email)
    
    def tearDown(self):
        """Clean up test files"""
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
