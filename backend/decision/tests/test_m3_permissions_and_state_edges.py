import pytest
from rest_framework.test import APIClient

from core.models import Organization, Project, ProjectMember
from decision.models import CommitRecord, Decision, DecisionStateTransition, Review
from django.contrib.auth import get_user_model


User = get_user_model()


def _create_user_with_project(role="member", is_active=True):
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
        role=role,
        is_active=is_active,
    )
    return user, project


def _client_for(user, project, include_project_header=True):
    client = APIClient()
    client.force_authenticate(user=user)
    if include_project_header:
        client.credentials(HTTP_X_PROJECT_ID=str(project.id))
    return client


def _commit_ready_payload():
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


def _create_committed_decision(client, title):
    create_resp = client.post("/api/decisions/drafts/", {"title": title}, format="json")
    assert create_resp.status_code == 201
    decision_id = Decision.objects.get(title=title).id
    patch_resp = client.patch(
        f"/api/decisions/drafts/{decision_id}/",
        _commit_ready_payload(),
        format="json",
    )
    assert patch_resp.status_code == 200
    commit_resp = client.post(f"/api/decisions/{decision_id}/commit/", {}, format="json")
    assert commit_resp.status_code == 200
    return decision_id


@pytest.mark.django_db
def test_missing_project_header_forbidden():
    """Assert missing x-project-id is forbidden and creates no side effects."""
    user, project = _create_user_with_project()
    client = _client_for(user, project, include_project_header=False)

    create_resp = client.post("/api/decisions/drafts/", {"title": "No Header"}, format="json")
    assert create_resp.status_code == 403
    assert Decision.objects.count() == 0
    assert CommitRecord.objects.count() == 0
    assert DecisionStateTransition.objects.count() == 0
    assert Review.objects.count() == 0


@pytest.mark.django_db
def test_inactive_membership_forbidden():
    """Assert inactive ProjectMember is forbidden and creates no side effects."""
    user, project = _create_user_with_project(is_active=False)
    client = _client_for(user, project)

    create_resp = client.post("/api/decisions/drafts/", {"title": "Inactive Member"}, format="json")
    assert create_resp.status_code == 403
    assert Decision.objects.count() == 0
    assert CommitRecord.objects.count() == 0
    assert DecisionStateTransition.objects.count() == 0
    assert Review.objects.count() == 0


@pytest.mark.django_db
def test_insufficient_role_for_commit_forbidden():
    """Assert commit is forbidden for roles above edit threshold."""
    owner, project = _create_user_with_project(role="owner")
    owner_client = _client_for(owner, project)
    decision_id = _create_committed_decision(owner_client, "Commit Permission Test")

    viewer = User.objects.create_user(
        email="viewer@test.com",
        username="viewer",
        password="password123",
        organization=project.organization,
    )
    ProjectMember.objects.create(
        user=viewer,
        project=project,
        role="viewer",
        is_active=True,
    )
    viewer_client = _client_for(viewer, project)

    draft = Decision.objects.create(
        title="Viewer Draft",
        author=viewer,
        project=project,
        project_seq=2,
    )
    draft_id = draft.id
    patch_resp = viewer_client.patch(
        f"/api/decisions/drafts/{draft_id}/",
        _commit_ready_payload(),
        format="json",
    )
    assert patch_resp.status_code == 403

    commit_resp = viewer_client.post(f"/api/decisions/{draft_id}/commit/", {}, format="json")
    assert commit_resp.status_code == 403
    decision = Decision.objects.get(pk=draft_id)
    assert decision.status == Decision.Status.DRAFT
    assert CommitRecord.objects.filter(decision=decision).count() == 0
    assert DecisionStateTransition.objects.filter(decision=decision).count() == 0


@pytest.mark.django_db
def test_insufficient_role_for_review_forbidden():
    """Assert review is forbidden for roles above review threshold."""
    owner, project = _create_user_with_project(role="owner")
    owner_client = _client_for(owner, project)
    decision_id = _create_committed_decision(owner_client, "Review Permission Test")

    reviewer = User.objects.create_user(
        email="designer@test.com",
        username="designer",
        password="password123",
        organization=project.organization,
    )
    ProjectMember.objects.create(
        user=reviewer,
        project=project,
        role="Designer",
        is_active=True,
    )
    reviewer_client = _client_for(reviewer, project)

    review_resp = reviewer_client.post(
        f"/api/decisions/{decision_id}/reviews/",
        {
            "outcomeText": "Outcome summary",
            "reflectionText": "Reflection summary",
            "decisionQuality": "GOOD",
        },
        format="json",
    )
    assert review_resp.status_code == 403
    decision = Decision.objects.get(pk=decision_id)
    assert decision.status == Decision.Status.COMMITTED
    assert Review.objects.filter(decision=decision).count() == 0
    assert DecisionStateTransition.objects.filter(decision=decision).count() == 1


def test_collect_smoke():
    """Collect smoke test so pytest picks up decision tests."""
    assert True
