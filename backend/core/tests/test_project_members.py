"""
MODULE 5 — Project Members Tests

Tests for:
- ProjectMemberViewSet
"""
import pytest
from django.urls import reverse
from rest_framework import status
from core.models import Project, ProjectMember, ProjectInvitation


@pytest.mark.django_db
class TestProjectMemberViewSet:
    """Tests for ProjectMemberViewSet"""

    def test_list_members_returns_correct_list(self, authenticated_client, project, user, user2, organization):
        """List members should return all active members"""
        # Add user2 as member
        ProjectMember.objects.create(
            user=user2,
            project=project,
            role='member',
            is_active=True
        )

        url = reverse('project-member-list', kwargs={'project_id': project.id})

        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        members = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        assert len(members) == 2  # user (owner) + user2 (member)

        member_ids = [m['user']['id'] for m in members]
        assert user.id in member_ids
        assert user2.id in member_ids

    def test_list_members_excludes_inactive(self, authenticated_client, project, user2):
        """List members should exclude inactive members"""
        # Add user2 as inactive member
        membership = ProjectMember.objects.create(
            user=user2,
            project=project,
            role='member',
            is_active=False
        )

        url = reverse('project-member-list', kwargs={'project_id': project.id})

        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        members = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        member_ids = [m['user']['id'] for m in members]
        assert user2.id not in member_ids

    def test_list_members_requires_project_access(self, authenticated_client, user, organization):
        """Listing members requires project membership"""
        # Create project user is not a member of
        other_project = Project.objects.create(
            name="Other Project",
            organization=organization,
            owner=user,
            objectives=["awareness"],
            kpis={"ctr": {"target": 0.02}}
        )
        # Don't create membership

        url = reverse('project-member-list', kwargs={'project_id': other_project.id})

        response = authenticated_client.get(url)

        # Should return empty list (queryset is filtered)
        assert response.status_code == status.HTTP_200_OK
        # Handle paginated response
        members = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        assert len(members) == 0

    def test_invite_existing_user(self, authenticated_client, project, user2):
        """Inviting existing user should create a pending invitation"""
        url = reverse('project-member-list', kwargs={'project_id': project.id})
        payload = {
            "email": user2.email,
            "role": "member"
        }

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert ProjectInvitation.objects.filter(
            email=user2.email,
            project=project,
            accepted=False
        ).exists()
        assert not ProjectMember.objects.filter(
            user=user2,
            project=project,
        ).exists()

    def test_invite_existing_user_with_role(self, authenticated_client, project, user2):
        """Inviting user with specific role should set invitation role"""
        url = reverse('project-member-list', kwargs={'project_id': project.id})
        payload = {
            "email": user2.email,
            "role": "viewer"
        }

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        invitation = ProjectInvitation.objects.get(email=user2.email, project=project, accepted=False)
        assert invitation.role == 'viewer'

    def test_cannot_invite_non_existent_user(self, authenticated_client, project):
        """Inviting non-existent user should create invitation"""
        url = reverse('project-member-list', kwargs={'project_id': project.id})
        payload = {
            "email": "nonexistent@test.com",
            "role": "member"
        }

        response = authenticated_client.post(url, payload, format='json')

        # Should create invitation (not fail)
        assert response.status_code == status.HTTP_201_CREATED
        assert 'invitation' in response.data or 'user_exists' in response.data

    def test_cannot_invite_already_member(self, authenticated_client, project, user2):
        """Inviting user who is already a member should fail"""
        # Add user2 as member
        ProjectMember.objects.create(
            user=user2,
            project=project,
            role='member',
            is_active=True
        )

        url = reverse('project-member-list', kwargs={'project_id': project.id})
        payload = {
            "email": user2.email,
            "role": "member"
        }

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

    def test_cannot_remove_owner(self, authenticated_client, project, user):
        """Cannot remove project owner"""
        # Get owner membership
        owner_membership = ProjectMember.objects.get(user=user, project=project, role='owner')

        url = reverse('project-member-detail', kwargs={
            'project_id': project.id,
            'pk': owner_membership.id
        })

        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

        # Membership should still be active
        owner_membership.refresh_from_db()
        assert owner_membership.is_active is True

    def test_remove_member_sets_is_active_false(self, authenticated_client, project, user2):
        """Removing member should set is_active=False"""
        # Add user2 as member
        membership = ProjectMember.objects.create(
            user=user2,
            project=project,
            role='member',
            is_active=True
        )

        url = reverse('project-member-detail', kwargs={
            'project_id': project.id,
            'pk': membership.id
        })

        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Membership should be deactivated, not deleted
        membership.refresh_from_db()
        assert membership.is_active is False

    def test_remove_member_requires_ownership(self, authenticated_client, project, user2, organization):
        """Removing member requires project ownership"""
        # Add user2 as member
        membership = ProjectMember.objects.create(
            user=user2,
            project=project,
            role='member',
            is_active=True
        )

        # Add user2 as project member (not owner)
        # Authenticate as user2
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user2)

        # Try to remove another member (should fail)
        other_membership = ProjectMember.objects.get(user=user2, project=project)
        url = reverse('project-member-detail', kwargs={
            'project_id': project.id,
            'pk': other_membership.id
        })

        response = client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invite_requires_permission(self, authenticated_client, project, user2, organization):
        """Inviting members requires owner role"""
        # Create viewer user
        viewer = type(user2).objects.create_user(
            username='viewer',
            email='viewer@test.com',
            password='testpass123',
            organization=organization
        )
        ProjectMember.objects.create(
            user=viewer,
            project=project,
            role='viewer',
            is_active=True
        )

        # Authenticate as viewer
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=viewer)

        url = reverse('project-member-list', kwargs={'project_id': project.id})
        payload = {
            "email": user2.email,
            "role": "member"
        }

        response = client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_member_cannot_invite(self, authenticated_client, project, user2, member_membership):
        """Project members cannot invite"""
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user2)

        url = reverse('project-member-list', kwargs={'project_id': project.id})
        payload = {
            "email": "newmember@test.com",
            "role": "member"
        }

        response = client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_invite_owner_role_rejected(self, authenticated_client, project, user2):
        """Inviting with owner role should be rejected"""
        url = reverse('project-member-list', kwargs={'project_id': project.id})
        payload = {
            "email": user2.email,
            "role": "owner"
        }

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_member_role(self, authenticated_client, project, user2):
        """Updating member role should work"""
        # Add user2 as member
        membership = ProjectMember.objects.create(
            user=user2,
            project=project,
            role='member',
            is_active=True
        )

        url = reverse('project-member-detail', kwargs={
            'project_id': project.id,
            'pk': membership.id
        })
        payload = {"role": "viewer"}

        response = authenticated_client.patch(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK
        membership.refresh_from_db()
        assert membership.role == 'viewer'

    def test_transfer_owner_updates_project_owner(self, authenticated_client, project, user, user2):
        """Promoting a member to owner should transfer project ownership."""
        membership = ProjectMember.objects.create(
            user=user2,
            project=project,
            role='Team Leader',
            is_active=True,
        )

        url = reverse('project-member-detail', kwargs={
            'project_id': project.id,
            'pk': membership.id,
        })
        payload = {"role": "owner"}

        response = authenticated_client.patch(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        membership.refresh_from_db()

        assert project.owner == user2
        assert membership.role == 'owner'

        previous_owner_membership = ProjectMember.objects.get(
            user=user,
            project=project,
        )
        assert previous_owner_membership.role == 'Team Leader'

    def test_demote_owner_requires_transfer(self, authenticated_client, project, user):
        """Demoting the current owner should be rejected."""
        owner_membership = ProjectMember.objects.get(
            user=user,
            project=project,
            role='owner',
        )

        url = reverse('project-member-detail', kwargs={
            'project_id': project.id,
            'pk': owner_membership.id,
        })
        payload = {"role": "Team Leader"}

        response = authenticated_client.patch(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        project.refresh_from_db()
        owner_membership.refresh_from_db()

        assert project.owner == user
        assert owner_membership.role == 'owner'
