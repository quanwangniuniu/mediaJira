from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Organization, Project, ProjectMember

User = get_user_model()


class ProjectOnboardingAPITests(APITestCase):
    """Phase 5 coverage for onboarding-related endpoints."""

    def setUp(self):
        self.organization = Organization.objects.create(name="Test Organization")
        self.owner = User.objects.create_user(
            email="owner@example.com",
            username="owner",
            password="test-pass-123",
            organization=self.organization,
        )
        self.secondary_owner = User.objects.create_user(
            email="secondary@example.com",
            username="secondary",
            password="test-pass-123",
            organization=self.organization,
        )
        self.member_user = User.objects.create_user(
            email="member@example.com",
            username="member",
            password="test-pass-123",
            organization=self.organization,
        )
        self.client.force_authenticate(self.owner)

    # ----- Helpers ---------------------------------------------------------
    def _build_payload(self, **overrides):
        payload = {
            "name": "Launch Project",
            "description": "Test project created via onboarding wizard.",
            "project_type": ["paid_social"],
            "work_model": ["solo_buyer"],
            "advertising_platforms": ["meta"],
            "objectives": ["awareness", "consideration"],
            "kpis": {
                "ctr": {"target": 0.02, "suggested_by": ["awareness", "consideration"]},
                "reach": {"target": 100000},
            },
            "budget_management_type": "single_consolidated",
            "total_monthly_budget": "50000.00",
            "pacing_enabled": True,
            "target_regions": ["US"],
            "audience_targeting": {"geo_focus": "US"},
            "invite_members": [
                {
                    "email": self.member_user.email,
                    "role": "member",
                }
            ],
        }
        payload.update(overrides)
        return payload

    def _membership_url(self):
        return reverse("check-project-membership")

    def _onboarding_url(self):
        return reverse("project-onboarding")

    def _kpi_suggestions_url(self, objectives_query=""):
        base = reverse("kpi-suggestions")
        if objectives_query:
            return f"{base}?objectives={objectives_query}"
        return base

    # ----- Membership checks -----------------------------------------------
    def test_membership_check_without_projects(self):
        response = self.client.get(self._membership_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["has_project"])
        self.assertEqual(response.data["project_count"], 0)
        self.assertIsNone(response.data["active_project_id"])

    def test_membership_check_with_active_project(self):
        project = Project.objects.create(
            name="Existing Project",
            organization=self.organization,
            owner=self.owner,
            objectives=["awareness"],
            kpis={"ctr": {"target": 0.02}},
        )
        ProjectMember.objects.create(user=self.owner, project=project, role="owner")
        self.owner.active_project = project
        self.owner.save(update_fields=["active_project"])

        response = self.client.get(self._membership_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["has_project"])
        self.assertEqual(response.data["project_count"], 1)
        self.assertEqual(response.data["active_project_id"], project.id)

    # ----- Onboarding flow -------------------------------------------------
    def test_onboarding_creates_project_and_memberships(self):
        response = self.client.post(self._onboarding_url(), data=self._build_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(name="Launch Project")
        self.assertEqual(project.owner, self.owner)
        self.owner.refresh_from_db()
        self.assertEqual(self.owner.active_project, project)
        self.assertTrue(
            ProjectMember.objects.filter(user=self.owner, project=project, role="owner", is_active=True).exists()
        )
        self.assertTrue(
            ProjectMember.objects.filter(user=self.member_user, project=project, is_active=True).exists()
        )
        self.assertTrue(response.data["is_active"])

    def test_onboarding_allows_explicit_owner_selection(self):
        payload = self._build_payload(owner_id=self.secondary_owner.id, invite_members=[])
        response = self.client.post(self._onboarding_url(), data=payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        project = Project.objects.get(name="Launch Project")
        self.assertEqual(project.owner, self.secondary_owner)
        self.assertTrue(
            ProjectMember.objects.filter(user=self.secondary_owner, project=project, role="owner").exists()
        )
        self.assertTrue(
            ProjectMember.objects.filter(user=self.owner, project=project, role="owner").exists()
        )

    # TODO: The following two tests are commented out
    # Reason: objectives and kpis were refactored to be optional in commit 6903c29
    # Uncomment if strict validation is required in future
    # def test_onboarding_requires_at_least_one_objective(self):
    #     payload = self._build_payload(objectives=[])
    #     response = self.client.post(self._onboarding_url(), data=payload, format="json")

    #     self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    #     self.assertIn("objectives", response.data)

    # def test_onboarding_requires_kpi_configuration(self):
    #     payload = self._build_payload(kpis={})
    #     response = self.client.post(self._onboarding_url(), data=payload, format="json")

    #     self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    #     self.assertIn("kpis", response.data)

    # ----- KPI suggestions -------------------------------------------------
    def test_kpi_suggestions_require_objectives_param(self):
        response = self.client.get(self._kpi_suggestions_url())

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_kpi_suggestions_deduplicate_entries(self):
        response = self.client.get(self._kpi_suggestions_url("awareness,consideration"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], len(response.data["suggested_kpis"]))
        ctr_entry = next(item for item in response.data["suggested_kpis"] if item["key"] == "ctr")
        self.assertCountEqual(ctr_entry["suggested_by"], ["awareness", "consideration"])


