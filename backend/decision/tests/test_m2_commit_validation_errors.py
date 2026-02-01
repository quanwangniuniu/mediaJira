import pytest
from rest_framework.test import APIClient

from core.models import Organization, Project, ProjectMember
from decision.models import CommitRecord, Decision, DecisionStateTransition
from django.contrib.auth import get_user_model


User = get_user_model()


def _create_user_with_project():
    organization = Organization.objects.create(
        name="Test Org",
        email_domain="test.com",
    )
    user = User.objects.create_user(
        email="user@test.com",
        username="testuser",
        password="password123",
        organization=organization,
    )
    project = Project.objects.create(
        name="Test Project",
        organization=organization,
        owner=user,
        objectives=["awareness"],
        kpis={"ctr": {"target": 0.02}},
    )
    ProjectMember.objects.create(
        user=user,
        project=project,
        role="member",
        is_active=True,
    )
    return user, project


def _client_for(user, project):
    client = APIClient()
    client.force_authenticate(user=user)
    client.credentials(HTTP_X_PROJECT_ID=str(project.id))
    return client


def _base_commit_ready_payload():
    return {
        "contextSummary": "Context summary for commit",
        "reasoning": "Reasoning for commit",
        "riskLevel": "LOW",
        "confidenceScore": 4,
        "signals": [
            {
                "metric": "ROAS",
                "movement": "SHARP_DECREASE",
                "period": "LAST_7_DAYS",
                "comparison": "PREVIOUS_PERIOD",
            }
        ],
        "options": [
            {
                "text": "Option A",
                "isSelected": True,
                "order": 1,
            },
            {
                "text": "Option B",
                "isSelected": False,
                "order": 2,
            },
        ],
    }


def _assert_has_error_details(response_data):
    if isinstance(response_data, dict):
        if "error" in response_data:
            return
        if "detail" in response_data:
            return
        if "fieldErrors" in response_data:
            return
        if "details" in response_data:
            return
    raise AssertionError("Expected validation error details in response payload.")


@pytest.mark.django_db
@pytest.mark.parametrize(
    "scenario",
    [
        "missing_required_fields",
        "empty_signals",
        "options_less_than_two",
        "invalid_selected_option_none",
        "invalid_selected_option_multiple",
    ],
)
def test_commit_invalid_payload_returns_400_without_side_effects(scenario):
    """Assert commit validation failures return 400 and do not change state or create side effects."""
    user, project = _create_user_with_project()
    client = _client_for(user, project)

    create_resp = client.post("/api/decisions/drafts/", {"title": "Invalid Commit"}, format="json")
    assert create_resp.status_code == 201
    decision_id = Decision.objects.get(title="Invalid Commit").id

    payload = _base_commit_ready_payload()
    if scenario == "missing_required_fields":
        payload.pop("contextSummary")
        payload.pop("reasoning")
    elif scenario == "empty_signals":
        payload["signals"] = []
    elif scenario == "options_less_than_two":
        payload["options"] = [
            {
                "text": "Only option",
                "isSelected": True,
                "order": 1,
            }
        ]
    elif scenario == "invalid_selected_option_none":
        payload["options"][0]["isSelected"] = False
    elif scenario == "invalid_selected_option_multiple":
        payload["options"][1]["isSelected"] = True

    patch_resp = client.patch(
        f"/api/decisions/drafts/{decision_id}/",
        payload,
        format="json",
    )
    assert patch_resp.status_code == 200

    commit_resp = client.post(f"/api/decisions/{decision_id}/commit/", {}, format="json")
    assert commit_resp.status_code == 400
    _assert_has_error_details(commit_resp.data)

    decision = Decision.objects.get(pk=decision_id)
    assert decision.status == Decision.Status.DRAFT
    assert CommitRecord.objects.filter(decision=decision).count() == 0
    assert DecisionStateTransition.objects.filter(decision=decision).count() == 0
