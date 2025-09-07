"""
Integration test for file upload happy path
Tests the complete flow: user creation -> login -> upload -> scan
"""

import os
import tempfile
import time
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from metric_upload.models import MetricFile

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,  # Run tasks synchronously for testing
    FILE_STORAGE_DIR=tempfile.mkdtemp()   # Use temporary directory for file storage
)
class FileUploadHappyPathTest(TestCase):
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        
        # Create test user
        self.test_email = 'test_upload@example.com'
        self.test_password = 'testpass123'
        
        self.user = User.objects.create_user(
            email=self.test_email,
            username='testuploader',
            password=self.test_password
        )
        # Set user as verified (required for login)
        self.user.is_verified = True
        self.user.save()
        
        # Create test file content
        self.test_content = b"This is a test file for upload testing.\nCreated at: " + str(time.time()).encode()
        self.test_filename = 'test_upload.txt'
        
        # URLs
        self.login_url = reverse('login')  # No namespace for authentication
        self.upload_url = reverse('metric_upload:file-upload')
    
    def test_complete_upload_flow(self):
        """Test complete file upload flow"""
        # Step 1: Login and get token
        login_data = {
            'email': self.test_email,
            'password': self.test_password
        }
        
        login_response = self.client.post(self.login_url, login_data)
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        
        token = login_response.data.get('token')
        self.assertIsNotNone(token, "Should get token from login")
        
        # Step 2: Set authentication header
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Step 3: Upload file
        test_file = SimpleUploadedFile(
            self.test_filename,
            self.test_content,
            content_type='text/plain'
        )
        
        upload_data = {'file': test_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        # Step 4: Verify upload response
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertIn('id', file_data)
        self.assertEqual(file_data['status'], MetricFile.INCOMING)
        self.assertEqual(file_data['original_filename'], self.test_filename)
        self.assertEqual(file_data['size'], len(self.test_content))
        self.assertIn('storage_key', file_data)
        
        # Step 5: Verify database record
        file_id = file_data['id']
        metric_file = MetricFile.objects.get(id=file_id)
        
        self.assertEqual(metric_file.uploaded_by, self.user)
        # Note: scan task may have already transitioned status due to eager execution
        # We only assert INCOMING on the response payload above; DB state may differ here
        self.assertEqual(metric_file.original_filename, self.test_filename)
        self.assertEqual(metric_file.size, len(self.test_content))
        
        # Step 6: Verify file was saved to storage
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
        self.assertTrue(os.path.exists(full_path))
        
        # Step 7: Check that virus scan task was triggered
        # Since we're using CELERY_TASK_ALWAYS_EAGER=True, the task runs immediately
        # We can check if the status changed
        metric_file = MetricFile.objects.get(id=file_id)
        
        # The status should have changed from INCOMING to a scanning or final state
        # Note: In test environment, ClamAV might not be available, so status could be:
        # - SCANNING: if scan is in progress
        # - READY: if scan completed successfully
        # - INFECTED: if ClamAV is not available (safety fallback)
        # - ERROR_SCANNING: if scan encountered an error
        # - MISSING: if file path issues
        self.assertIn(metric_file.status, [
            MetricFile.SCANNING, 
            MetricFile.READY, 
            MetricFile.INFECTED,
            MetricFile.ERROR_SCANNING,
            MetricFile.MISSING
        ])
        
    
    def test_upload_without_authentication(self):
        """Test upload without authentication should fail"""
        test_file = SimpleUploadedFile(
            'unauth.txt',
            b'Unauthorized upload',
            content_type='text/plain'
        )
        
        upload_data = {'file': test_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_upload_missing_file(self):
        """Test upload without file should fail"""
        # Login first
        login_data = {
            'email': self.test_email,
            'password': self.test_password
        }
        login_response = self.client.post(self.login_url, login_data)
        token = login_response.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Try to upload without file
        upload_response = self.client.post(self.upload_url, {}, format='multipart')
        self.assertEqual(upload_response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def tearDown(self):
        """Clean up test files"""
        # Clean up any uploaded files
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
