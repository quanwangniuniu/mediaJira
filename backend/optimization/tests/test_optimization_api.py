from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Project, ProjectMember, Organization
from task.models import Task
from optimization.models import Optimization


User = get_user_model()


class OptimizationAPITest(TestCase):
    """API tests for Optimization endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="opt_user",
            email="opt@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="Opt Org")
        self.project = Project.objects.create(
            name="Opt Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.task = Task.objects.create(
            summary="Optimization Task",
            project=self.project,
            owner=self.user,
            type="optimization",
        )
        self.client.force_authenticate(user=self.user)

    def _results(self, response):
        """
        DRF may paginate list endpoints. Normalize to a list of items.
        """
        data = response.data
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        return data

    def _assert_has_error_key(self, response, key: str):
        """
        Validation errors in this codebase are typically returned as top-level
        field keys (e.g. {'task': ['...']}) rather than nested under 'detail'.
        """
        data = response.data
        if isinstance(data, dict) and isinstance(data.get("detail"), dict):
            data = data["detail"]
        self.assertIsInstance(data, dict)
        self.assertIn(key, data)

    def test_create_optimization_via_api(self):
        """Create an optimization via API."""
        url = "/api/optimization/optimizations/"
        payload = {
            "task": self.task.id,
            "affected_entity_ids": {
                "campaign_ids": ["fb:123"],
                "ad_set_ids": ["fb:456"],
            },
            "triggered_metrics": {
                "CPA": {"delta_pct": 35, "window": "24h"},
            },
            "baseline_metrics": {
                "CPA": 12.3,
                "CTR": 0.9,
            },
            "action_type": "pause",
            "planned_action": "Pause underperforming ad set",
            "execution_status": "detected",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["task"], self.task.id)
        self.assertEqual(response.data["action_type"], "pause")
        self.assertEqual(response.data["execution_status"], "detected")

    def test_create_optimization_with_wrong_task_type(self):
        """Create optimization should fail if task type is not 'optimization'."""
        wrong_task = Task.objects.create(
            summary="Wrong Task",
            project=self.project,
            owner=self.user,
            type="experiment",  # Wrong type
        )
        url = "/api/optimization/optimizations/"
        payload = {
            "task": wrong_task.id,
            "action_type": "pause",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_has_error_key(response, "task")

    def test_create_duplicate_optimization_for_same_task(self):
        """Create optimization should fail if one already exists for the task."""
        Optimization.objects.create(
            task=self.task,
            action_type=Optimization.ActionType.PAUSE,
        )
        url = "/api/optimization/optimizations/"
        payload = {
            "task": self.task.id,
            "action_type": "scale",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_has_error_key(response, "task")

    def test_get_optimization_list(self):
        """GET list should return only optimizations in user's projects."""
        opt1 = Optimization.objects.create(
            task=self.task,
            action_type=Optimization.ActionType.PAUSE,
        )

        # Create another project and optimization that user is not a member of
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        other_task = Task.objects.create(
            summary="Other Task",
            project=other_project,
            owner=self.other_user,
            type="optimization",
        )
        opt2 = Optimization.objects.create(
            task=other_task,
            action_type=Optimization.ActionType.SCALE,
        )

        url = "/api/optimization/optimizations/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], opt1.id)

    def test_get_optimization_list_with_filters(self):
        """GET list should support filtering by task_id, execution_status, action_type."""
        opt1 = Optimization.objects.create(
            task=self.task,
            action_type=Optimization.ActionType.PAUSE,
            execution_status=Optimization.ExecutionStatus.DETECTED,
        )

        task2 = Task.objects.create(
            summary="Task 2",
            project=self.project,
            owner=self.user,
            type="optimization",
        )
        opt2 = Optimization.objects.create(
            task=task2,
            action_type=Optimization.ActionType.SCALE,
            execution_status=Optimization.ExecutionStatus.PLANNED,
        )

        # Filter by task_id
        url = f"/api/optimization/optimizations/?task_id={self.task.id}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], opt1.id)

        # Filter by execution_status
        url = "/api/optimization/optimizations/?execution_status=detected"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], opt1.id)

        # Filter by action_type
        url = "/api/optimization/optimizations/?action_type=scale"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], opt2.id)

    def test_get_optimization_detail(self):
        """GET detail should return optimization if user is project member."""
        opt = Optimization.objects.create(
            task=self.task,
            action_type=Optimization.ActionType.PAUSE,
            planned_action="Pause ad set",
        )

        url = f"/api/optimization/optimizations/{opt.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], opt.id)
        self.assertEqual(response.data["planned_action"], "Pause ad set")

    def test_get_optimization_detail_not_member(self):
        """GET detail should return 404 if user is not project member."""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        other_task = Task.objects.create(
            summary="Other Task",
            project=other_project,
            owner=self.other_user,
            type="optimization",
        )
        opt = Optimization.objects.create(
            task=other_task,
            action_type=Optimization.ActionType.PAUSE,
        )

        url = f"/api/optimization/optimizations/{opt.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_optimization(self):
        """PATCH should update optimization fields."""
        opt = Optimization.objects.create(
            task=self.task,
            action_type=Optimization.ActionType.PAUSE,
            execution_status=Optimization.ExecutionStatus.DETECTED,
        )

        url = f"/api/optimization/optimizations/{opt.id}/"
        payload = {
            "execution_status": "planned",
            "planned_action": "Updated planned action",
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["execution_status"], "planned")
        self.assertEqual(response.data["planned_action"], "Updated planned action")

        # Verify in DB
        opt.refresh_from_db()
        self.assertEqual(opt.execution_status, Optimization.ExecutionStatus.PLANNED)
        self.assertEqual(opt.planned_action, "Updated planned action")

    def test_update_optimization_not_member(self):
        """PATCH should return 404 if user is not project member."""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        other_task = Task.objects.create(
            summary="Other Task",
            project=other_project,
            owner=self.other_user,
            type="optimization",
        )
        opt = Optimization.objects.create(
            task=other_task,
            action_type=Optimization.ActionType.PAUSE,
        )

        url = f"/api/optimization/optimizations/{opt.id}/"
        payload = {"execution_status": "planned"}

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_optimization(self):
        """DELETE should remove optimization."""
        opt = Optimization.objects.create(
            task=self.task,
            action_type=Optimization.ActionType.PAUSE,
        )

        url = f"/api/optimization/optimizations/{opt.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify deleted
        self.assertFalse(Optimization.objects.filter(id=opt.id).exists())

    def test_delete_optimization_not_member(self):
        """DELETE should return 404 if user is not project member."""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        other_task = Task.objects.create(
            summary="Other Task",
            project=other_project,
            owner=self.other_user,
            type="optimization",
        )
        opt = Optimization.objects.create(
            task=other_task,
            action_type=Optimization.ActionType.PAUSE,
        )

        url = f"/api/optimization/optimizations/{opt.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_validate_affected_entity_ids_format(self):
        """Create should validate affected_entity_ids ID format."""
        url = "/api/optimization/optimizations/"
        payload = {
            "task": self.task.id,
            "affected_entity_ids": {
                "campaign_ids": ["invalid_id"],  # Invalid format
            },
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_has_error_key(response, "affected_entity_ids")

