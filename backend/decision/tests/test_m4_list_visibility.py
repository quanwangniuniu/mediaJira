import pytest
from rest_framework.test import APIClient

from core.models import Organization, Project, ProjectMember
from decision.models import Decision
from django.contrib.auth import get_user_model


User = get_user_model()


def _make_user(email, organization):
    return User.objects.create_user(
        email=email,
        username=email.split('@')[0],
        password="password123",
        organization=organization,
    )


def _client_for(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _create_project(organization, owner, name):
    return Project.objects.create(
        name=name,
        organization=organization,
        owner=owner,
        objectives=["awareness"],
        kpis={"ctr": {"target": 0.02}},
    )


@pytest.mark.django_db
def test_list_visibility_draft_creator_only_and_committed_visible():
    organization = Organization.objects.create(
        name="Test Org",
        email_domain="test.com",
    )
    creator = _make_user("creator@test.com", organization)
    peer = _make_user("peer@test.com", organization)

    project = _create_project(organization, creator, "Project A")
    ProjectMember.objects.create(user=creator, project=project, role="member", is_active=True)
    ProjectMember.objects.create(user=peer, project=project, role="member", is_active=True)

    draft = Decision.objects.create(
        title="Draft Only",
        status=Decision.Status.DRAFT,
        author=creator,
        project=project,
        project_seq=1,
    )
    committed = Decision.objects.create(
        title="Committed Visible",
        status=Decision.Status.COMMITTED,
        author=creator,
        project=project,
        project_seq=2,
    )

    creator_client = _client_for(creator)
    peer_client = _client_for(peer)

    creator_resp = creator_client.get("/api/decisions/")
    assert creator_resp.status_code == 200
    creator_ids = {item["id"] for item in creator_resp.data["items"]}
    assert draft.id in creator_ids
    assert committed.id in creator_ids

    peer_resp = peer_client.get("/api/decisions/")
    assert peer_resp.status_code == 200
    peer_ids = {item["id"] for item in peer_resp.data["items"]}
    assert draft.id not in peer_ids
    assert committed.id in peer_ids


@pytest.mark.django_db
def test_list_includes_multiple_projects_for_user():
    organization = Organization.objects.create(
        name="Test Org",
        email_domain="test.com",
    )
    user = _make_user("multi@test.com", organization)

    project_a = _create_project(organization, user, "Project A")
    project_b = _create_project(organization, user, "Project B")

    ProjectMember.objects.create(user=user, project=project_a, role="member", is_active=True)
    ProjectMember.objects.create(user=user, project=project_b, role="member", is_active=True)

    decision_a = Decision.objects.create(
        title="Decision A",
        status=Decision.Status.COMMITTED,
        author=user,
        project=project_a,
        project_seq=1,
    )
    decision_b = Decision.objects.create(
        title="Decision B",
        status=Decision.Status.REVIEWED,
        author=user,
        project=project_b,
        project_seq=1,
    )

    client = _client_for(user)
    resp = client.get("/api/decisions/")
    assert resp.status_code == 200
    ids = {item["id"] for item in resp.data["items"]}
    assert decision_a.id in ids
    assert decision_b.id in ids

    project_ids = {item.get("projectId") for item in resp.data["items"]}
    assert project_a.id in project_ids
    assert project_b.id in project_ids
