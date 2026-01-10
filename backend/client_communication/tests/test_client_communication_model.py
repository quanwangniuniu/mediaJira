from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from core.models import Organization, Project
from task.models import Task
from client_communication.models import (
    ClientCommunication,
    ImpactedArea,
)


User = get_user_model()


class ClientCommunicationModelTestCase(TestCase):
    """
    Model-level tests for ClientCommunication using Django's TestCase.
    """

    def setUp(self):
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

        self.task = Task.objects.create(
            summary="Comm Task",
            type="communication",
            project=self.project,
            owner=self.user,
        )

    def test_client_communication_requires_impacted_areas(self):
        """Model clean should reject empty impacted_areas."""
        comm = ClientCommunication(
            task=self.task,
            communication_type="budget_change",
            stakeholders="Client: Alice",
            impacted_areas=[],
            required_actions="Update budget allocation.",
        )

        with self.assertRaises(ValidationError) as exc:
            comm.full_clean()

        self.assertIn("impacted_areas", exc.exception.message_dict)

    def test_client_communication_rejects_invalid_impacted_area(self):
        """Model clean should reject invalid impacted area values."""
        comm = ClientCommunication(
            task=self.task,
            communication_type="budget_change",
            stakeholders="Client: Alice",
            impacted_areas=["budget", "invalid_area"],
            required_actions="Update budget allocation.",
        )

        with self.assertRaises(ValidationError) as exc:
            comm.full_clean()

        self.assertIn("impacted_areas", exc.exception.message_dict)
        msg = str(exc.exception.message_dict["impacted_areas"])
        self.assertIn("Invalid impacted areas", msg)

    def test_client_communication_accepts_valid_impacted_areas(self):
        """Valid impacted areas should pass clean validation."""
        comm = ClientCommunication(
            task=self.task,
            communication_type="budget_change",
            stakeholders="Client: Alice",
            impacted_areas=[ImpactedArea.BUDGET, ImpactedArea.KPI],
            required_actions="Update budget allocation and KPI targets.",
        )

        # Should not raise
        comm.full_clean()
        comm.save()
