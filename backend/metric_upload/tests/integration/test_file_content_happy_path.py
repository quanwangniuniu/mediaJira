"""
Integration tests: File content happy path (HEAD/GET with/without Range)
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
class FileContentHappyPathTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='content.happy@example.com',
            username='contenthappy',
            password='StrongPass!234'
        )
        self.user.is_verified = True
        self.user.save()
        self.login_url = reverse('login')
        self.upload_url = reverse('metric_upload:file-upload')

    def _login(self):
        resp = self.client.post(self.login_url, {
            'email': 'content.happy@example.com',
            'password': 'StrongPass!234'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        token = resp.data.get('token')
        self.assertIsNotNone(token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def _force_ready(self, mf: MetricFile):
        # Advance state machine to READY for happy-path content serving
        mf = MetricFile.objects.get(id=mf.id)
        if mf.status == MetricFile.INCOMING:
            mf.start_scan()
            mf.save()
            mf = MetricFile.objects.get(id=mf.id)
        if mf.status == MetricFile.SCANNING:
            mf.mark_clean()
            mf.save()
            return
        if mf.status == MetricFile.ERROR_SCANNING:
            # ERROR_SCANNING cannot transition to READY directly, skip this test case
            self.skipTest("File is in ERROR_SCANNING state, cannot force to READY")
        # If already READY do nothing. Others (INFECTED/MISSING) are not happy path

    def test_head_and_get_content_happy_path(self):
        self._login()

        content = b"content-happy-body-12345"
        upload_file = SimpleUploadedFile('body.txt', content, content_type='text/plain')
        upload_resp = self.client.post(self.upload_url, {'file': upload_file}, format='multipart')
        self.assertEqual(upload_resp.status_code, status.HTTP_201_CREATED)
        file_id = upload_resp.data['id']

        mf = MetricFile.objects.get(id=file_id)
        # Ensure physical file exists at FILE_STORAGE_DIR/storage_key for GET
        abs_path = os.path.join(settings.FILE_STORAGE_DIR, mf.storage_key)
        self.assertTrue(os.path.exists(abs_path))

        # Force READY to bypass scanning blocks
        self._force_ready(mf)
        mf = MetricFile.objects.get(id=file_id)
        self.assertEqual(mf.status, MetricFile.READY)

        url = reverse('metric_upload:file-content', kwargs={'pk': file_id})

        # HEAD should return headers only
        head_resp = self.client.head(url)
        self.assertIn(head_resp.status_code, [status.HTTP_200_OK, status.HTTP_206_PARTIAL_CONTENT])
        self.assertEqual(head_resp.headers.get('Content-Type'), 'text/plain')
        self.assertTrue(int(head_resp.headers.get('Content-Length', '0')) > 0)

        # GET full content
        get_resp = self.client.get(url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.headers.get('Content-Type'), 'text/plain')
        # For StreamingHttpResponse, use streaming_content
        if hasattr(get_resp, 'streaming_content'):
            downloaded_content = b''.join(get_resp.streaming_content)
        else:
            downloaded_content = get_resp.content
        self.assertEqual(downloaded_content, content)

        # GET partial content via Range
        range_headers = {'Range': 'bytes=0-5'}
        range_resp = self.client.get(url, **{'HTTP_RANGE': range_headers['Range']})
        self.assertEqual(range_resp.status_code, status.HTTP_206_PARTIAL_CONTENT)
        self.assertEqual(range_resp.headers.get('Content-Type'), 'text/plain')
        self.assertEqual(range_resp.headers.get('Content-Range'), f'bytes 0-5/{len(content)}')
        # For StreamingHttpResponse, use streaming_content
        if hasattr(range_resp, 'streaming_content'):
            partial_content = b''.join(range_resp.streaming_content)
        else:
            partial_content = range_resp.content
        self.assertEqual(partial_content, content[0:6])

    def tearDown(self):
        for mf in MetricFile.objects.all():
            path = os.path.join(settings.FILE_STORAGE_DIR, mf.storage_key)
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
