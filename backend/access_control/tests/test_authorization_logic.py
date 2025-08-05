from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.urls import path, set_urlconf
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from core.models import Organization, Role, Permission
from access_control.models import RolePermission, UserRole


from typing import Any

from access_control.middleware.authorization import AuthorizationMiddleware

def dummy_view(request, *args, **kwargs):
    return HttpResponse("OK")

# Temporary URL patterns for routing during tests
test_urlpatterns = [
    path('api/assets/list/',               dummy_view, name='asset-list'),
    path('api/assets/<int:pk>/export/',    dummy_view, name='asset-export'),
    path('api/assets/<int:pk>/delete/',    dummy_view, name='asset-delete'),
    path('api/campaigns/create/',          dummy_view, name='campaign-create'),
    path('api/campaigns/<int:pk>/approve/',dummy_view, name='campaign-approve'),
    path('api/campaigns/<int:pk>/edit/',   dummy_view, name='campaign-edit'),
]

class AuthorizationMiddlewareTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Inject our test URLs
        set_urlconf(test_urlpatterns)
        

        # 1 organization
        cls.org = Organization.objects.create(name="TestOrg")

        # 5 permissions
        cls.perm_view_asset      = Permission.objects.create(module="ASSET",    action="VIEW")
        cls.perm_export_asset    = Permission.objects.create(module="ASSET",    action="EXPORT")
        cls.perm_delete_asset    = Permission.objects.create(module="ASSET",    action="DELETE")
        cls.perm_edit_campaign   = Permission.objects.create(module="CAMPAIGN", action="EDIT")
        cls.perm_approve_campaign = Permission.objects.create(module="CAMPAIGN", action="APPROVE")

        # 3 roles
        cls.role_asset_viewer    = Role.objects.create(
            organization=cls.org, name="AssetViewer", level=1
        )
        RolePermission.objects.create(role=cls.role_asset_viewer, permission=cls.perm_view_asset)

        cls.role_campaign_editor = Role.objects.create(
            organization=cls.org, name="CampaignEditor", level=1
        )
        RolePermission.objects.create(role=cls.role_campaign_editor, permission=cls.perm_edit_campaign)

        cls.role_campaign_approver = Role.objects.create(
            organization=cls.org, name="CampaignApprover", level=2
        )
        RolePermission.objects.create(role=cls.role_campaign_approver, permission=cls.perm_approve_campaign)

        # test user with only an expired AssetViewer role
        User = get_user_model()
        cls.user = User.objects.create_user(username="bob", email="bob@example.com", password="pw")
        now = timezone.now()
        UserRole.objects.create(
            user=cls.user,
            role=cls.role_asset_viewer,
            valid_from=now - timedelta(days=2),
            valid_to=now - timedelta(days=1)
        )

        cls.factory = RequestFactory()
        cls.middleware = AuthorizationMiddleware()

    def test_expired_role_denied(self):
        req = self.factory.get('/api/assets/list/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_active_role_allows(self):
        from access_control.models import RolePermission, UserRole

        # add a fresh non-expired UserRole
        UserRole.objects.create(user=self.user, role=self.role_asset_viewer, valid_from=timezone.now())
        req = self.factory.get('/api/assets/list/')
        req.user = self.user
        self.assertIsNone(self.middleware.process_view(req, dummy_view, (), {}))

    def test_export_denied_for_view_only(self):
        req = self.factory.get('/api/assets/1/export/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_delete_denied_for_view_only(self):
        req = self.factory.delete('/api/assets/1/delete/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_forbids_campaign_edit_without_role(self):
        req = self.factory.post('/api/campaigns/create/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_allows_campaign_edit_with_role(self):
        from access_control.models import RolePermission, UserRole

        UserRole.objects.create(user=self.user, role=self.role_campaign_editor, valid_from=timezone.now())
        req = self.factory.post('/api/campaigns/create/')
        req.user = self.user
        self.assertIsNone(self.middleware.process_view(req, dummy_view, (), {}))

    def test_forbids_campaign_approve_without_role(self):
        req = self.factory.put('/api/campaigns/1/approve/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_allows_campaign_approve_with_role(self):
        from access_control.models import RolePermission, UserRole

        UserRole.objects.create(user=self.user, role=self.role_campaign_approver, valid_from=timezone.now())
        req = self.factory.put('/api/campaigns/1/approve/')
        req.user = self.user
        self.assertIsNone(self.middleware.process_view(req, dummy_view, (), {}))
        

class TeamPermissionDecoratorTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.org = Organization.objects.create(name="TestOrg")
        # Create users
        cls.org_admin = User.objects.create_user(username="orgadmin", email="orgadmin@test.com", password="pw", is_superuser=True)
        cls.team_leader = User.objects.create_user(username="leader", email="leader@test.com", password="pw")
        cls.team_member = User.objects.create_user(username="member", email="member@test.com", password="pw")
        cls.stranger = User.objects.create_user(username="stranger", email="stranger@test.com", password="pw")
        # Create team using core models
        from core.models import Team, TeamMember, TeamRole
        cls.team = Team.objects.create(name="Alpha", organization=cls.org)
        # Create TeamMember objects using user and team relationships
        TeamMember.objects.create(user=cls.team_leader, team=cls.team, role_id=TeamRole.LEADER)
        TeamMember.objects.create(user=cls.team_member, team=cls.team, role_id=TeamRole.MEMBER)
        # Dummy request factory
        cls.factory = RequestFactory()

    def dummy_team_view(self, request: Any, team_id: Any = None) -> HttpResponse:
        return HttpResponse(content=b"TEAM OK")

    def test_team_member_without_leader_permission_denied(self):
        from access_control.middleware.authorization import AuthorizationMiddleware
        decorator = AuthorizationMiddleware.team_permission_required(required_role="LEADER")
        view = decorator(self.dummy_team_view)
        req = self.factory.post('/api/teams/%d/edit/' % self.team.id)
        req.user = self.team_member
        resp = view(req, team_id=self.team.id)
        self.assertEqual(resp.status_code, 403)
        self.assertIn(b'must be team leader', resp.content)

    def test_team_leader_allows(self):
        from access_control.middleware.authorization import AuthorizationMiddleware
        decorator = AuthorizationMiddleware.team_permission_required(required_role="LEADER")
        view = decorator(self.dummy_team_view)
        req = self.factory.post('/api/teams/%d/edit/' % self.team.id)
        req.user = self.team_leader
        resp = view(req, team_id=self.team.id)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'TEAM OK', resp.content)

    def test_org_admin_override(self):
        from access_control.middleware.authorization import AuthorizationMiddleware
        decorator = AuthorizationMiddleware.team_permission_required(required_role="LEADER")
        view = decorator(self.dummy_team_view)
        req = self.factory.delete('/api/teams/%d/delete/' % self.team.id)
        req.user = self.org_admin
        resp = view(req, team_id=self.team.id)
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b'TEAM OK', resp.content)

    def test_non_member_gets_403(self):
        from access_control.middleware.authorization import AuthorizationMiddleware
        decorator = AuthorizationMiddleware.team_permission_required(required_role="LEADER")
        view = decorator(self.dummy_team_view)
        req = self.factory.patch('/api/teams/%d/edit/' % self.team.id)
        req.user = self.stranger
        resp = view(req, team_id=self.team.id)
        self.assertEqual(resp.status_code, 403)
        self.assertIn(b'not a team member', resp.content)

    def test_missing_team_id_400(self):
        from access_control.middleware.authorization import AuthorizationMiddleware
        decorator = AuthorizationMiddleware.team_permission_required(required_role="LEADER")
        view = decorator(self.dummy_team_view)
        req = self.factory.post('/api/teams//edit/')
        req.user = self.team_leader
        resp = view(req, team_id=None)
        self.assertEqual(resp.status_code, 400)
        self.assertIn(b'team_id required', resp.content)



