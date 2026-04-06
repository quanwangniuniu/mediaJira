from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import CustomUser, Organization, Project
from slack_integration.models import NotificationPreference, SlackWorkspaceConnection
from task.models import Task


class TestNotificationPreferenceApi(APITestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org", slug="test-org")
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="password123",
            organization=self.organization,
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
        )
        self.connection = SlackWorkspaceConnection.objects.create(
            organization=self.organization,
            slack_team_id="T123456",
            slack_team_name="Test Workspace",
            encrypted_access_token="encrypted",
            default_channel_id="C_DEFAULT",
            default_channel_name="general",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def _create_preference(self, event_type, **kwargs):
        defaults = {
            "connection": self.connection,
            "project": self.project,
            "event_type": event_type,
            "is_active": True,
            "slack_channel_id": "C_TEST",
            "slack_channel_name": "test",
        }
        defaults.update(kwargs)
        return NotificationPreference.objects.create(**defaults)

    def test_patch_rejects_task_status_for_non_status_event(self):
        preference = self._create_preference(NotificationPreference.EventType.TASK_CREATED)

        response = self.client.patch(
            reverse("slack-preferences-detail", args=[preference.id]),
            {"task_status": Task.Status.CANCELLED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["task_status"][0],
            "task_status is only allowed for TASK_STATUS_CHANGE preferences.",
        )

    def test_patch_allows_task_status_for_task_status_change(self):
        """TASK_STATUS_CHANGE preferences may carry a task_status filter."""
        preference = self._create_preference(NotificationPreference.EventType.TASK_STATUS_CHANGE)

        response = self.client.patch(
            reverse("slack-preferences-detail", args=[preference.id]),
            {"task_status": Task.Status.CANCELLED},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        preference.refresh_from_db()
        self.assertEqual(preference.task_status, Task.Status.CANCELLED)

    def test_patch_without_task_status_keeps_non_status_event_valid(self):
        """Non-status preferences remain valid when task_status is not provided."""
        preference = self._create_preference(
            NotificationPreference.EventType.TASK_CREATED,
        )

        response = self.client.patch(
            reverse("slack-preferences-detail", args=[preference.id]),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        preference.refresh_from_db()
        self.assertFalse(preference.is_active)
