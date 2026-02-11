import pytest
from rest_framework.test import APIClient

from core.models import Organization, Project, ProjectMember
from decision.models import Decision, Signal
from django.contrib.auth import get_user_model


User = get_user_model()


def _create_user(email, organization):
    return User.objects.create_user(
        email=email,
        username=email.split('@')[0],
        password="password123",
        organization=organization,
        is_verified=True,
        is_active=True,
        password_set=True,
    )


def _create_project(organization, owner, name="Project"):
    return Project.objects.create(
        name=name,
        organization=organization,
        owner=owner,
        objectives=["awareness"],
        kpis={"ctr": {"target": 0.02}},
    )


def _client_for(user, project=None, include_project_header=True):
    client = APIClient()
    client.force_authenticate(user=user)
    if include_project_header and project:
        client.credentials(HTTP_X_PROJECT_ID=str(project.id))
    return client


def _signal_payload(**overrides):
    payload = {
        "metric": "ROAS",
        "movement": "SHARP_DECREASE",
        "period": "LAST_7_DAYS",
        "comparison": "PREVIOUS_PERIOD",
    }
    payload.update(overrides)
    return payload


@pytest.mark.django_db
def test_creator_can_create_signal_in_draft():
    organization = Organization.objects.create(name="Org", email_domain="test.com")
    creator = _create_user("creator@test.com", organization)
    project = _create_project(organization, creator)
    ProjectMember.objects.create(user=creator, project=project, role="member", is_active=True)

    decision = Decision.objects.create(
        title="Draft",
        status=Decision.Status.DRAFT,
        author=creator,
        project=project,
        project_seq=1,
    )

    client = _client_for(creator, project)
    resp = client.post(f"/api/decisions/{decision.id}/signals/", _signal_payload(), format="json")
    assert resp.status_code == 201
    assert resp.data["metric"] == "ROAS"
    assert resp.data["displayText"]


@pytest.mark.django_db
def test_non_creator_cannot_write_signal():
    organization = Organization.objects.create(name="Org", email_domain="test.com")
    creator = _create_user("creator@test.com", organization)
    peer = _create_user("peer@test.com", organization)
    project = _create_project(organization, creator)
    ProjectMember.objects.create(user=creator, project=project, role="member", is_active=True)
    ProjectMember.objects.create(user=peer, project=project, role="member", is_active=True)

    decision = Decision.objects.create(
        title="Draft",
        status=Decision.Status.DRAFT,
        author=creator,
        project=project,
        project_seq=1,
    )

    client = _client_for(peer, project)
    resp = client.post(f"/api/decisions/{decision.id}/signals/", _signal_payload(), format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_cannot_write_signal_when_not_draft():
    organization = Organization.objects.create(name="Org", email_domain="test.com")
    creator = _create_user("creator@test.com", organization)
    project = _create_project(organization, creator)
    ProjectMember.objects.create(user=creator, project=project, role="member", is_active=True)

    decision = Decision.objects.create(
        title="Committed",
        status=Decision.Status.COMMITTED,
        author=creator,
        project=project,
        project_seq=1,
    )

    client = _client_for(creator, project)
    resp = client.post(f"/api/decisions/{decision.id}/signals/", _signal_payload(), format="json")
    assert resp.status_code == 409


@pytest.mark.django_db
def test_max_15_signals_enforced():
    organization = Organization.objects.create(name="Org", email_domain="test.com")
    creator = _create_user("creator@test.com", organization)
    project = _create_project(organization, creator)
    ProjectMember.objects.create(user=creator, project=project, role="member", is_active=True)

    decision = Decision.objects.create(
        title="Draft",
        status=Decision.Status.DRAFT,
        author=creator,
        project=project,
        project_seq=1,
    )

    client = _client_for(creator, project)
    for idx in range(15):
        resp = client.post(
            f"/api/decisions/{decision.id}/signals/",
            _signal_payload(metric="ROAS"),
            format="json",
        )
        assert resp.status_code == 201

    resp = client.post(
        f"/api/decisions/{decision.id}/signals/",
        _signal_payload(metric="ROAS"),
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_channel_scope_requires_scope_value():
    organization = Organization.objects.create(name="Org", email_domain="test.com")
    creator = _create_user("creator@test.com", organization)
    project = _create_project(organization, creator)
    ProjectMember.objects.create(user=creator, project=project, role="member", is_active=True)

    decision = Decision.objects.create(
        title="Draft",
        status=Decision.Status.DRAFT,
        author=creator,
        project=project,
        project_seq=1,
    )

    client = _client_for(creator, project)
    resp = client.post(
        f"/api/decisions/{decision.id}/signals/",
        _signal_payload(scopeType="CHANNEL"),
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_display_text_override_freeze_behavior():
    organization = Organization.objects.create(name="Org", email_domain="test.com")
    creator = _create_user("creator@test.com", organization)
    project = _create_project(organization, creator)
    ProjectMember.objects.create(user=creator, project=project, role="member", is_active=True)

    decision = Decision.objects.create(
        title="Draft",
        status=Decision.Status.DRAFT,
        author=creator,
        project=project,
        project_seq=1,
    )

    client = _client_for(creator, project)
    create_resp = client.post(
        f"/api/decisions/{decision.id}/signals/",
        _signal_payload(displayTextOverride="Manual override"),
        format="json",
    )
    assert create_resp.status_code == 201
    assert create_resp.data["displayText"] == "Manual override"

    signal_id = create_resp.data["id"]
    update_resp = client.patch(
        f"/api/decisions/{decision.id}/signals/{signal_id}/",
        {"metric": "CPA", "movement": "MODERATE_INCREASE"},
        format="json",
    )
    assert update_resp.status_code == 200
    assert update_resp.data["displayText"] == "Manual override"

    clear_resp = client.patch(
        f"/api/decisions/{decision.id}/signals/{signal_id}/",
        {"displayTextOverride": ""},
        format="json",
    )
    assert clear_resp.status_code == 200
    assert clear_resp.data["displayText"] != "Manual override"
