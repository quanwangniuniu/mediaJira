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

from core.models import Organization, Project, ProjectMember
from task.models import Task
from report.models import ReportTask


User = get_user_model()


@pytest.fixture
@pytest.mark.django_db
def api_client():
    return APIClient()


@pytest.fixture
@pytest.mark.django_db
def organization():
    return Organization.objects.create(
        name="Report Org",
        email_domain="report.org",
    )


@pytest.fixture
@pytest.mark.django_db
def user(organization):
    return User.objects.create_user(
        username="report_user",
        email="report@example.com",
        password="testpass123",
        organization=organization,
    )


@pytest.fixture
@pytest.mark.django_db
def project(organization, user):
    project = Project.objects.create(
        name="Report Project",
        organization=organization,
        owner=user,
    )
    ProjectMember.objects.create(user=user, project=project, is_active=True)
    return project


@pytest.fixture
@pytest.mark.django_db
def task(project, user):
    return Task.objects.create(
        summary="Report Task",
        project=project,
        owner=user,
        type="report",
    )


@pytest.fixture
@pytest.mark.django_db
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestReportTaskAPI:
    def test_create_report_task_pins_prompt_version_and_returns_template_inline(
        self, authenticated_client, task
    ):
        url = reverse("report:report-task-list-create")
        payload = {
            "task": task.id,
            "audience_type": "client",
            "audience_details": "",
            "context": "Last 7 days performance review",
            "outcome_summary": "Improved CPA by 12%",
            "narrative_explanation": "",
            "key_actions": ["Paused underperforming ad sets", "Refreshed creatives"],
        }

        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["audience_prompt_version"] == "client_v1"
        assert "prompt_template" in resp.data
        assert resp.data["prompt_template"]["version"] == "client_v1"
        assert "tone" in resp.data["prompt_template"]
        assert "section_prompts" in resp.data["prompt_template"]

        report_id = resp.data["id"]
        detail_url = reverse("report:report-task-detail", kwargs={"id": report_id})
        detail_resp = authenticated_client.get(detail_url)
        assert detail_resp.status_code == status.HTTP_200_OK
        assert detail_resp.data["audience_prompt_version"] == "client_v1"
        assert detail_resp.data["prompt_template"]["version"] == "client_v1"

    def test_update_audience_type_does_not_auto_change_prompt_version(
        self, authenticated_client, task
    ):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context="ctx",
            outcome_summary="out",
        )
        assert report_task.audience_prompt_version == "client_v1"

        url = reverse("report:report-task-detail", kwargs={"id": report_task.id})
        resp = authenticated_client.patch(url, {"audience_type": "manager"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["audience_type"] == "manager"
        assert resp.data["audience_prompt_version"] == "client_v1"
        assert resp.data["prompt_template"]["version"] == "client_v1"

    def test_other_requires_audience_details(self, authenticated_client, task):
        url = reverse("report:report-task-list-create")
        payload = {
            "task": task.id,
            "audience_type": "other",
            "audience_details": "",
            "context": "ctx",
            "outcome_summary": "out",
            "key_actions": ["Did a thing"],
        }

        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "audience_details" in resp.data

    def test_key_actions_max_6(self, authenticated_client, task):
        url = reverse("report:report-task-list-create")
        payload = {
            "task": task.id,
            "audience_type": "client",
            "audience_details": "",
            "context": "ctx",
            "outcome_summary": "out",
            "key_actions": [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
            ],
        }

        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "key_actions" in resp.data
