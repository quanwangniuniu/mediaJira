import os
import pytest

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

import django
from django.conf import settings

if not settings.configured:
    django.setup()

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from alerting.models import AlertTask
from core.models import Organization, Project, ProjectMember
from task.models import Task


User = get_user_model()


@pytest.fixture
@pytest.mark.django_db
def api_client():
    return APIClient()


@pytest.fixture
@pytest.mark.django_db
def organization():
    return Organization.objects.create(
        name="Alert Org",
        email_domain="alert.org",
    )


@pytest.fixture
@pytest.mark.django_db
def user(organization):
    return User.objects.create_user(
        username="alert_user",
        email="alert@example.com",
        password="testpass123",
        organization=organization,
    )


@pytest.fixture
@pytest.mark.django_db
def other_user(organization):
    return User.objects.create_user(
        username="other_alert_user",
        email="other_alert@example.com",
        password="testpass123",
        organization=organization,
    )


@pytest.fixture
@pytest.mark.django_db
def project(organization, user):
    project = Project.objects.create(
        name="Alert Project",
        organization=organization,
        owner=user,
    )
    ProjectMember.objects.create(user=user, project=project, is_active=True)
    return project


@pytest.fixture
@pytest.mark.django_db
def task(project, user):
    return Task.objects.create(
        summary="Alert Task",
        project=project,
        owner=user,
        type="alert",
    )


@pytest.fixture
@pytest.mark.django_db
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
@pytest.mark.django_db
def alert_payload(task):
    return {
        "task": task.id,
        "alert_type": "performance_drop",
        "severity": "critical",
        "affected_entities": [{"platform": "tt", "ad_set_id": "tt:456"}],
        "initial_metrics": {"cpa": 120, "cpa_change_pct": 90},
        "status": "open",
    }


@pytest.mark.django_db
class TestAlertTaskModel:
    def test_create_alert_task(self, task):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="spend_spike",
            severity="high",
            affected_entities=[{"platform": "fb", "campaign_id": "fb:123"}],
            initial_metrics={"spend": 1200, "spend_change_pct": 200},
        )

        assert alert_task.task == task
        assert alert_task.alert_type == "spend_spike"
        assert alert_task.severity == "high"
        assert alert_task.affected_entities[0]["campaign_id"] == "fb:123"


@pytest.mark.django_db
class TestAlertTaskAPI:
    def _extract_results(self, response):
        return (
            response.data["results"]
            if isinstance(response.data, dict) and "results" in response.data
            else response.data
        )

    def test_create_and_retrieve_alert_task_via_api(
        self, authenticated_client, task, alert_payload
    ):
        url = reverse("alerting:alert-task-list-create")
        response = authenticated_client.post(url, alert_payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        alert_id = response.data["id"]

        detail_url = reverse("alerting:alert-task-detail", kwargs={"id": alert_id})
        detail_resp = authenticated_client.get(detail_url)
        assert detail_resp.status_code == status.HTTP_200_OK
        assert detail_resp.data["task"] == task.id
        assert detail_resp.data["severity"] == "critical"

    def test_update_alert_task_status_sets_resolved_at(
        self, authenticated_client, task
    ):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="policy_violation",
            severity="medium",
        )
        url = reverse("alerting:alert-task-detail", kwargs={"id": alert_task.id})
        response = authenticated_client.patch(
            url, {"status": "resolved"}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["resolved_at"] is not None

    def test_update_alert_task_status_closed_sets_resolved_at(
        self, authenticated_client, task
    ):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="policy_violation",
            severity="medium",
        )
        url = reverse("alerting:alert-task-detail", kwargs={"id": alert_task.id})
        response = authenticated_client.patch(
            url, {"status": "closed"}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["resolved_at"] is not None

    def test_update_alert_task_status_in_progress_does_not_set_resolved_at(
        self, authenticated_client, task
    ):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="policy_violation",
            severity="medium",
        )
        url = reverse("alerting:alert-task-detail", kwargs={"id": alert_task.id})
        response = authenticated_client.patch(
            url, {"status": "in_progress"}, format="json"
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["resolved_at"] is None

    def test_create_alert_task_requires_alert_type(
        self, authenticated_client, project, user, alert_payload
    ):
        non_alert_task = Task.objects.create(
            summary="Budget Task",
            project=project,
            owner=user,
            type="budget",
        )
        url = reverse("alerting:alert-task-list-create")
        payload = {**alert_payload, "task": non_alert_task.id}
        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "task" in response.data

    def test_create_alert_task_duplicate_fails(
        self, authenticated_client, task, alert_payload
    ):
        AlertTask.objects.create(
            task=task,
            alert_type="delivery_issue",
            severity="low",
        )
        url = reverse("alerting:alert-task-list-create")
        response = authenticated_client.post(url, alert_payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "task" in response.data

    def test_create_alert_task_requires_severity(
        self, authenticated_client, alert_payload
    ):
        url = reverse("alerting:alert-task-list-create")
        payload = {**alert_payload}
        payload.pop("severity", None)
        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "severity" in response.data

    def test_create_alert_task_invalid_severity_rejected(
        self, authenticated_client, alert_payload
    ):
        url = reverse("alerting:alert-task-list-create")
        payload = {**alert_payload, "severity": "urgent"}
        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "severity" in response.data

    def test_create_alert_task_invalid_status_rejected(
        self, authenticated_client, alert_payload
    ):
        url = reverse("alerting:alert-task-list-create")
        payload = {**alert_payload, "status": "blocked"}
        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "status" in response.data

    def test_create_alert_task_invalid_alert_type_rejected(
        self, authenticated_client, alert_payload
    ):
        url = reverse("alerting:alert-task-list-create")
        payload = {**alert_payload, "alert_type": "unknown_type"}
        response = authenticated_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "alert_type" in response.data

    def test_create_alert_task_requires_project_membership(
        self, api_client, other_user, alert_payload
    ):
        api_client.force_authenticate(user=other_user)
        url = reverse("alerting:alert-task-list-create")
        response = api_client.post(url, alert_payload, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_assigned_to_requires_membership(
        self, authenticated_client, task, other_user
    ):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="policy_violation",
            severity="medium",
        )
        url = reverse("alerting:alert-task-detail", kwargs={"id": alert_task.id})
        response = authenticated_client.patch(
            url, {"assigned_to": other_user.id}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "assigned_to" in response.data

    def test_update_acknowledged_by_requires_membership(
        self, authenticated_client, task, other_user
    ):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="policy_violation",
            severity="medium",
        )
        url = reverse("alerting:alert-task-detail", kwargs={"id": alert_task.id})
        response = authenticated_client.patch(
            url, {"acknowledged_by": other_user.id}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "acknowledged_by" in response.data

    def test_update_alert_task_invalid_status_rejected(
        self, authenticated_client, task
    ):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="policy_violation",
            severity="medium",
        )
        url = reverse("alerting:alert-task-detail", kwargs={"id": alert_task.id})
        response = authenticated_client.patch(
            url, {"status": "blocked"}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "status" in response.data

    def test_update_alert_task_invalid_severity_rejected(
        self, authenticated_client, task
    ):
        alert_task = AlertTask.objects.create(
            task=task,
            alert_type="policy_violation",
            severity="medium",
        )
        url = reverse("alerting:alert-task-detail", kwargs={"id": alert_task.id})
        response = authenticated_client.patch(
            url, {"severity": "urgent"}, format="json"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "severity" in response.data

    def test_list_alert_tasks_scoped_to_membership(
        self, authenticated_client, organization, other_user, task
    ):
        other_project = Project.objects.create(
            name="Other Project",
            organization=organization,
            owner=other_user,
        )
        ProjectMember.objects.create(
            user=other_user, project=other_project, is_active=True
        )
        other_task = Task.objects.create(
            summary="Other Alert Task",
            project=other_project,
            owner=other_user,
            type="alert",
        )
        AlertTask.objects.create(
            task=task,
            alert_type="delivery_issue",
            severity="low",
        )
        AlertTask.objects.create(
            task=other_task,
            alert_type="performance_drop",
            severity="high",
        )

        url = reverse("alerting:alert-task-list-create")
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        alert_tasks = self._extract_results(response)
        assert len(alert_tasks) == 1

    def test_list_alert_tasks_filters_by_status(self, authenticated_client, task):
        other_task = Task.objects.create(
            summary="Alert Task 2",
            project=task.project,
            owner=task.owner,
            type="alert",
        )
        AlertTask.objects.create(
            task=task,
            alert_type="delivery_issue",
            severity="low",
            status="open",
        )
        AlertTask.objects.create(
            task=other_task,
            alert_type="performance_drop",
            severity="high",
            status="resolved",
        )

        url = reverse("alerting:alert-task-list-create")
        response = authenticated_client.get(url, {"status": "resolved"})

        assert response.status_code == status.HTTP_200_OK
        alert_tasks = self._extract_results(response)
        assert len(alert_tasks) == 1
        assert alert_tasks[0]["status"] == "resolved"

    def test_list_alert_tasks_filters_by_task_id(self, authenticated_client, task):
        other_task = Task.objects.create(
            summary="Alert Task 2",
            project=task.project,
            owner=task.owner,
            type="alert",
        )
        AlertTask.objects.create(
            task=task,
            alert_type="delivery_issue",
            severity="low",
        )
        AlertTask.objects.create(
            task=other_task,
            alert_type="performance_drop",
            severity="high",
        )

        url = reverse("alerting:alert-task-list-create")
        response = authenticated_client.get(url, {"task_id": task.id})

        assert response.status_code == status.HTTP_200_OK
        alert_tasks = self._extract_results(response)
        assert len(alert_tasks) == 1
        assert alert_tasks[0]["task"] == task.id
