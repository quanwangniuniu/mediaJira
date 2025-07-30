from django.core.exceptions import ValidationError
from core.models import Team, TeamMember, Organization, CustomUser
from teams.services import (
    create_team, add_member, remove_member, assign_leader, change_member_role,
    is_team_member, is_team_leader, get_team_leader, get_team_members
)
from core.models import TeamRole
from django.test import TestCase

class TestTeamMembership(TestCase):
    def setUp(self):
        """Set up test data"""
        self.org = Organization.objects.create(name="Test Organization")
        self.user = CustomUser.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
    
    def test_add_member_success(self):
        from teams.services import create_team, add_member
        from core.models import TeamRole
        team = create_team(name="T1", organization_id=self.org.id)
        member = add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        self.assertEqual(member.team.id, team.id)
        self.assertEqual(member.user.id, self.user.id)
        self.assertEqual(member.role_id, TeamRole.MEMBER)

    def test_add_member_duplicate(self):
        from teams.services import create_team, add_member
        from core.models import TeamRole
        from django.core.exceptions import ValidationError
        team = create_team(name="T2", organization_id=self.org.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        with self.assertRaises(ValidationError):
            add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)

    def test_remove_member_success(self):
        from teams.services import create_team, add_member, remove_member
        from core.models import TeamMember
        from core.models import TeamRole
        team = create_team(name="T3", organization_id=self.org.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        self.assertTrue(remove_member(team.id, self.user.id))
        self.assertEqual(TeamMember.objects.filter(team=team, user=self.user).count(), 0)

    def test_remove_member_not_found(self):
        from teams.services import create_team, remove_member
        from django.core.exceptions import ValidationError
        team = create_team(name="T4", organization_id=self.org.id)
        with self.assertRaises(ValidationError):
            remove_member(team.id, 99)

    def test_assign_leader_success(self):
        from teams.services import create_team, add_member, assign_leader, is_team_leader, get_team_leader
        from core.models import TeamRole
        team = create_team(name="T5", organization_id=self.org.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        leader = assign_leader(team.id, self.user.id)
        self.assertEqual(leader.role_id, TeamRole.LEADER)
        self.assertTrue(is_team_leader(self.user.id, team.id))
        self.assertEqual(get_team_leader(team.id).user.id, self.user.id)

    def test_assign_leader_creates_if_not_member(self):
        from teams.services import create_team, assign_leader, is_team_leader
        from core.models import TeamRole
        team = create_team(name="T6", organization_id=self.org.id)
        leader = assign_leader(team.id, self.user.id)
        self.assertEqual(leader.role_id, TeamRole.LEADER)
        self.assertTrue(is_team_leader(self.user.id, team.id))

    def test_change_member_role_success(self):
        from teams.services import create_team, add_member, change_member_role
        from core.models import TeamRole
        team = create_team(name="T7", organization_id=self.org.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        changed = change_member_role(team.id, self.user.id, TeamRole.LEADER)
        self.assertEqual(changed.role_id, TeamRole.LEADER)

    def test_change_member_role_invalid(self):
        from teams.services import create_team, change_member_role
        from core.models import TeamRole
        from django.core.exceptions import ValidationError
        team = create_team(name="T8", organization_id=self.org.id)
        with self.assertRaises(ValidationError):
            change_member_role(team.id, 99, TeamRole.LEADER)

    def test_is_team_member_and_leader(self):
        from teams.services import create_team, add_member, assign_leader, is_team_member, is_team_leader
        from core.models import TeamRole
        team = create_team(name="T9", organization_id=self.org.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        self.assertTrue(is_team_member(self.user.id, team.id))
        self.assertFalse(is_team_leader(self.user.id, team.id))
        assign_leader(team.id, self.user.id)
        self.assertTrue(is_team_leader(self.user.id, team.id))

    def test_get_team_members(self):
        from teams.services import create_team, add_member, get_team_members
        from core.models import TeamRole
        team = create_team(name="T10", organization_id=self.org.id)
        add_member(team.id, user_id=self.user.id, role_id=TeamRole.MEMBER)
        
        # Create another user for testing
        user2 = CustomUser.objects.create_user(
            username="testuser2",
            email="test2@example.com",
            password="testpass123"
        )
        add_member(team.id, user_id=user2.id, role_id=TeamRole.MEMBER)
        
        members = get_team_members(team.id)
        self.assertEqual(len(members), 2)

