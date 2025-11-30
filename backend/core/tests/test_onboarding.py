"""
MODULE 3 — Project Onboarding Wizard Tests

Tests for:
- ProjectOnboardingView
- ProjectOnboardingSerializer
"""
import pytest
from django.urls import reverse
from rest_framework import status
from core.models import Project, ProjectMember


@pytest.mark.django_db
class TestProjectOnboarding:
    """Tests for ProjectOnboardingView"""

    def _build_payload(self, **overrides):
        """Helper to build onboarding payload"""
        payload = {
            "name": "Test Project",
            "description": "Test project description",
            "project_type": ["paid_social"],
            "work_model": ["solo_buyer"],
            "advertising_platforms": ["meta"],
            "objectives": ["awareness", "consideration"],
            "kpis": {
                "ctr": {"target": 0.02, "suggested_by": ["awareness", "consideration"]},
                "reach": {"target": 100000, "suggested_by": ["awareness"]},
            },
            "budget_management_type": "single_consolidated",
            "total_monthly_budget": "50000.00",
            "pacing_enabled": True,
            "target_regions": ["US", "CA"],
            "audience_targeting": {"geo_focus": "US"},
        }
        payload.update(overrides)
        return payload

    def test_full_onboarding_success(self, authenticated_client, user, organization):
        """Full onboarding should create Project and ProjectMember"""
        url = reverse('project-onboarding')
        payload = self._build_payload()

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert Project.objects.filter(name="Test Project").exists()

        project = Project.objects.get(name="Test Project")
        assert project.owner == user
        assert project.organization == organization
        assert project.objectives == ["awareness", "consideration"]
        assert "ctr" in project.kpis
        assert "reach" in project.kpis

        # Check membership was created
        membership = ProjectMember.objects.get(user=user, project=project)
        assert membership.role == 'owner'
        assert membership.is_active is True

    def test_active_project_automatically_set(self, authenticated_client, user, organization):
        """Onboarding should automatically set active project"""
        url = reverse('project-onboarding')
        payload = self._build_payload()

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED

        user.refresh_from_db()
        project = Project.objects.get(name="Test Project")
        assert user.active_project == project
        assert response.data['is_active'] is True

    def test_objectives_validation_must_pick_at_least_one(self, authenticated_client, organization):
        """Onboarding requires at least one objective"""
        url = reverse('project-onboarding')
        payload = self._build_payload(objectives=[])

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'objectives' in response.data

    def test_objectives_validation_invalid_choice(self, authenticated_client, organization):
        """Invalid objective choice should be rejected"""
        url = reverse('project-onboarding')
        payload = self._build_payload(objectives=["invalid_objective"])

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'objectives' in response.data

    def test_kpis_validation_at_least_one_required(self, authenticated_client, organization):
        """Onboarding requires at least one KPI"""
        url = reverse('project-onboarding')
        payload = self._build_payload(kpis={})

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'kpis' in response.data

    def test_kpis_validation_correct_format(self, authenticated_client, organization):
        """KPIs must be in correct format"""
        url = reverse('project-onboarding')
        payload = self._build_payload(kpis={"ctr": "invalid_format"})  # Should be dict

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'kpis' in response.data

    def test_kpis_validation_target_must_be_numeric(self, authenticated_client, organization):
        """KPI target must be numeric"""
        url = reverse('project-onboarding')
        payload = self._build_payload(kpis={"ctr": {"target": "not_a_number"}})

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'kpis' in response.data

    def test_advertising_platforms_validation(self, authenticated_client, organization):
        """Invalid advertising platform should be rejected"""
        url = reverse('project-onboarding')
        payload = self._build_payload(advertising_platforms=["invalid_platform"])

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'advertising_platforms' in response.data

    def test_budget_validation_positive_value(self, authenticated_client, organization):
        """Budget must be positive if provided"""
        url = reverse('project-onboarding')
        payload = self._build_payload(total_monthly_budget="-1000.00")

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_audience_validation(self, authenticated_client, organization):
        """Target regions should be stored in audience_targeting"""
        url = reverse('project-onboarding')
        payload = self._build_payload(target_regions=["US", "CA", "UK"])

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        project = Project.objects.get(name="Test Project")
        assert "target_regions" in project.audience_targeting
        assert project.audience_targeting["target_regions"] == ["US", "CA", "UK"]

    def test_owner_override_behavior(self, authenticated_client, user, user2, organization):
        """Owner can be overridden if provided"""
        url = reverse('project-onboarding')
        payload = self._build_payload(owner_id=user2.id)

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        project = Project.objects.get(name="Test Project")
        assert project.owner == user2

        # Both users should have membership
        assert ProjectMember.objects.filter(user=user, project=project, role='owner').exists()
        assert ProjectMember.objects.filter(user=user2, project=project, role='owner').exists()

    def test_owner_override_same_organization_required(self, authenticated_client, user, organization):
        """Owner must be in same organization"""
        # Create user in different organization
        from core.models import Organization
        other_org = Organization.objects.create(name="Other Org")
        other_user = type(user).objects.create_user(
            username='otheruser',
            email='otheruser@test.com',
            password='testpass123',
            organization=other_org
        )

        url = reverse('project-onboarding')
        payload = self._build_payload(owner_id=other_user.id)

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data

    def test_invitation_logic_existing_users(self, authenticated_client, user, user2, organization):
        """Inviting existing users should create membership"""
        url = reverse('project-onboarding')
        payload = self._build_payload(
            invite_members=[
                {"email": user2.email, "role": "member"}
            ]
        )

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        project = Project.objects.get(name="Test Project")

        # Check membership was created for invited user
        membership = ProjectMember.objects.get(user=user2, project=project)
        assert membership.role == 'member'
        assert membership.is_active is True

    def test_invitation_logic_non_existent_user(self, authenticated_client, organization):
        """Inviting non-existent user should be skipped (logged but not fail)"""
        url = reverse('project-onboarding')
        payload = self._build_payload(
            invite_members=[
                {"email": "nonexistent@test.com", "role": "member"}
            ]
        )

        response = authenticated_client.post(url, payload, format='json')

        # Should still succeed (non-existent users are logged but don't fail onboarding)
        assert response.status_code == status.HTTP_201_CREATED
        project = Project.objects.get(name="Test Project")

        # Non-existent user should not have membership
        assert not ProjectMember.objects.filter(
            project=project,
            user__email="nonexistent@test.com"
        ).exists()

    def test_onboarding_with_minimal_data(self, authenticated_client, organization):
        """Onboarding should work with minimal required data"""
        url = reverse('project-onboarding')
        payload = {
            "name": "Minimal Project",
            "objectives": ["awareness"],
            "kpis": {"ctr": {"target": 0.02}},
        }

        response = authenticated_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert Project.objects.filter(name="Minimal Project").exists()

    def test_onboarding_without_organization_fails(self, authenticated_client, user_no_org):
        """User without organization cannot create project"""
        # Authenticate as user without org
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user_no_org)

        url = reverse('project-onboarding')
        payload = self._build_payload()

        response = client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'error' in response.data


