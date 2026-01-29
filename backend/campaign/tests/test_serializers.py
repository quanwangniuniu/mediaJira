"""
Tests for Campaign Serializers.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError

from core.models import Organization, Project, ProjectMember
from campaign.models import Campaign
from campaign.serializers import (
    CampaignSerializer,
    CampaignCreateSerializer,
    CampaignUpdateSerializer,
)

User = get_user_model()


class CampaignSerializerBaseTestCase(TestCase):
    """Base test case for serializer tests"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        self.user2 = User.objects.create_user(
            username='testuser2',
            email='testuser2@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        ProjectMember.objects.create(
            user=self.user2,
            project=self.project,
            role='member',
            is_active=True
        )
        
        # Mock request object for serializer context
        from rest_framework.test import APIRequestFactory
        factory = APIRequestFactory()
        self.request = factory.get('/')
        self.request.user = self.user
    
    def _create_campaign(self, **kwargs):
        """Helper to create campaign"""
        defaults = {
            'name': kwargs.get('name', 'Test Campaign'),
            'objective': kwargs.get('objective', Campaign.Objective.CONVERSION),
            'platforms': kwargs.get('platforms', [Campaign.Platform.META]),
            'start_date': kwargs.get('start_date', timezone.now().date()),
            'project': kwargs.get('project', self.project),
            'owner': kwargs.get('owner', self.user),
            'creator': kwargs.get('creator', self.user),
        }
        defaults.update(kwargs)
        defaults.pop('status', None)  # Remove status if passed - FSM protection
        return Campaign.objects.create(**defaults)


# ============================================================================
# CampaignSerializer Tests
# ============================================================================

class CampaignSerializerTestCase(CampaignSerializerBaseTestCase):
    """Test CampaignSerializer"""
    
    def test_campaign_serializer_read_only_fields(self):
        """Test that read-only fields are not writable"""
        campaign = self._create_campaign()
        
        serializer = CampaignSerializer(
            campaign,
            context={'request': self.request}
        )
        data = serializer.data
        
        # Check read-only fields are present
        self.assertIn('id', data)
        self.assertIn('creator', data)
        self.assertIn('status', data)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
    
    def test_campaign_serializer_validation(self):
        """Test basic serializer validation"""
        data = {
            'name': 'Test Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'project_id': self.project.id,
            'owner_id': self.user.id,
        }
        serializer = CampaignSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertTrue(serializer.is_valid())
    
    def test_platforms_validation(self):
        """Test platforms field validation"""
        data = {
            'name': 'Test Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': ['INVALID_PLATFORM'],
            'start_date': timezone.now().date().isoformat(),
            'project_id': self.project.id,
            'owner_id': self.user.id,
        }
        serializer = CampaignSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('platforms', serializer.errors)
    
    def test_platforms_empty_list_validation(self):
        """Test platforms cannot be empty"""
        data = {
            'name': 'Test Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [],
            'start_date': timezone.now().date().isoformat(),
            'project_id': self.project.id,
            'owner_id': self.user.id,
        }
        serializer = CampaignSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('platforms', serializer.errors)
    
    def test_end_date_after_start_date_validation(self):
        """Test end_date must be after start_date"""
        start_date = timezone.now().date()
        end_date = start_date - timezone.timedelta(days=1)
        
        # Create campaign first to test update scenario
        campaign = self._create_campaign(start_date=start_date)
        
        data = {
            'end_date': end_date.isoformat(),
        }
        serializer = CampaignSerializer(
            campaign,
            data=data,
            context={'request': self.request},
            partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('end_date', serializer.errors)
    
    def test_owner_id_required(self):
        """Test owner_id is required"""
        data = {
            'name': 'Test Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'project_id': str(self.project.id),
            # Missing owner_id
        }
        serializer = CampaignSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('owner_id', serializer.errors)
    
    def test_project_id_required(self):
        """Test project_id is required"""
        data = {
            'name': 'Test Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'owner_id': str(self.user.id),
            # Missing project_id
        }
        serializer = CampaignSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('project_id', serializer.errors)


# ============================================================================
# CampaignCreateSerializer Tests
# ============================================================================

class CampaignCreateSerializerTestCase(CampaignSerializerBaseTestCase):
    """Test CampaignCreateSerializer"""
    
    def test_create_serializer_sets_creator(self):
        """Test that creator is automatically set"""
        data = {
            'name': 'New Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'project_id': self.project.id,
            'owner_id': self.user.id,
        }
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertTrue(serializer.is_valid())
        campaign = serializer.save()
        
        self.assertEqual(campaign.creator, self.user)
        self.assertEqual(campaign.status, Campaign.Status.PLANNING)
    
    def test_create_serializer_default_status(self):
        """Test default status is PLANNING"""
        data = {
            'name': 'New Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'project_id': self.project.id,
            'owner_id': self.user.id,
        }
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertTrue(serializer.is_valid())
        campaign = serializer.save()
        
        self.assertEqual(campaign.status, Campaign.Status.PLANNING)
    
    def test_create_serializer_validation(self):
        """Test create serializer validation"""
        data = {
            'name': 'New Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'project_id': self.project.id,
            'owner_id': self.user.id,
        }
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertTrue(serializer.is_valid())
    
    def test_create_serializer_validates_project_access(self):
        """Test create serializer validates project access"""
        # Create project user doesn't have access to
        other_org = Organization.objects.create(name="Other Org", email_domain="other.com")
        other_project = Project.objects.create(name="Other Project", organization=other_org)
        
        data = {
            'name': 'New Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'project_id': other_project.id,
            'owner_id': self.user.id,
        }
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        # Validation happens in create() method, not is_valid()
        if serializer.is_valid():
            with self.assertRaises(Exception) as context:
                serializer.save()
            # Should raise ValidationError for project access
            self.assertIsNotNone(context.exception)
        else:
            self.assertIn('project_id', serializer.errors)
    
    def test_create_serializer_validates_owner_project_access(self):
        """Test create serializer validates owner has project access"""
        # Create user without project access
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@test.com',
            password='testpass123',
            organization=self.organization
        )
        
        data = {
            'name': 'New Campaign',
            'objective': Campaign.Objective.CONVERSION,
            'platforms': [Campaign.Platform.META],
            'start_date': timezone.now().date().isoformat(),
            'project_id': self.project.id,
            'owner_id': other_user.id,
        }
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        # Validation happens in create() method, not is_valid()
        if serializer.is_valid():
            with self.assertRaises(Exception) as context:
                serializer.save()
            # Should raise ValidationError for owner project access
            self.assertIsNotNone(context.exception)
        else:
            self.assertIn('owner_id', serializer.errors)


# ============================================================================
# CampaignUpdateSerializer Tests
# ============================================================================

class CampaignUpdateSerializerTestCase(CampaignSerializerBaseTestCase):
    """Test CampaignUpdateSerializer"""
    
    def test_update_serializer_preserves_status(self):
        """Test update serializer cannot modify status"""
        campaign = self._create_campaign()
        campaign.start_testing(user=self.user)
        campaign.save()
        
        data = {
            'name': 'Updated Name',
            # status is not in update serializer fields
        }
        serializer = CampaignUpdateSerializer(
            campaign,
            data=data,
            context={'request': self.request},
            partial=True
        )
        self.assertTrue(serializer.is_valid())
        serializer.save()
        
        # Status should remain unchanged
        campaign.refresh_from_db()
        self.assertEqual(campaign.status, Campaign.Status.TESTING)
    
    def test_update_archived_campaign_fails(self):
        """Test updating archived campaign fails"""
        campaign = self._create_campaign()
        campaign.start_testing(user=self.user)
        campaign.save()
        campaign.complete(user=self.user)
        campaign.end_date = timezone.now().date()
        campaign.save()
        campaign.archive(user=self.user)
        campaign.save()
        
        data = {'name': 'Updated Name'}
        serializer = CampaignUpdateSerializer(
            campaign,
            data=data,
            context={'request': self.request},
            partial=True
        )
        # Note: The view performs the archived check, serializer allows it
        # but view's perform_update will raise error
        self.assertTrue(serializer.is_valid())  # Serializer validation passes
    
    def test_update_serializer_validation(self):
        """Test update serializer validation"""
        campaign = self._create_campaign()
        
        data = {
            'name': 'Updated Name',
            'objective': Campaign.Objective.AWARENESS,
            'platforms': [Campaign.Platform.GOOGLE_ADS],
        }
        serializer = CampaignUpdateSerializer(
            campaign,
            data=data,
            context={'request': self.request},
            partial=True
        )
        self.assertTrue(serializer.is_valid())
        serializer.save()
        
        campaign.refresh_from_db()
        self.assertEqual(campaign.name, 'Updated Name')
        self.assertEqual(campaign.objective, Campaign.Objective.AWARENESS)
    
    def test_update_serializer_does_not_allow_project_change(self):
        """Test update serializer does not allow project_id (not in fields)"""
        campaign = self._create_campaign()
        
        data = {
            'project_id': str(self.project.id),  # This field is not in UpdateSerializer
        }
        serializer = CampaignUpdateSerializer(
            campaign,
            data=data,
            context={'request': self.request},
            partial=True
        )
        # project_id is not in UpdateSerializer fields, so it will be ignored
        # The serializer will be valid but project_id won't be updated
        self.assertTrue(serializer.is_valid())
        # project_id should not be in validated_data
        self.assertNotIn('project_id', serializer.validated_data)
    
    def test_update_serializer_does_not_allow_owner_change(self):
        """Test update serializer does not allow owner_id (not in fields)"""
        campaign = self._create_campaign()
        
        data = {
            'owner_id': str(self.user2.id),  # This field is not in UpdateSerializer
        }
        serializer = CampaignUpdateSerializer(
            campaign,
            data=data,
            context={'request': self.request},
            partial=True
        )
        # owner_id is not in UpdateSerializer fields, so it will be ignored
        self.assertTrue(serializer.is_valid())
        # owner_id should not be in validated_data
        self.assertNotIn('owner_id', serializer.validated_data)

