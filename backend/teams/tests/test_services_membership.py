import pytest
from django.core.exceptions import ValidationError
from teams.models import Team, TeamMember
from teams.services import (
    create_team, add_member, remove_member, assign_leader, change_member_role,
    is_team_member, is_team_leader, get_team_leader, get_team_members
)
from teams.constants import TeamRole
from django.test import TestCase

class TestTeamMembership(TestCase):
    def test_add_member_success(self):
        from teams.services import create_team, add_member
        from teams.constants import TeamRole
        team = create_team(name="T1", organization_id=1)
        member = add_member(team.id, user_id=10, role_id=TeamRole.MEMBER)
        self.assertEqual(member.team_id, team.id)
        self.assertEqual(member.user_id, 10)
        self.assertEqual(member.role_id, TeamRole.MEMBER)

    def test_add_member_duplicate(self):
        from teams.services import create_team, add_member
        from teams.constants import TeamRole
        from django.core.exceptions import ValidationError
        team = create_team(name="T2", organization_id=1)
        add_member(team.id, user_id=11, role_id=TeamRole.MEMBER)
        with self.assertRaises(ValidationError):
            add_member(team.id, user_id=11, role_id=TeamRole.MEMBER)

    def test_remove_member_success(self):
        from teams.services import create_team, add_member, remove_member
        from teams.models import TeamMember
        from teams.constants import TeamRole
        team = create_team(name="T3", organization_id=1)
        add_member(team.id, user_id=12, role_id=TeamRole.MEMBER)
        self.assertTrue(remove_member(team.id, 12))
        self.assertEqual(TeamMember.objects.filter(team_id=team.id, user_id=12).count(), 0)

    def test_remove_member_not_found(self):
        from teams.services import create_team, remove_member
        from django.core.exceptions import ValidationError
        team = create_team(name="T4", organization_id=1)
        with self.assertRaises(ValidationError):
            remove_member(team.id, 99)

    def test_assign_leader_success(self):
        from teams.services import create_team, add_member, assign_leader, is_team_leader, get_team_leader
        from teams.constants import TeamRole
        team = create_team(name="T5", organization_id=1)
        add_member(team.id, user_id=13, role_id=TeamRole.MEMBER)
        leader = assign_leader(team.id, 13)
        self.assertEqual(leader.role_id, TeamRole.LEADER)
        self.assertTrue(is_team_leader(13, team.id))
        self.assertEqual(get_team_leader(team.id).user_id, 13)

    def test_assign_leader_creates_if_not_member(self):
        from teams.services import create_team, assign_leader, is_team_leader
        from teams.constants import TeamRole
        team = create_team(name="T6", organization_id=1)
        leader = assign_leader(team.id, 14)
        self.assertEqual(leader.role_id, TeamRole.LEADER)
        self.assertTrue(is_team_leader(14, team.id))

    def test_change_member_role_success(self):
        from teams.services import create_team, add_member, change_member_role
        from teams.constants import TeamRole
        team = create_team(name="T7", organization_id=1)
        add_member(team.id, user_id=15, role_id=TeamRole.MEMBER)
        changed = change_member_role(team.id, 15, TeamRole.LEADER)
        self.assertEqual(changed.role_id, TeamRole.LEADER)

    def test_change_member_role_invalid(self):
        from teams.services import create_team, change_member_role
        from teams.constants import TeamRole
        from django.core.exceptions import ValidationError
        team = create_team(name="T8", organization_id=1)
        with self.assertRaises(ValidationError):
            change_member_role(team.id, 99, TeamRole.LEADER)

    def test_is_team_member_and_leader(self):
        from teams.services import create_team, add_member, assign_leader, is_team_member, is_team_leader
        from teams.constants import TeamRole
        team = create_team(name="T9", organization_id=1)
        add_member(team.id, user_id=16, role_id=TeamRole.MEMBER)
        self.assertTrue(is_team_member(16, team.id))
        self.assertFalse(is_team_leader(16, team.id))
        assign_leader(team.id, 16)
        self.assertTrue(is_team_leader(16, team.id))

    def test_get_team_members(self):
        from teams.services import create_team, add_member, get_team_members
        from teams.constants import TeamRole
        team = create_team(name="T10", organization_id=1)
        add_member(team.id, user_id=17, role_id=TeamRole.MEMBER)
        add_member(team.id, user_id=18, role_id=TeamRole.MEMBER)
        members = get_team_members(team.id)
        self.assertEqual(len(members), 2)

