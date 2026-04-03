from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Organization, Project, ProjectMember, CustomUser
from meetings.models import Meeting, AgendaItem, ParticipantLink, MeetingDocument


class TestMeetingAPI(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.organization = Organization.objects.create(name="Org", slug="org")
        self.project_a = Project.objects.create(
            name="Project A",
            organization=self.organization,
        )
        self.project_b = Project.objects.create(
            name="Project B",
            organization=self.organization,
        )

        self.user_a = CustomUser.objects.create_user(
            email="user_a@example.com",
            password="password",
            username="user_a",
        )
        ProjectMember.objects.create(
            user=self.user_a,
            project=self.project_a,
            is_active=True,
        )

        self.user_b = CustomUser.objects.create_user(
            email="user_b@example.com",
            password="password",
            username="user_b",
        )
        ProjectMember.objects.create(
            user=self.user_b,
            project=self.project_b,
            is_active=True,
        )

        self.client.force_authenticate(user=self.user_a)

    def _extract_ids(self, response):
        """Normalize list vs paginated responses and return ID set."""
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        if isinstance(data, dict) and "results" in data:
            items = data["results"]
        else:
            items = data

        self.assertIsInstance(items, list)
        return {item["id"] for item in items}

    def test_project_isolation_meeting_list(self):
        meeting_a = Meeting.objects.create(
            project=self.project_a,
            title="Meeting A",
            meeting_type="planning",
            objective="Objective A",
        )
        meeting_b = Meeting.objects.create(
            project=self.project_b,
            title="Meeting B",
            meeting_type="review",
            objective="Objective B",
        )

        url = f"/api/v1/projects/{self.project_a.id}/meetings/"
        response = self.client.get(url)

        ids = self._extract_ids(response)
        self.assertIn(meeting_a.id, ids)
        self.assertNotIn(meeting_b.id, ids)

    def test_project_isolation_meeting_list_forbidden_for_other_project(self):
        url = f"/api/v1/projects/{self.project_b.id}/meetings/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_reorder_agenda_items(self):
        meeting = Meeting.objects.create(
            project=self.project_a,
            title="Meeting",
            meeting_type="planning",
            objective="Objective",
        )
        AgendaItem.objects.create(
            meeting=meeting, content="Item 1", order_index=0, is_priority=False
        )
        AgendaItem.objects.create(
            meeting=meeting, content="Item 2", order_index=1, is_priority=False
        )
        AgendaItem.objects.create(
            meeting=meeting, content="Item 3", order_index=2, is_priority=False
        )

        url = f"/api/v1/projects/{self.project_a.id}/meetings/{meeting.id}/agenda-items/reorder/"
        items = list(AgendaItem.objects.filter(meeting=meeting).order_by("order_index"))

        payload = {
            "items": [
                {"id": items[0].id, "order_index": 2},
                {"id": items[1].id, "order_index": 0},
                {"id": items[2].id, "order_index": 1},
            ]
        }

        response = self.client.patch(url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        ordered = list(
            AgendaItem.objects.filter(meeting=meeting).order_by("order_index", "id")
        )
        self.assertEqual(
            [a.content for a in ordered],
            ["Item 2", "Item 3", "Item 1"],
        )

    def test_reorder_agenda_items_invalid_payload(self):
        meeting = Meeting.objects.create(
            project=self.project_a,
            title="Meeting",
            meeting_type="planning",
            objective="Objective",
        )

        url = f"/api/v1/projects/{self.project_a.id}/meetings/{meeting.id}/agenda-items/reorder/"

        response = self.client.patch(
            url,
            data={"items": "not-a-list"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_participant_unique_constraint(self):
        meeting = Meeting.objects.create(
            project=self.project_a,
            title="Meeting",
            meeting_type="planning",
            objective="Objective",
        )

        url = f"/api/v1/projects/{self.project_a.id}/meetings/{meeting.id}/participants/"

        response1 = self.client.post(
            url,
            data={"user": self.user_a.id, "role": "host"},
            format="json",
        )
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            ParticipantLink.objects.filter(
                meeting=meeting,
                user=self.user_a,
            ).count(),
            1,
        )

        response2 = self.client.post(
            url,
            data={"user": self.user_a.id, "role": "host"},
            format="json",
        )
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_meeting_cascade_delete_agenda_items(self):
        meeting = Meeting.objects.create(
            project=self.project_a,
            title="Meeting",
            meeting_type="planning",
            objective="Objective",
        )
        AgendaItem.objects.create(
            meeting=meeting, content="Item 1", order_index=0, is_priority=False
        )
        AgendaItem.objects.create(
            meeting=meeting, content="Item 2", order_index=1, is_priority=False
        )

        url = f"/api/v1/projects/{self.project_a.id}/meetings/{meeting.id}/"

        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(AgendaItem.objects.filter(meeting=meeting).exists())

    def test_create_meeting_with_participant_user_ids(self):
        url = f"/api/v1/projects/{self.project_a.id}/meetings/"
        payload = {
            "title": "With participants",
            "meeting_type": "planning",
            "objective": "Discuss",
            "participant_user_ids": [self.user_a.id, self.user_a.id],
        }
        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        meeting_id = response.data["id"]
        links = ParticipantLink.objects.filter(meeting_id=meeting_id, user=self.user_a)
        self.assertEqual(links.count(), 1)

    def test_create_meeting_participant_user_ids_rejects_non_member(self):
        url = f"/api/v1/projects/{self.project_a.id}/meetings/"
        payload = {
            "title": "Bad participant",
            "meeting_type": "planning",
            "objective": "X",
            "participant_user_ids": [self.user_b.id],
        }
        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(
            Meeting.objects.filter(title="Bad participant").exists(),
        )

    @override_settings(MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE=True)
    def test_create_meeting_defaults_creator_as_participant_when_strict_and_none_sent(self):
        url = f"/api/v1/projects/{self.project_a.id}/meetings/"
        payload = {
            "title": "No participants",
            "meeting_type": "planning",
            "objective": "Y",
        }
        response = self.client.post(url, data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        meeting_id = response.data["id"]
        self.assertTrue(
            ParticipantLink.objects.filter(
                meeting_id=meeting_id,
                user_id=self.user_a.id,
            ).exists(),
        )

    def test_get_meeting_document_creates_default_document(self):
        meeting = Meeting.objects.create(
            project=self.project_a,
            title="Meeting Doc",
            meeting_type="planning",
            objective="Doc",
        )
        url = f"/api/v1/projects/{self.project_a.id}/meetings/{meeting.id}/document/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["meeting"], meeting.id)
        self.assertEqual(response.data["content"], "")
        self.assertTrue(MeetingDocument.objects.filter(meeting=meeting).exists())

    def test_patch_meeting_document_updates_content(self):
        meeting = Meeting.objects.create(
            project=self.project_a,
            title="Meeting Doc",
            meeting_type="planning",
            objective="Doc",
        )
        url = f"/api/v1/projects/{self.project_a.id}/meetings/{meeting.id}/document/"
        response = self.client.patch(
            url,
            data={"content": "Collaborative content"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["content"], "Collaborative content")
        doc = MeetingDocument.objects.get(meeting=meeting)
        self.assertEqual(doc.last_edited_by_id, self.user_a.id)


