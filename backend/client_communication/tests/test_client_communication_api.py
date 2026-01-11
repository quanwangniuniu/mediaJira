from django.contrib.auth import get_user_model
from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Organization, Project, ProjectMember
from task.models import Task
from client_communication.models import ClientCommunication


User = get_user_model()


class ClientCommunicationAPITestCase(TestCase):
    """
    API tests for ClientCommunication using Django's TestCase and manage.py test.
    """

    def setUp(self):
        self.client = APIClient()

        # Minimal org / user / project setup (mirrors existing test patterns)
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com",
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="testuser@test.com",
            password="testpass123",
            organization=self.organization,
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
            owner=self.user,
            objectives=["awareness"],
            kpis={"ctr": {"target": 0.02}},
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role="owner",
            is_active=True,
        )

        self.client.force_authenticate(user=self.user)

    def test_create_client_communication_for_task(self):
        """Create a client communication record for a task."""
        task = Task.objects.create(
            summary="Comm Task",
            description="Client communication task",
            type="communication",
            project=self.project,
            owner=self.user,
        )

        url = reverse("client_communication:client-communication-list-create")
        payload = {
            "task": task.id,
            "communication_type": "budget_change",
            "stakeholders": "Client: Alice\nAM: Bob",
            "impacted_areas": ["budget", "kpi"],
            "required_actions": "Increase daily budget by 20% for campaign X.",
            "client_deadline": "2030-01-15",
            "notes": "Discussed in weekly sync.",
        }

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        # The create serializer uses a write-only task field, so response may
        # omit "task". We assert basic fields then verify the DB link.
        self.assertIn("id", data)
        self.assertEqual(data["communication_type"], "budget_change")
        self.assertEqual(set(data["impacted_areas"]), {"budget", "kpi"})
        self.assertTrue(
            data["required_actions"].startswith("Increase daily budget")
        )

        # Ensure object exists in DB and is linked to the correct task
        obj = ClientCommunication.objects.get(id=data["id"])
        self.assertEqual(obj.task, task)

    def test_list_client_communications_by_task(self):
        """List client communications filtered by task_id."""
        task = Task.objects.create(
            summary="Comm Task List",
            type="communication",
            project=self.project,
            owner=self.user,
        )

        ClientCommunication.objects.create(
            task=task,
            communication_type="creative_approval",
            stakeholders="Client: Carol",
            impacted_areas=["creative"],
            required_actions="Approve creative V2 before launch.",
        )

        url = reverse("client_communication:client-communication-list-create")
        response = self.client.get(url, {"task_id": task.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        items = data["results"] if isinstance(data, dict) and "results" in data else data

        self.assertEqual(len(items), 1)
        # Response includes the linked task ID for list operations
        self.assertEqual(items[0]["communication_type"], "creative_approval")
