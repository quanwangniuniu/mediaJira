"""
Project invitation approval/acceptance flow tests.
"""
from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.models import ProjectInvitation, ProjectMember


@pytest.mark.django_db
class TestProjectInvitations:
    def _invite_user(self, client, project, email, role="member"):
        url = reverse("project-member-list", kwargs={"project_id": project.id})
        payload = {"email": email, "role": role}
        return client.post(url, payload, format="json")

    def test_accept_requires_approval(self, authenticated_client, project, user2):
        """Invitation cannot be accepted before owner approval."""
        response = self._invite_user(authenticated_client, project, user2.email, "member")
        assert response.status_code == status.HTTP_201_CREATED

        invitation = ProjectInvitation.objects.get(email=user2.email, project=project, accepted=False)

        client = APIClient()
        client.force_authenticate(user=user2)
        accept_url = reverse("accept-invitation")
        accept_response = client.post(accept_url, {"token": invitation.token}, format="json")

        assert accept_response.status_code == status.HTTP_400_BAD_REQUEST
        assert not ProjectMember.objects.filter(user=user2, project=project).exists()

    def test_owner_can_approve_and_user_accepts(self, authenticated_client, project, user, user2):
        """Owner approves invitation, then user can accept and become member."""
        response = self._invite_user(authenticated_client, project, user2.email, "member")
        assert response.status_code == status.HTTP_201_CREATED

        invitation = ProjectInvitation.objects.get(email=user2.email, project=project, accepted=False)
        approve_url = reverse(
            "approve-project-invitation",
            kwargs={"project_id": project.id, "invitation_id": invitation.id},
        )
        approve_response = authenticated_client.post(approve_url)
        assert approve_response.status_code == status.HTTP_200_OK

        invitation.refresh_from_db()
        assert invitation.approved is True
        assert invitation.approved_by_id == user.id

        client = APIClient()
        client.force_authenticate(user=user2)

        pending_url = reverse("list-my-project-invitations")
        pending_response = client.get(pending_url, {"project_id": project.id})
        assert pending_response.status_code == status.HTTP_200_OK
        assert len(pending_response.data) == 1

        accept_url = reverse("accept-invitation")
        accept_response = client.post(accept_url, {"token": invitation.token}, format="json")
        assert accept_response.status_code == status.HTTP_200_OK

        assert ProjectMember.objects.filter(user=user2, project=project, role="member").exists()

        pending_response = client.get(pending_url, {"project_id": project.id})
        assert pending_response.status_code == status.HTTP_200_OK
        assert len(pending_response.data) == 0

    def test_non_owner_cannot_approve_or_reject(self, authenticated_client, project, user2, member_membership):
        """Non-owners cannot approve or reject invitations."""
        response = self._invite_user(authenticated_client, project, "pending@test.com", "member")
        assert response.status_code == status.HTTP_201_CREATED

        invitation = ProjectInvitation.objects.get(email="pending@test.com", project=project, accepted=False)

        client = APIClient()
        client.force_authenticate(user=user2)

        approve_url = reverse(
            "approve-project-invitation",
            kwargs={"project_id": project.id, "invitation_id": invitation.id},
        )
        reject_url = reverse(
            "reject-project-invitation",
            kwargs={"project_id": project.id, "invitation_id": invitation.id},
        )

        approve_response = client.post(approve_url)
        assert approve_response.status_code == status.HTTP_403_FORBIDDEN

        reject_response = client.delete(reject_url)
        assert reject_response.status_code == status.HTTP_403_FORBIDDEN

    def test_accept_with_existing_accepted_invitation(self, authenticated_client, project, user, user2):
        """Accepting a new invite should not fail if an accepted invite already exists."""
        ProjectInvitation.objects.create(
            email=user2.email,
            project=project,
            role="member",
            invited_by=user,
            token="old-accepted-token",
            expires_at=timezone.now() + timedelta(days=7),
            approved=True,
            approved_by=user,
            approved_at=timezone.now(),
            accepted=True,
            accepted_at=timezone.now(),
        )

        response = self._invite_user(authenticated_client, project, user2.email, "member")
        assert response.status_code == status.HTTP_201_CREATED

        invitation = ProjectInvitation.objects.get(email=user2.email, project=project, accepted=False)
        approve_url = reverse(
            "approve-project-invitation",
            kwargs={"project_id": project.id, "invitation_id": invitation.id},
        )
        approve_response = authenticated_client.post(approve_url)
        assert approve_response.status_code == status.HTTP_200_OK

        client = APIClient()
        client.force_authenticate(user=user2)
        accept_url = reverse("accept-invitation")
        accept_response = client.post(accept_url, {"token": invitation.token}, format="json")
        assert accept_response.status_code == status.HTTP_200_OK

        assert ProjectMember.objects.filter(user=user2, project=project, role="member").exists()
        assert ProjectInvitation.objects.filter(
            email=user2.email,
            project=project,
            accepted=True,
        ).count() == 1
