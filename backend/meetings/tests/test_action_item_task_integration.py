"""
SMP-489 Action Item → Task integration tests.

Covers:
1. Single successful conversion
2. Same action item cannot be converted twice
3. Task preserves origin meeting (snapshots)
4. Task preserves origin action item (snapshots + origins API)
5. Bulk conversion success
6. Bulk with mix of already-converted ids (skip + continue)
"""

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Organization, Project, ProjectMember, CustomUser
from meetings.models import Meeting, MeetingActionItem
from task.models import Task


class TestActionItemTaskIntegration(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.organization = Organization.objects.create(name="Org", slug="org-int")
        self.project = Project.objects.create(
            name="Project",
            organization=self.organization,
        )

        self.user = CustomUser.objects.create_user(
            email="owner@example.com",
            password="password",
            username="owner",
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            is_active=True,
        )

        self.meeting = Meeting.objects.create(
            project=self.project,
            title="Weekly sync",
            meeting_type="standup",
            objective="Ship SMP-489",
        )
        self.action_item = MeetingActionItem.objects.create(
            meeting=self.meeting,
            title="Follow up with client",
            description="Send recap email",
            order_index=0,
        )

        self.client.force_authenticate(user=self.user)

    def _convert_url(self, action_item_id):
        return (
            f"/api/v1/projects/{self.project.id}/meetings/{self.meeting.id}/"
            f"action-items/{action_item_id}/convert-to-task/"
        )

    def _bulk_url(self):
        return (
            f"/api/v1/projects/{self.project.id}/meetings/{self.meeting.id}/"
            f"action-items/bulk-convert-to-tasks/"
        )

    def _post_convert(self, action_item_id, **extra):
        body = {
            "type": "execution",
            "priority": "HIGH",
            "create_as_draft": True,
        }
        body.update(extra)
        return self.client.post(self._convert_url(action_item_id), body, format="json")

    # --- 1. Single successful conversion ---
    def test_single_convert_success(self):
        response = self._post_convert(self.action_item.id)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["summary"], "Follow up with client")
        self.assertIn("recap", (response.data.get("description") or "").lower())

    # --- 2. Same action item cannot convert twice ---
    def test_same_action_item_cannot_convert_twice(self):
        self._post_convert(self.action_item.id)
        second = self._post_convert(self.action_item.id)
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    # --- 3. Task preserves origin meeting ---
    def test_task_preserves_origin_meeting(self):
        response = self._post_convert(self.action_item.id)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["origin_meeting_id"], self.meeting.id)
        self.assertEqual(response.data["origin_meeting_title"], "Weekly sync")

        task = Task.objects.get(pk=response.data["id"])
        self.assertEqual(task.origin_meeting_id, self.meeting.id)
        self.assertEqual(task.origin_meeting_title, "Weekly sync")

    # --- 4. Task preserves origin action item ---
    def test_task_preserves_origin_action_item(self):
        response = self._post_convert(self.action_item.id)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["origin_action_item_id"], self.action_item.id)
        self.assertEqual(
            response.data["origin_action_item_title"],
            "Follow up with client",
        )

        task = Task.objects.get(pk=response.data["id"])
        self.assertEqual(task.origin_action_item_id, self.action_item.id)
        self.assertEqual(task.origin_action_item_title, "Follow up with client")

        origins = self.client.get(f"/api/tasks/{task.id}/origins/")
        self.assertEqual(origins.status_code, status.HTTP_200_OK)
        self.assertEqual(origins.data["origin_action_item_id"], self.action_item.id)
        self.assertEqual(
            origins.data["origin_action_item_title"],
            "Follow up with client",
        )

    # --- 5. Bulk conversion success ---
    def test_bulk_convert_all_succeed(self):
        ai2 = MeetingActionItem.objects.create(
            meeting=self.meeting,
            title="Second item",
            description="",
            order_index=1,
        )
        ai3 = MeetingActionItem.objects.create(
            meeting=self.meeting,
            title="Third item",
            description="",
            order_index=2,
        )
        r = self.client.post(
            self._bulk_url(),
            {
                "action_item_ids": [self.action_item.id, ai2.id, ai3.id],
                "type": "execution",
                "priority": "MEDIUM",
                "create_as_draft": True,
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["created"]), 3)
        self.assertEqual(r.data["skipped"], [])

        summaries = {row["task"]["summary"] for row in r.data["created"]}
        self.assertEqual(
            summaries,
            {"Follow up with client", "Second item", "Third item"},
        )
        for row in r.data["created"]:
            t = row["task"]
            self.assertEqual(t["origin_meeting_id"], self.meeting.id)
            self.assertEqual(t["origin_meeting_title"], "Weekly sync")

    # --- 6. Bulk: mixed with already-converted items ---
    def test_bulk_convert_mixed_skips_already_converted(self):
        ai2 = MeetingActionItem.objects.create(
            meeting=self.meeting,
            title="Second item",
            description="",
            order_index=1,
        )
        ai3 = MeetingActionItem.objects.create(
            meeting=self.meeting,
            title="Third item",
            description="",
            order_index=2,
        )

        first = self._post_convert(self.action_item.id)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        r = self.client.post(
            self._bulk_url(),
            {
                "action_item_ids": [self.action_item.id, ai2.id, ai3.id],
                "type": "execution",
                "priority": "LOW",
                "create_as_draft": True,
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["created"]), 2)
        self.assertEqual(len(r.data["skipped"]), 1)
        self.assertEqual(r.data["skipped"][0]["action_item_id"], self.action_item.id)
        self.assertEqual(r.data["skipped"][0]["reason"], "already_converted")

        created_ids = {row["action_item_id"] for row in r.data["created"]}
        self.assertEqual(created_ids, {ai2.id, ai3.id})
