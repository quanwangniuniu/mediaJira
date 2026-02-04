import pytest
from rest_framework.test import APIClient

from core.models import Organization, Project, ProjectMember
from decision.models import Decision, DecisionEdge
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
def test_create_draft_with_parents_creates_edges():
    organization = Organization.objects.create(name="Test Org", email_domain="test.com")
    user = _make_user("creator@test.com", organization)
    project = _create_project(organization, user, "Project A")
    ProjectMember.objects.create(user=user, project=project, role="member", is_active=True)

    parent_a = Decision.objects.create(
        title="Parent A",
        status=Decision.Status.DRAFT,
        author=user,
        project=project,
        project_seq=1,
    )
    parent_b = Decision.objects.create(
        title="Parent B",
        status=Decision.Status.DRAFT,
        author=user,
        project=project,
        project_seq=2,
    )

    client = _client_for(user)
    resp = client.post(
        f"/api/decisions/drafts/?project_id={project.id}",
        {"title": "Child", "parentDecisionIds": [parent_a.id, parent_b.id]},
        format="json",
    )
    assert resp.status_code == 201
    child_id = resp.data["id"]

    edges = DecisionEdge.objects.filter(to_decision_id=child_id)
    edge_parents = {edge.from_decision_id for edge in edges}
    assert edge_parents == {parent_a.id, parent_b.id}


@pytest.mark.django_db
def test_cross_project_parent_rejected():
    organization = Organization.objects.create(name="Test Org", email_domain="test.com")
    user = _make_user("creator@test.com", organization)

    project_a = _create_project(organization, user, "Project A")
    project_b = _create_project(organization, user, "Project B")
    ProjectMember.objects.create(user=user, project=project_a, role="member", is_active=True)
    ProjectMember.objects.create(user=user, project=project_b, role="member", is_active=True)

    parent_b = Decision.objects.create(
        title="Parent B",
        status=Decision.Status.DRAFT,
        author=user,
        project=project_b,
        project_seq=1,
    )

    client = _client_for(user)
    resp = client.post(
        f"/api/decisions/drafts/?project_id={project_a.id}",
        {"title": "Child", "parentDecisionIds": [parent_b.id]},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_duplicate_parent_ids_rejected():
    organization = Organization.objects.create(name="Test Org", email_domain="test.com")
    user = _make_user("creator@test.com", organization)
    project = _create_project(organization, user, "Project A")
    ProjectMember.objects.create(user=user, project=project, role="member", is_active=True)

    parent = Decision.objects.create(
        title="Parent",
        status=Decision.Status.DRAFT,
        author=user,
        project=project,
        project_seq=1,
    )

    client = _client_for(user)
    resp = client.post(
        f"/api/decisions/drafts/?project_id={project.id}",
        {"title": "Child", "parentDecisionIds": [parent.id, parent.id]},
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_cycle_rejected_on_parent_update():
    organization = Organization.objects.create(name="Test Org", email_domain="test.com")
    user = _make_user("creator@test.com", organization)
    project = _create_project(organization, user, "Project A")
    ProjectMember.objects.create(user=user, project=project, role="member", is_active=True)

    decision_a = Decision.objects.create(
        title="A",
        status=Decision.Status.DRAFT,
        author=user,
        project=project,
        project_seq=1,
    )
    decision_b = Decision.objects.create(
        title="B",
        status=Decision.Status.DRAFT,
        author=user,
        project=project,
        project_seq=2,
    )
    decision_c = Decision.objects.create(
        title="C",
        status=Decision.Status.DRAFT,
        author=user,
        project=project,
        project_seq=3,
    )

    client = _client_for(user)
    resp_ab = client.patch(
        f"/api/decisions/drafts/{decision_b.id}/?project_id={project.id}",
        {"parentDecisionIds": [decision_a.id]},
        format="json",
    )
    assert resp_ab.status_code == 200

    resp_bc = client.patch(
        f"/api/decisions/drafts/{decision_c.id}/?project_id={project.id}",
        {"parentDecisionIds": [decision_b.id]},
        format="json",
    )
    assert resp_bc.status_code == 200

    resp_ca = client.patch(
        f"/api/decisions/drafts/{decision_a.id}/?project_id={project.id}",
        {"parentDecisionIds": [decision_c.id]},
        format="json",
    )
    assert resp_ca.status_code == 400


@pytest.mark.django_db
def test_graph_endpoint_returns_nodes_and_edges():
    organization = Organization.objects.create(name="Test Org", email_domain="test.com")
    user = _make_user("creator@test.com", organization)
    project = _create_project(organization, user, "Project A")
    ProjectMember.objects.create(user=user, project=project, role="member", is_active=True)

    decision_a = Decision.objects.create(
        title="A",
        status=Decision.Status.COMMITTED,
        author=user,
        project=project,
        project_seq=1,
    )
    decision_b = Decision.objects.create(
        title="B",
        status=Decision.Status.DRAFT,
        author=user,
        project=project,
        project_seq=2,
    )

    DecisionEdge.objects.create(from_decision=decision_a, to_decision=decision_b, created_by=user)

    client = _client_for(user)
    resp = client.get(f"/api/core/projects/{project.id}/decisions/graph/")
    assert resp.status_code == 200
    node_ids = {node["id"] for node in resp.data["nodes"]}
    assert decision_a.id in node_ids
    assert decision_b.id in node_ids
    edges = resp.data["edges"]
    assert {"from": decision_a.id, "to": decision_b.id} in edges
