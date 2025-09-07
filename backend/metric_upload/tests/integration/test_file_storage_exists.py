"""
Integration test to verify uploaded files are actually persisted and readable
"""

import os
import tempfile
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.storage import default_storage
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from metric_upload.models import MetricFile

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    FILE_STORAGE_DIR=tempfile.mkdtemp()
)
class FileStorageExistsIntegrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='storage.exists@example.com',
            username='storageexists',
            password='StrongPass!234'
        )
        self.user.is_verified = True
        self.user.save()
        self.login_url = reverse('login')
        self.upload_url = reverse('metric_upload:file-upload')

    @patch('metric_upload.tasks.perform_clamav_scan', return_value=False)
    def test_uploaded_file_is_persisted_and_readable(self, _mock_scan):
        # Login
        resp = self.client.post(self.login_url, {
            'email': 'storage.exists@example.com',
            'password': 'StrongPass!234'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        token = resp.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # Upload a small file
        content = b"hello-storage-check"
        upload_file = SimpleUploadedFile('hello.txt', content, content_type='text/plain')
        upload_resp = self.client.post(self.upload_url, {'file': upload_file}, format='multipart')
        self.assertEqual(upload_resp.status_code, status.HTTP_201_CREATED)

        # Fetch DB record
        file_id = upload_resp.data['id']
        metric_file = MetricFile.objects.get(id=file_id)
        storage_key = metric_file.storage_key

        # Verify file exists on disk
        abs_path = os.path.join(settings.FILE_STORAGE_DIR, storage_key)
        self.assertTrue(os.path.exists(abs_path), f"Expected file at {abs_path}")

        # Verify contents match using direct file access
        with open(abs_path, 'rb') as f:
            data = f.read()
        self.assertEqual(data, content)

        # Sanity: model reports ready/scanning/incoming depending on timing
        self.assertIn(metric_file.status, [
            MetricFile.SCANNING,
            MetricFile.READY,
            MetricFile.INCOMING,
        ])

    def tearDown(self):
        # Clean up uploaded files from FILE_STORAGE_DIR
        for mf in MetricFile.objects.all():
            path = os.path.join(settings.FILE_STORAGE_DIR, mf.storage_key)
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
        # Remove empty dirs
        base = settings.FILE_STORAGE_DIR
        for root, dirs, files in os.walk(base, topdown=False):
            if root != base and not files and not dirs:
                try:
                    os.rmdir(root)
                except Exception:
                    pass
