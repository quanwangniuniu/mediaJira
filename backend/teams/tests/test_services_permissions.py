from django.test import TestCase
from teams.services import (
    create_team, add_member, user_can_modify_team, user_is_org_admin, is_same_organization
)
from core.models import TeamRole, Organization, CustomUser

class TestTeamPermissions(TestCase):
    def setUp(self):
        """Set up test data"""
        self.org1 = Organization.objects.create(name="Test Organization 1")
        self.org2 = Organization.objects.create(name="Test Organization 2")
        self.user = CustomUser.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            organization=self.org1  # Set user's organization
        )
    
    def test_user_can_modify_team_leader(self):
        team = create_team(name="T1", organization_id=self.org1.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.LEADER)
        self.assertTrue(user_can_modify_team(self.user.id, team.id))

    def test_user_can_modify_team_not_leader(self):
        team = create_team(name="T2", organization_id=self.org1.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        self.assertFalse(user_can_modify_team(self.user.id, team.id))

    def test_user_is_org_admin_false(self):
        # Placeholder always returns False
        self.assertFalse(user_is_org_admin(self.user.id, self.org1.id))

    def test_is_same_organization_true(self):
        team = create_team(name="T3", organization_id=self.org1.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        self.assertTrue(is_same_organization(self.user.id, team.id))

    def test_is_same_organization_false(self):
        team1 = create_team(name="T4", organization_id=self.org1.id)
        team2 = create_team(name="T5", organization_id=self.org2.id)
        add_member(team1.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        self.assertFalse(is_same_organization(self.user.id, team2.id))

