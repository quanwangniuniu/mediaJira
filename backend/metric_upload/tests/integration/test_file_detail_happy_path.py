"""
Integration test: File detail happy path
Owner uploads a file, then can GET /files/{id}/ to view metadata
"""

import os
import tempfile

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.conf import settings
from rest_framework.test import APIClient
from rest_framework import status

from metric_upload.models import MetricFile

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    FILE_STORAGE_DIR=tempfile.mkdtemp()
)
class FileDetailHappyPathTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='detail.happy@example.com',
            username='detailhappy',
            password='StrongPass!234'
        )
        self.user.is_verified = True
        self.user.save()
        self.login_url = reverse('login')
        self.upload_url = reverse('metric_upload:file-upload')

    def _login(self):
        resp = self.client.post(self.login_url, {
            'email': 'detail.happy@example.com',
            'password': 'StrongPass!234'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        token = resp.data.get('token')
        self.assertIsNotNone(token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_owner_can_fetch_file_detail(self):
        # Login as uploader
        self._login()

        # Upload a file
        content = b"detail-happy-file"
        upload_file = SimpleUploadedFile('detail.txt', content, content_type='text/plain')
        upload_resp = self.client.post(self.upload_url, {'file': upload_file}, format='multipart')
        self.assertEqual(upload_resp.status_code, status.HTTP_201_CREATED)

        file_id = upload_resp.data['id']
        detail_url = reverse('metric_upload:file-detail', kwargs={'pk': file_id})

        # Fetch detail
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)

        data = detail_resp.data
        # Basic metadata assertions
        self.assertEqual(data['id'], file_id)
        self.assertEqual(data['original_filename'], 'detail.txt')
        self.assertEqual(data['size'], len(content))
        self.assertIn('storage_key', data)
        self.assertIn('status', data)
        self.assertIn(data['status'], [
            MetricFile.INCOMING,
            MetricFile.SCANNING,
            MetricFile.READY,
            MetricFile.ERROR_SCANNING,
            MetricFile.INFECTED,
            MetricFile.MISSING,
        ])

        # DB sanity: record exists and belongs to requester
        mf = MetricFile.objects.get(id=file_id)
        self.assertEqual(mf.uploaded_by_id, self.user.id)

    def tearDown(self):
        # Cleanup uploaded files
        for mf in MetricFile.objects.all():
            path = os.path.join(settings.FILE_STORAGE_DIR, mf.storage_key)
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
