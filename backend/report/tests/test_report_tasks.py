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
from report.models import ReportTask, ReportTaskKeyAction


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
        url = reverse("report:report-list-create")
        payload = {
            "task": task.id,
            "audience_type": "client",
            "audience_details": "",
            "context": {
                "situation": "Last 7 days performance review",
                "what_changed": "",
            },
            "outcome_summary": "Improved CPA by 12%",
            "narrative_explanation": "",
        }

        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["audience_prompt_version"] == "client_v1"
        assert "prompt_template" in resp.data
        assert resp.data["prompt_template"]["version"] == "client_v1"
        assert "tone" in resp.data["prompt_template"]
        assert "section_prompts" in resp.data["prompt_template"]
        assert resp.data["key_actions"] == []

        report_id = resp.data["id"]
        detail_url = reverse("report:report-detail", kwargs={"id": report_id})
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
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        assert report_task.audience_prompt_version == "client_v1"

        url = reverse("report:report-detail", kwargs={"id": report_task.id})
        resp = authenticated_client.patch(url, {"audience_type": "manager"}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["audience_type"] == "manager"
        assert resp.data["audience_prompt_version"] == "client_v1"
        assert resp.data["prompt_template"]["version"] == "client_v1"

    def test_other_requires_audience_details(self, authenticated_client, task):
        url = reverse("report:report-list-create")
        payload = {
            "task": task.id,
            "audience_type": "other",
            "audience_details": "",
            "context": {
                "situation": "ctx",
                "what_changed": "",
            },
            "outcome_summary": "out",
        }

        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "audience_details" in resp.data


@pytest.mark.django_db
class TestReportKeyActionAPI:
    def test_list_key_actions_empty(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        url = reverse(
            "report:report-key-actions-list-create",
            kwargs={"id": report_task.id},
        )
        resp = authenticated_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_create_key_action(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        url = reverse(
            "report:report-key-actions-list-create",
            kwargs={"id": report_task.id},
        )
        payload = {"order_index": 1, "action_text": "Launched new creatives"}
        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["order_index"] == 1
        assert resp.data["action_text"] == "Launched new creatives"
        assert resp.data["report_task"] == report_task.id

    def test_retrieve_key_action(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        action = ReportTaskKeyAction.objects.create(
            report_task=report_task,
            order_index=1,
            action_text="Did something",
        )
        url = reverse(
            "report:report-key-action-detail",
            kwargs={"id": report_task.id, "action_id": action.id},
        )
        resp = authenticated_client.get(url)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["id"] == action.id
        assert resp.data["action_text"] == "Did something"

    def test_update_key_action(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        action = ReportTaskKeyAction.objects.create(
            report_task=report_task,
            order_index=1,
            action_text="Original text",
        )
        url = reverse(
            "report:report-key-action-detail",
            kwargs={"id": report_task.id, "action_id": action.id},
        )
        resp = authenticated_client.patch(
            url, {"action_text": "Updated text"}, format="json"
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["action_text"] == "Updated text"

    def test_delete_key_action(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        action = ReportTaskKeyAction.objects.create(
            report_task=report_task,
            order_index=1,
            action_text="To be deleted",
        )
        url = reverse(
            "report:report-key-action-detail",
            kwargs={"id": report_task.id, "action_id": action.id},
        )
        resp = authenticated_client.delete(url)
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not ReportTaskKeyAction.objects.filter(pk=action.id).exists()

    def test_create_key_action_duplicate_order_index_rejected(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        ReportTaskKeyAction.objects.create(
            report_task=report_task,
            order_index=1,
            action_text="First",
        )
        url = reverse(
            "report:report-key-actions-list-create",
            kwargs={"id": report_task.id},
        )
        payload = {"order_index": 1, "action_text": "Duplicate order"}
        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "order_index" in resp.data

    def test_create_key_action_max_6_rejected(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        for i in range(6):
            ReportTaskKeyAction.objects.create(
                report_task=report_task,
                order_index=i + 1,
                action_text=f"Action {i + 1}",
            )
        url = reverse(
            "report:report-key-actions-list-create",
            kwargs={"id": report_task.id},
        )
        payload = {"order_index": 1, "action_text": "Seventh"}
        resp = authenticated_client.post(url, payload, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_key_action_order_index_range(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        url = reverse(
            "report:report-key-actions-list-create",
            kwargs={"id": report_task.id},
        )
        resp = authenticated_client.post(
            url, {"order_index": 0, "action_text": "Invalid"}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        resp = authenticated_client.post(
            url, {"order_index": 7, "action_text": "Invalid"}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_key_action_blank_text_rejected(self, authenticated_client, task):
        report_task = ReportTask.objects.create(
            task=task,
            audience_type="client",
            context={"situation": "ctx", "what_changed": ""},
            outcome_summary="out",
        )
        url = reverse(
            "report:report-key-actions-list-create",
            kwargs={"id": report_task.id},
        )
        resp = authenticated_client.post(
            url, {"order_index": 1, "action_text": "   "}, format="json"
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
