from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.urls import path, set_urlconf
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta

from access_control.middleware.authorization import AuthorizationMiddleware

# A simple dummy view
def dummy_view(request, *args, **kwargs):
    return HttpResponse("OK")

# Temporary URLconf for tests
test_urlpatterns = [
    path('api/assets/list/',                    dummy_view, name='asset-list'),
    path('api/assets/<int:pk>/export/',         dummy_view, name='asset-export'),
    path('api/assets/<int:pk>/delete/',         dummy_view, name='asset-delete'),
    path('api/campaigns/create/',               dummy_view, name='campaign-create'),
    path('api/campaigns/<int:pk>/approve/',     dummy_view, name='campaign-approve'),
    path('api/campaigns/<int:pk>/edit/',        dummy_view, name='campaign-edit'),
]

class AuthorizationMiddlewareTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        from core.models import Organization, Role, Permission
        from access_control.models import RolePermission, UserRole

        # 1 org
        cls.org = Organization.objects.create(name="TestOrg")

        # 5 permissions
        cls.perm_view_asset    = Permission.objects.create(module="ASSET",    action="VIEW")
        cls.perm_export_asset  = Permission.objects.create(module="ASSET",    action="EXPORT")
        cls.perm_delete_asset  = Permission.objects.create(module="ASSET",    action="DELETE")
        cls.perm_edit_campaign = Permission.objects.create(module="CAMPAIGN", action="EDIT")
        cls.perm_approve_campaign = Permission.objects.create(module="CAMPAIGN", action="APPROVE")

        # 2 roles
        cls.role_asset_viewer = Role.objects.create(organization=cls.org, name="AssetViewer",      level=1)
        RolePermission.objects.create(role=cls.role_asset_viewer, permission=cls.perm_view_asset)

        cls.role_campaign_editor = Role.objects.create(organization=cls.org, name="CampaignEditor",   level=1)
        RolePermission.objects.create(role=cls.role_campaign_editor, permission=cls.perm_edit_campaign)

        cls.role_campaign_approver = Role.objects.create(organization=cls.org, name="CampaignApprover", level=2)
        RolePermission.objects.create(role=cls.role_campaign_approver, permission=cls.perm_approve_campaign)

        # user with only AssetViewer role
        User = get_user_model()
        cls.user = User.objects.create_user(username="bob", email="bob@example.com", password="pw")
        UserRole.objects.create(user=cls.user, role=cls.role_asset_viewer, valid_from=timezone.now())

        # factory & middleware
        cls.factory = RequestFactory()
        cls.middleware = AuthorizationMiddleware()

        # inject test urls
        set_urlconf(test_urlpatterns)

    def test_allows_asset_view(self):
        req = self.factory.get('/api/assets/list/')
        req.user = self.user
        self.assertIsNone(self.middleware.process_view(req, dummy_view, (), {}))

    def test_forbids_asset_export(self):
        req = self.factory.get('/api/assets/1/export/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_forbids_asset_delete(self):
        req = self.factory.delete('/api/assets/1/delete/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_forbids_campaign_edit(self):
        req = self.factory.post('/api/campaigns/create/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_allows_campaign_edit_with_role(self):
        from access_control.models import RolePermission, UserRole

        # give user the CampaignEditor role
        ur = UserRole.objects.create(user=self.user, role=self.role_campaign_editor, valid_from=timezone.now())
        req = self.factory.post('/api/campaigns/create/')
        req.user = self.user
        self.assertIsNone(self.middleware.process_view(req, dummy_view, (), {}))

    def test_forbids_campaign_approve(self):
        req = self.factory.put('/api/campaigns/1/approve/')
        req.user = self.user
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)

    def test_allows_campaign_approve_with_role(self):
        from access_control.models import RolePermission, UserRole

        # give user the CampaignApprover role
        UserRole.objects.create(user=self.user, role=self.role_campaign_approver, valid_from=timezone.now())
        req = self.factory.put('/api/campaigns/1/approve/')
        req.user = self.user
        self.assertIsNone(self.middleware.process_view(req, dummy_view, (), {}))

    def test_forbids_with_expired_role(self):
        from access_control.models import RolePermission, UserRole

        # create a second user who only ever gets the expired role
        User = get_user_model()
        user2 = User.objects.create_user(username="bob2", email="bob2@example.com", password="pw")
        past = timezone.now() - timedelta(days=1)
        UserRole.objects.create(
            user=user2,
            role=self.role_asset_viewer,
            valid_from=timezone.now() - timedelta(days=2),
            valid_to=past
        )

        req = self.factory.get('/api/assets/list/')
        req.user = user2
        resp = self.middleware.process_view(req, dummy_view, (), {})
        self.assertEqual(resp.status_code, 403)
        self.assertJSONEqual(resp.content, {'detail': 'Permission denied'})
