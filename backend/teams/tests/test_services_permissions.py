from django.test import TestCase
from teams.services import (
    create_team, add_member, user_can_modify_team, user_is_org_admin, is_same_organization
)
from teams.constants import TeamRole

class TestTeamPermissions(TestCase):
    def test_user_can_modify_team_leader(self):
        team = create_team(name="T1", organization_id=1)
        add_member(team.id, user_id=20, role_id=TeamRole.LEADER)
        self.assertTrue(user_can_modify_team(20, team.id))

    def test_user_can_modify_team_not_leader(self):
        team = create_team(name="T2", organization_id=1)
        add_member(team.id, user_id=21, role_id=TeamRole.MEMBER)
        self.assertFalse(user_can_modify_team(21, team.id))

    def test_user_is_org_admin_false(self):
        # Placeholder always returns False
        self.assertFalse(user_is_org_admin(22, 1))

    def test_is_same_organization_true(self):
        team = create_team(name="T3", organization_id=2)
        add_member(team.id, user_id=23, role_id=TeamRole.MEMBER)
        self.assertTrue(is_same_organization(23, team.id))

    def test_is_same_organization_false(self):
        team1 = create_team(name="T4", organization_id=3)
        team2 = create_team(name="T5", organization_id=4)
        add_member(team1.id, user_id=24, role_id=TeamRole.MEMBER)
        self.assertFalse(is_same_organization(24, team2.id))

