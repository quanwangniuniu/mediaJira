from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Project, ProjectMember, Organization
from task.models import Task
from optimization.models import ScalingPlan, ScalingStep


User = get_user_model()


class ScalingPlanModelTest(TestCase):
    """Basic model tests for ScalingPlan and ScalingStep."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="scaling_user",
            email="scaling@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="Scaling Org")
        self.project = Project.objects.create(
            name="Scaling Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.task = Task.objects.create(
            summary="Scaling Task",
            project=self.project,
            owner=self.user,
            type="scaling",
        )

    def test_create_scaling_plan_and_steps(self):
        """Create a ScalingPlan and related ScalingStep."""
        plan = ScalingPlan.objects.create(
            task=self.task,
            strategy=ScalingPlan.Strategy.HORIZONTAL,
            scaling_target="Increase budget from 500 to 3000 per day",
            risk_considerations="Potential ROAS drop and CPA increase",
            max_scaling_limit="Max 30% per step, cap 3000/day",
            stop_conditions="ROAS < 3 for 2 days",
            affected_entities=[{"platform": "fb", "campaign_id": "fb:123"}],
            expected_outcomes="Maintain ROAS >= 3.5 while tripling spend",
        )

        step = ScalingStep.objects.create(
            plan=plan,
            step_order=1,
            name="Initial budget increase",
            planned_change="Increase budget from 500 to 800",
            expected_metrics={"roas_min": 3.5},
            status=ScalingStep.StepStatus.PLANNED,
        )

        self.assertEqual(plan.task, self.task)
        self.assertEqual(plan.strategy, ScalingPlan.Strategy.HORIZONTAL)
        self.assertEqual(plan.steps.count(), 1)
        self.assertEqual(step.plan, plan)
        self.assertEqual(step.step_order, 1)
        self.assertEqual(step.name, "Initial budget increase")


class ScalingPlanAPITest(TestCase):
    """API tests for ScalingPlan and ScalingStep endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="api_scaling_user",
            email="api_scaling@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="API Scaling Org")
        self.project = Project.objects.create(
            name="API Scaling Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.task = Task.objects.create(
            summary="API Scaling Task",
            project=self.project,
            owner=self.user,
            type="scaling",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_and_retrieve_scaling_plan_via_api(self):
        """Create a scaling plan via API and retrieve it."""
        url = "/api/optimization/scaling-plans/"
        payload = {
            "task": self.task.id,
            "strategy": "horizontal",
            "scaling_target": "Scale budget from 500 to 3000",
            "risk_considerations": "ROAS may drop",
            "max_scaling_limit": "Max +30% per step",
            "stop_conditions": "ROAS < 3 for 2 days",
            "affected_entities": [
                {"platform": "fb", "campaign_id": "fb:123", "ad_sets": ["adset1"]}
            ],
            "expected_outcomes": "Maintain ROAS >= 3.5",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 201)
        plan_id = response.data["id"]

        detail_url = f"/api/optimization/scaling-plans/{plan_id}/"
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.data["task"], self.task.id)
        self.assertEqual(detail_resp.data["strategy"], "horizontal")

    def test_create_step_for_plan_via_api(self):
        """Create a scaling step via API for an existing plan."""
        plan = ScalingPlan.objects.create(
            task=self.task,
            strategy=ScalingPlan.Strategy.VERTICAL,
        )
        url = f"/api/optimization/scaling-plans/{plan.id}/steps/"
        payload = {
            "step_order": 1,
            "name": "Increase budget",
            "planned_change": "Increase budget from 500 to 800",
            "expected_metrics": {"roas_min": 3.5},
            "status": "planned",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ScalingStep.objects.filter(plan=plan).count(), 1)

        step = ScalingStep.objects.get(plan=plan)
        detail_url = f"/api/optimization/scaling-steps/{step.id}/"
        detail_resp = self.client.get(detail_url)
        self.assertEqual(detail_resp.status_code, 200)
        self.assertEqual(detail_resp.data["name"], "Increase budget")
