"""
Integration tests for scan outcomes: infected, error_scanning, missing
"""

import os
import tempfile
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings

from metric_upload.models import MetricFile
from metric_upload.tasks import scan_file_for_virus

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    FILE_STORAGE_DIR=tempfile.mkdtemp()
)
class ScanOutcomesIntegrationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='scan.outcomes@example.com',
            username='scanoutcomes',
            password='strong-pass-123'
        )
        self.user.is_verified = True
        self.user.save()

    def _create_physical_file(self, relative_path: str, content: bytes) -> str:
        abs_path = os.path.join(settings.FILE_STORAGE_DIR, relative_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, 'wb') as f:
            f.write(content)
        return abs_path

    def _create_metric_file(self, storage_key: str, size: int, original_filename: str = 'test.bin') -> MetricFile:
        metric_file = MetricFile.objects.create(
            original_filename=original_filename,
            mime_type='application/octet-stream',
            size=size,
            storage_key=storage_key,
            uploaded_by=self.user,
            status=MetricFile.INCOMING,
        )
        # Keep timestamps realistic
        metric_file.created_at = timezone.now()
        metric_file.updated_at = timezone.now()
        metric_file.save()
        return metric_file

    @patch('metric_upload.tasks.perform_clamav_scan', return_value=True)
    def test_scan_marks_infected_when_scanner_detects_virus(self, _mock_scan):
        # Arrange: physical file exists
        relative_path = 'tests/scan/infected/eicar.txt'
        content = b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
        self._create_physical_file(relative_path, content)

        # Create DB record pointing to relative storage_key
        metric_file = self._create_metric_file(storage_key=relative_path, size=len(content))

        # Act: run scan task synchronously
        scan_file_for_virus(metric_file.id)

        # Assert
        metric_file = MetricFile.objects.get(id=metric_file.id)
        self.assertEqual(metric_file.status, MetricFile.INFECTED)

    @patch('metric_upload.tasks.perform_clamav_scan', side_effect=RuntimeError('clamd unavailable'))
    def test_scan_marks_error_scanning_when_scanner_errors(self, _mock_scan):
        # Arrange: physical file exists
        relative_path = 'tests/scan/error/file.bin'
        content = b"dummy data for scanner error"
        self._create_physical_file(relative_path, content)

        metric_file = self._create_metric_file(storage_key=relative_path, size=len(content))

        # Act (task may retry; ignore raised exception in eager mode)
        try:
            scan_file_for_virus(metric_file.id)
        except Exception:
            pass

        # Assert
        metric_file = MetricFile.objects.get(id=metric_file.id)
        self.assertEqual(metric_file.status, MetricFile.ERROR_SCANNING)

    def test_scan_marks_missing_when_file_is_absent(self):
        # Arrange: file path does not exist on disk
        relative_path = 'tests/scan/missing/nonexistent.bin'
        self.assertFalse(os.path.exists(os.path.join(settings.FILE_STORAGE_DIR, relative_path)))

        metric_file = self._create_metric_file(storage_key=relative_path, size=123)

        # Act
        scan_file_for_virus(metric_file.id)

        # Assert
        metric_file = MetricFile.objects.get(id=metric_file.id)
        self.assertEqual(metric_file.status, MetricFile.MISSING)
