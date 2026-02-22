from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from core.models import Project, Organization
from spreadsheet.models import (
    Spreadsheet,
    Sheet,
    WorkflowPattern,
    WorkflowPatternStep,
    PatternJob,
    PatternJobStatus,
)
from spreadsheet.tasks import apply_pattern_job
from django.core.exceptions import ValidationError

User = get_user_model()


def create_user(username='testuser', email='test@example.com'):
    return User.objects.create_user(username=username, email=email, password='testpass123')


def create_project(owner):
    organization = Organization.objects.create(name='Test Org')
    return Project.objects.create(name='Test Project', organization=organization, owner=owner)


class PatternJobApplyTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.project = create_project(self.user)
        self.spreadsheet = Spreadsheet.objects.create(project=self.project, name='Sheetbook')
        self.sheet = Sheet.objects.create(spreadsheet=self.spreadsheet, name='Sheet1', position=0)

        self.pattern = WorkflowPattern.objects.create(
            owner=self.user,
            name='Demo Pattern',
            description='',
        )
        WorkflowPatternStep.objects.create(
            pattern=self.pattern,
            seq=1,
            type='APPLY_FORMULA',
            params={'target': {'row': 1, 'col': 1}, 'formula': '=1+1'},
            disabled=False,
        )

    @patch('spreadsheet.views.apply_pattern_job.delay')
    def test_apply_pattern_enqueues_job(self, mock_delay):
        response = self.client.post(
            f'/api/spreadsheet/patterns/{self.pattern.id}/apply/',
            {'spreadsheet_id': self.spreadsheet.id, 'sheet_id': self.sheet.id},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('job_id', response.data)
        self.assertEqual(response.data['status'], PatternJobStatus.QUEUED)
        self.assertTrue(PatternJob.objects.filter(id=response.data['job_id']).exists())
        mock_delay.assert_called_once()

    def test_pattern_job_status_endpoint(self):
        job = PatternJob.objects.create(
            pattern=self.pattern,
            spreadsheet=self.spreadsheet,
            sheet=self.sheet,
            status=PatternJobStatus.QUEUED,
            progress=0,
            created_by=self.user
        )
        response = self.client.get(f'/api/spreadsheet/pattern-jobs/{job.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], PatternJobStatus.QUEUED)

    def test_pattern_job_succeeds_and_is_idempotent(self):
        job = PatternJob.objects.create(
            pattern=self.pattern,
            spreadsheet=self.spreadsheet,
            sheet=self.sheet,
            status=PatternJobStatus.QUEUED,
            progress=0,
            created_by=self.user
        )
        apply_pattern_job(str(job.id))
        job.refresh_from_db()
        self.assertEqual(job.status, PatternJobStatus.SUCCEEDED)
        self.assertEqual(job.progress, 100)
        self.assertIsNotNone(job.started_at)
        self.assertIsNotNone(job.finished_at)

        # Idempotency: re-running should not change status
        apply_pattern_job(str(job.id))
        job.refresh_from_db()
        self.assertEqual(job.status, PatternJobStatus.SUCCEEDED)
        self.assertEqual(job.progress, 100)

    def test_pattern_job_fails_with_invalid_step(self):
        bad_pattern = WorkflowPattern.objects.create(
            owner=self.user,
            name='Bad Pattern',
            description='',
        )
        WorkflowPatternStep.objects.create(
            pattern=bad_pattern,
            seq=1,
            type='APPLY_FORMULA',
            params={'target': {'row': 1, 'col': 1}},
            disabled=False,
        )
        job = PatternJob.objects.create(
            pattern=bad_pattern,
            spreadsheet=self.spreadsheet,
            sheet=self.sheet,
            status=PatternJobStatus.QUEUED,
            progress=0,
            created_by=self.user
        )
        with self.assertRaises(ValidationError):
            apply_pattern_job(str(job.id))
        job.refresh_from_db()
        self.assertEqual(job.status, PatternJobStatus.FAILED)
        self.assertEqual(job.error_code, 'INVALID_ARGUMENT')

