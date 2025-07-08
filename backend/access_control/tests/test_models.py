from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta

from access_control.models import Organization, Team, Role, Permission, RolePermission, UserRole

class ModelConstraintTest(TestCase):
    def test_permission_unique(self):
        # (module, action) must be unique
        Permission.objects.create(module="ASSET", action="VIEW")
        with self.assertRaises(IntegrityError):
            Permission.objects.create(module="ASSET", action="VIEW")

    def test_rolepermission_unique(self):
        org = Organization.objects.create(name="OrgX")
        perm = Permission.objects.create(module="CAMPAIGN", action="EDIT")
        role = Role.objects.create(organization=org, name="Editor", level=1)
        RolePermission.objects.create(role=role, permission=perm)
        with self.assertRaises(IntegrityError):
            RolePermission.objects.create(role=role, permission=perm)

    def test_userrole_unique_with_team(self):
        User = get_user_model()
        user = User.objects.create_user(username="u1", password="pw")
        org  = Organization.objects.create(name="OrgY")
        role = Role.objects.create(organization=org, name="Member", level=1)
        team = Team.objects.create(organization=org, name="TeamA")
        UserRole.objects.create(user=user, role=role, team=team, valid_from=timezone.now())
        with self.assertRaises(IntegrityError):
            UserRole.objects.create(user=user, role=role, team=team, valid_from=timezone.now())

    def test_userrole_nullable_team_allows_multiple(self):
        User = get_user_model()
        user = User.objects.create_user(username="u2", password="pw")
        org  = Organization.objects.create(name="OrgZ")
        role = Role.objects.create(organization=org, name="Analyst", level=1)

        # first record without valid_to
        UserRole.objects.create(user=user, role=role, team=None, valid_from=timezone.now())

        # second record with a different valid_to
        UserRole.objects.create(
            user=user,
            role=role,
            team=None,
            valid_from=timezone.now(),
            valid_to=timezone.now() + timedelta(days=1)
        )
