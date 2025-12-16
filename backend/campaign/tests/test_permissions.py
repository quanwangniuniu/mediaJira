"""
Tests for campaign permissions
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from django.test import RequestFactory
from rest_framework.test import APIClient
from rest_framework import status
from faker import Faker

from campaign.permissions import CampaignPermission, has_media_buyer_role
from campaign.models import CampaignTask, Channel, CampaignTaskStatus
from core.models import Organization, Permission
from access_control.models import Role, UserRole, RolePermission

fake = Faker()


@pytest.mark.django_db
class TestHasMediaBuyerRole:
    """Test has_media_buyer_role function"""
    
    def test_has_media_buyer_role_with_specialist(self, organization, user):
        """Test user with Specialist Media Buyer role"""
        role = Role.objects.create(
            name='Specialist Media Buyer',
            organization=organization,
            level=5
        )
        UserRole.objects.create(
            user=user,
            role=role,
            valid_to=None
        )
        
        result = has_media_buyer_role(user, organization)
        assert result is True
    
    def test_has_media_buyer_role_with_senior(self, organization, user):
        """Test user with Senior Media Buyer role"""
        role = Role.objects.create(
            name='Senior Media Buyer',
            organization=organization,
            level=6
        )
        UserRole.objects.create(
            user=user,
            role=role,
            valid_to=None
        )
        
        result = has_media_buyer_role(user, organization)
        assert result is True
    
    def test_has_media_buyer_role_without_role(self, organization, user):
        """Test user without Media Buyer role"""
        role = Role.objects.create(
            name='Other Role',
            organization=organization,
            level=3
        )
        UserRole.objects.create(
            user=user,
            role=role,
            valid_to=None
        )
        
        result = has_media_buyer_role(user, organization)
        assert result is False
    
    def test_has_media_buyer_role_with_team_id(self, organization, user, team):
        """Test has_media_buyer_role with team_id filter"""
        role = Role.objects.create(
            name='Specialist Media Buyer',
            organization=organization,
            level=5
        )
        UserRole.objects.create(
            user=user,
            role=role,
            team=team,
            valid_to=None
        )
        
        result = has_media_buyer_role(user, organization, team_id=team.id)
        assert result is True
        
        # Test with wrong team_id
        other_team = team
        result = has_media_buyer_role(user, organization, team_id=999)
        assert result is False
    
    def test_has_media_buyer_role_unauthenticated(self, organization):
        """Test has_media_buyer_role with unauthenticated user"""
        from django.contrib.auth.models import AnonymousUser
        anonymous_user = AnonymousUser()
        
        result = has_media_buyer_role(anonymous_user, organization)
        assert result is False
    
    def test_has_media_buyer_role_no_organization(self, user):
        """Test has_media_buyer_role without organization"""
        result = has_media_buyer_role(user, None)
        assert result is False


@pytest.mark.django_db
class TestCampaignPermission:
    """Test CampaignPermission class"""
    
    @pytest.fixture
    def permission(self):
        """Create CampaignPermission instance"""
        return CampaignPermission()
    
    @pytest.fixture
    def factory(self):
        """Create RequestFactory"""
        return RequestFactory()
    
    @pytest.fixture
    def mock_view(self):
        """Create mock view"""
        view = Mock()
        view.action = None
        return view
    
    @pytest.fixture
    def campaign_permission(self):
        """Create CAMPAIGN permissions"""
        from core.models import Permission
        return [
            Permission.objects.create(module='CAMPAIGN', action='VIEW'),
            Permission.objects.create(module='CAMPAIGN', action='EDIT'),
            Permission.objects.create(module='CAMPAIGN', action='DELETE'),
        ]
    
    @pytest.fixture
    def media_buyer_role(self, organization, campaign_permission):
        """Create Media Buyer role with permissions"""
        role = Role.objects.create(
            name='Specialist Media Buyer',
            organization=organization,
            level=5
        )
        for perm in campaign_permission:
            RolePermission.objects.create(role=role, permission=perm)
        return role
    
    def test_has_permission_superuser(self, permission, factory, mock_view, user):
        """Test superuser bypasses permission checks"""
        user.is_superuser = True
        request = factory.get('/api/campaigns/tasks/')
        request.user = user
        
        with patch('campaign.permissions.require_user_context', return_value=True):
            result = permission.has_permission(request, mock_view)
            assert result is True
    
    def test_has_permission_none_request(self, permission, mock_view):
        """Test has_permission with None request"""
        result = permission.has_permission(None, mock_view)
        assert result is False
    
    def test_has_permission_none_view(self, permission, factory, user):
        """Test has_permission with None view"""
        request = factory.get('/api/campaigns/tasks/')
        request.user = user
        
        result = permission.has_permission(request, None)
        assert result is False
    
    @patch('campaign.permissions.require_user_context')
    @patch('campaign.permissions.has_rbac_permission')
    def test_has_permission_list_action(self, mock_rbac, mock_require, permission, factory, mock_view, user, organization):
        """Test has_permission for list action"""
        mock_require.return_value = True
        mock_rbac.return_value = True
        
        user.organization = organization
        request = factory.get('/api/campaigns/tasks/')
        request.user = user
        request.headers = {}
        mock_view.action = 'list'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_permission(request, mock_view)
            assert result is True
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.require_user_context')
    @patch('campaign.permissions.has_rbac_permission')
    def test_has_permission_create_action(self, mock_rbac, mock_require, permission, factory, mock_view, user, organization):
        """Test has_permission for create action"""
        mock_require.return_value = True
        mock_rbac.return_value = True
        
        user.organization = organization
        request = factory.post('/api/campaigns/tasks/')
        request.user = user
        request.headers = {}
        mock_view.action = 'create'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_permission(request, mock_view)
            assert result is True
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.require_user_context')
    @patch('campaign.permissions.has_rbac_permission')
    @patch('campaign.permissions.has_media_buyer_role')
    def test_has_permission_launch_action(self, mock_media_buyer, mock_rbac, mock_require, permission, factory, mock_view, user, organization):
        """Test has_permission for launch action"""
        mock_require.return_value = True
        mock_media_buyer.return_value = True
        mock_rbac.return_value = True
        
        user.organization = organization
        request = factory.post('/api/campaigns/tasks/123/launch/')
        request.user = user
        request.headers = {}
        request.path = '/api/campaigns/tasks/123/launch/'
        mock_view.action = 'launch'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_permission(request, mock_view)
            assert result is True
            mock_media_buyer.assert_called_once()
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.require_user_context')
    @patch('campaign.permissions.has_rbac_permission')
    @patch('campaign.permissions.has_media_buyer_role')
    def test_has_permission_pause_action(self, mock_media_buyer, mock_rbac, mock_require, permission, factory, mock_view, user, organization):
        """Test has_permission for pause action"""
        mock_require.return_value = True
        mock_media_buyer.return_value = True
        mock_rbac.return_value = True
        
        user.organization = organization
        request = factory.patch('/api/campaigns/tasks/123/pause/')
        request.user = user
        request.headers = {}
        request.path = '/api/campaigns/tasks/123/pause/'
        mock_view.action = 'pause'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_permission(request, mock_view)
            assert result is True
            mock_media_buyer.assert_called_once()
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.require_user_context')
    def test_has_permission_no_user_context(self, mock_require, permission, factory, mock_view, user):
        """Test has_permission when user context is missing"""
        mock_require.return_value = False
        
        request = factory.get('/api/campaigns/tasks/')
        request.user = user
        
        result = permission.has_permission(request, mock_view)
        assert result is False
    
    def test_has_permission_no_organization(self, permission, factory, mock_view, user):
        """Test has_permission when user has no organization"""
        request = factory.get('/api/campaigns/tasks/')
        request.user = user
        user.organization = None
        
        with patch('campaign.permissions.require_user_context', return_value=True):
            result = permission.has_permission(request, mock_view)
            assert result is False
    
    def test_has_object_permission_superuser(self, permission, factory, mock_view, user, campaign_task_scheduled):
        """Test superuser bypasses object permission checks"""
        user.is_superuser = True
        request = factory.get(f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/')
        request.user = user
        
        result = permission.has_object_permission(request, mock_view, campaign_task_scheduled)
        assert result is True
    
    def test_has_object_permission_none_request(self, permission, mock_view, campaign_task_scheduled):
        """Test has_object_permission with None request"""
        result = permission.has_object_permission(None, mock_view, campaign_task_scheduled)
        assert result is False
    
    def test_has_object_permission_none_view(self, permission, factory, user, campaign_task_scheduled):
        """Test has_object_permission with None view"""
        request = factory.get(f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/')
        request.user = user
        
        result = permission.has_object_permission(request, None, campaign_task_scheduled)
        assert result is False
    
    def test_has_object_permission_none_obj(self, permission, factory, mock_view, user):
        """Test has_object_permission with None object"""
        request = factory.get('/api/campaigns/tasks/123/')
        request.user = user
        
        result = permission.has_object_permission(request, mock_view, None)
        assert result is False
    
    @patch('campaign.permissions.has_rbac_permission')
    @patch('campaign.permissions.has_media_buyer_role')
    def test_has_object_permission_launch_path(self, mock_media_buyer, mock_rbac, permission, factory, mock_view, user, campaign_task_scheduled, organization):
        """Test has_object_permission for launch path"""
        mock_media_buyer.return_value = True
        mock_rbac.return_value = True
        
        user.organization = organization
        campaign_task_scheduled.created_by.organization = organization
        request = factory.post(f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/launch/')
        request.user = user
        request.headers = {}
        request.path = f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/launch/'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_object_permission(request, mock_view, campaign_task_scheduled)
            assert result is True
            mock_media_buyer.assert_called_once()
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.has_rbac_permission')
    def test_has_object_permission_owner_retrieve(self, mock_rbac, permission, factory, mock_view, user, organization):
        """Test has_object_permission for owner retrieving their own campaign"""
        mock_rbac.return_value = True
        
        user.organization = organization
        campaign_task = CampaignTask.objects.create(
            title=fake.sentence(nb_words=4),
            scheduled_date=fake.future_datetime(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=[],
            audience_config={'type': 'google', 'common': {}},
            created_by=user,
            status=CampaignTaskStatus.SCHEDULED
        )
        
        request = factory.get(f'/api/campaigns/tasks/{campaign_task.campaign_task_id}/')
        request.user = user
        request.headers = {}
        mock_view.action = 'retrieve'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_object_permission(request, mock_view, campaign_task)
            assert result is True
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.has_rbac_permission')
    def test_has_object_permission_retrieve(self, mock_rbac, permission, factory, mock_view, user, campaign_task_scheduled, organization):
        """Test has_object_permission for retrieve action"""
        mock_rbac.return_value = True
        
        user.organization = organization
        request = factory.get(f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/')
        request.user = user
        request.headers = {}
        mock_view.action = 'retrieve'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_object_permission(request, mock_view, campaign_task_scheduled)
            assert result is True
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.has_rbac_permission')
    def test_has_object_permission_update(self, mock_rbac, permission, factory, mock_view, user, campaign_task_scheduled, organization):
        """Test has_object_permission for update action"""
        mock_rbac.return_value = True
        
        user.organization = organization
        request = factory.put(f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/')
        request.user = user
        request.headers = {}
        mock_view.action = 'update'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_object_permission(request, mock_view, campaign_task_scheduled)
            assert result is True
            mock_rbac.assert_called_once()
    
    @patch('campaign.permissions.has_rbac_permission')
    def test_has_object_permission_delete(self, mock_rbac, permission, factory, mock_view, user, campaign_task_scheduled, organization):
        """Test has_object_permission for delete action"""
        mock_rbac.return_value = True
        
        user.organization = organization
        request = factory.delete(f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/')
        request.user = user
        request.headers = {}
        mock_view.action = 'destroy'
        
        with patch('campaign.permissions.user_has_team', return_value=False):
            result = permission.has_object_permission(request, mock_view, campaign_task_scheduled)
            assert result is True
            mock_rbac.assert_called_once()
    
    def test_has_object_permission_no_organization(self, permission, factory, mock_view, user, campaign_task_scheduled):
        """Test has_object_permission when object has no organization"""
        user.organization = None
        campaign_task_scheduled.created_by.organization = None
        
        request = factory.get(f'/api/campaigns/tasks/{campaign_task_scheduled.campaign_task_id}/')
        request.user = user
        request.headers = {}
        
        result = permission.has_object_permission(request, mock_view, campaign_task_scheduled)
        assert result is False

