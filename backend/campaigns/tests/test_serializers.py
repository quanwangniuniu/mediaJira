from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APIRequestFactory
from rest_framework import status

from campaigns.models import (
    Campaign, CampaignAssignment, CampaignMetric, CampaignNote,
    CampaignStatus, CampaignType
)
from campaigns.serializers import (
    CampaignListSerializer, CampaignDetailSerializer, CampaignCreateSerializer,
    CampaignUpdateSerializer, CampaignStatusUpdateSerializer,
    CampaignAssignmentSerializer, CampaignMetricSerializer, CampaignNoteSerializer,
    CampaignMetricsSummarySerializer, UserSerializer
)


class UserSerializerTest(TestCase):
    """Test cases for UserSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.serializer = UserSerializer(instance=self.user)
    
    def test_user_serializer_fields(self):
        """Test UserSerializer includes correct fields"""
        data = self.serializer.data
        self.assertIn('id', data)
        self.assertIn('username', data)
        self.assertIn('email', data)
        self.assertIn('first_name', data)
        self.assertIn('last_name', data)
        self.assertIn('full_name', data)
    
    def test_full_name_calculation(self):
        """Test full_name field calculation"""
        data = self.serializer.data
        self.assertEqual(data['full_name'], 'Test User')
        
        # Test with empty names
        self.user.first_name = ''
        self.user.last_name = ''
        self.user.save()
        serializer = UserSerializer(instance=self.user)
        self.assertEqual(serializer.data['full_name'], 'testuser')


class CampaignListSerializerTest(TestCase):
    """Test cases for CampaignListSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            description='A test campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('10000.00'),
            spent_amount=Decimal('5000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        self.serializer = CampaignListSerializer(instance=self.campaign)
    
    def test_campaign_list_serializer_fields(self):
        """Test CampaignListSerializer includes correct fields"""
        data = self.serializer.data
        self.assertIn('id', data)
        self.assertIn('name', data)
        self.assertIn('description', data)
        self.assertIn('campaign_type', data)
        self.assertIn('campaign_type_display', data)
        self.assertIn('status', data)
        self.assertIn('status_display', data)
        self.assertIn('budget', data)
        self.assertIn('spent_amount', data)
        self.assertIn('budget_utilization', data)
        self.assertIn('start_date', data)
        self.assertIn('end_date', data)
        self.assertIn('duration_days', data)
        self.assertIn('owner', data)
        self.assertIn('team_member_count', data)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
        self.assertIn('is_active', data)
    
    def test_budget_utilization_calculation(self):
        """Test budget utilization calculation in serializer"""
        data = self.serializer.data
        self.assertEqual(data['budget_utilization'], 50.0)
    
    def test_duration_days_calculation(self):
        """Test duration days calculation in serializer"""
        data = self.serializer.data
        self.assertEqual(data['duration_days'], 29)  # 30 - 1 = 29 days
    
    def test_team_member_count(self):
        """Test team member count calculation"""
        data = self.serializer.data
        self.assertEqual(data['team_member_count'], 0)  # No team members assigned
        
        # Add a team member
        CampaignAssignment.objects.create(
            campaign=self.campaign,
            user=self.user,
            role='manager'
        )
        
        serializer = CampaignListSerializer(instance=self.campaign)
        data = serializer.data
        self.assertEqual(data['team_member_count'], 1)


class CampaignCreateSerializerTest(TestCase):
    """Test cases for CampaignCreateSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.factory = APIRequestFactory()
        self.request = self.factory.post('/')
        self.request.user = self.user
    
    def test_campaign_create_serializer_valid_data(self):
        """Test CampaignCreateSerializer with valid data"""
        data = {
            'name': 'New Campaign',
            'description': 'A new test campaign',
            'campaign_type': CampaignType.SOCIAL_MEDIA,
            'budget': '15000.00',
            'start_date': (timezone.now() + timedelta(days=1)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=30)).isoformat(),
            'tags': ['test', 'social']
        }
        
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        
        self.assertTrue(serializer.is_valid())
        campaign = serializer.save()
        
        self.assertEqual(campaign.name, 'New Campaign')
        self.assertEqual(campaign.owner, self.user)
        self.assertEqual(campaign.budget, Decimal('15000.00'))
        self.assertEqual(campaign.tags, ['test', 'social'])
        
        # Check that owner assignment was created
        assignment = CampaignAssignment.objects.get(campaign=campaign, user=self.user)
        self.assertEqual(assignment.role, 'owner')
    
    def test_campaign_create_serializer_invalid_dates(self):
        """Test CampaignCreateSerializer with invalid date range"""
        data = {
            'name': 'New Campaign',
            'campaign_type': CampaignType.SOCIAL_MEDIA,
            'budget': '15000.00',
            'start_date': (timezone.now() + timedelta(days=30)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=1)).isoformat(),
        }
        
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('end_date', serializer.errors)
    
    def test_campaign_create_serializer_past_start_date(self):
        """Test CampaignCreateSerializer with past start date"""
        data = {
            'name': 'New Campaign',
            'campaign_type': CampaignType.SOCIAL_MEDIA,
            'budget': '15000.00',
            'start_date': (timezone.now() - timedelta(days=1)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=30)).isoformat(),
        }
        
        serializer = CampaignCreateSerializer(
            data=data,
            context={'request': self.request}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('start_date', serializer.errors)


class CampaignUpdateSerializerTest(TestCase):
    """Test cases for CampaignUpdateSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('10000.00'),
            spent_amount=Decimal('5000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
    
    def test_campaign_update_serializer_valid_status_transition(self):
        """Test valid status transition"""
        data = {'status': CampaignStatus.ACTIVE}
        serializer = CampaignUpdateSerializer(
            instance=self.campaign,
            data=data,
            partial=True
        )
        
        self.assertTrue(serializer.is_valid())
        campaign = serializer.save()
        self.assertEqual(campaign.status, CampaignStatus.ACTIVE)
    
    def test_campaign_update_serializer_invalid_status_transition(self):
        """Test invalid status transition"""
        data = {'status': CampaignStatus.PAUSED}
        serializer = CampaignUpdateSerializer(
            instance=self.campaign,
            data=data,
            partial=True
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('status', serializer.errors)
    
    def test_campaign_update_serializer_budget_validation(self):
        """Test budget validation"""
        data = {
            'budget': '5000.00',
            'spent_amount': '10000.00'
        }
        serializer = CampaignUpdateSerializer(
            instance=self.campaign,
            data=data,
            partial=True
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('spent_amount', serializer.errors)


class CampaignStatusUpdateSerializerTest(TestCase):
    """Test cases for CampaignStatusUpdateSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('10000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
    
    def test_status_update_serializer_valid_transition(self):
        """Test valid status transition"""
        data = {
            'status': CampaignStatus.ACTIVE,
            'reason': 'Starting the campaign'
        }
        serializer = CampaignStatusUpdateSerializer(
            data=data,
            context={'campaign': self.campaign}
        )
        
        self.assertTrue(serializer.is_valid())
    
    def test_status_update_serializer_invalid_transition(self):
        """Test invalid status transition"""
        data = {'status': CampaignStatus.PAUSED}
        serializer = CampaignStatusUpdateSerializer(
            data=data,
            context={'campaign': self.campaign}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('status', serializer.errors)


class CampaignMetricSerializerTest(TestCase):
    """Test cases for CampaignMetricSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            budget=Decimal('10000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
    
    def test_metric_serializer_valid_data(self):
        """Test CampaignMetricSerializer with valid data"""
        data = {
            'campaign': self.campaign.id,
            'impressions': 1000,
            'clicks': 100,
            'conversions': 10,
            'cost_per_click': '2.50',
            'cost_per_impression': '0.25',
            'cost_per_conversion': '25.00'
        }
        
        serializer = CampaignMetricSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        metric = serializer.save()
        
        self.assertEqual(metric.impressions, 1000)
        self.assertEqual(metric.clicks, 100)
        self.assertEqual(metric.conversions, 10)
        self.assertEqual(metric.cost_per_click, Decimal('2.50'))
    
    def test_metric_serializer_invalid_data(self):
        """Test CampaignMetricSerializer with invalid data"""
        data = {
            'campaign': self.campaign.id,
            'impressions': 100,
            'clicks': 200,  # More clicks than impressions
            'conversions': 50,
            'cost_per_click': '2.50'
        }
        
        serializer = CampaignMetricSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('clicks', serializer.errors)
    
    def test_metric_serializer_conversions_exceed_clicks(self):
        """Test that conversions cannot exceed clicks"""
        data = {
            'campaign': self.campaign.id,
            'impressions': 1000,
            'clicks': 100,
            'conversions': 150,  # More conversions than clicks
            'cost_per_click': '2.50'
        }
        
        serializer = CampaignMetricSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('conversions', serializer.errors)


class CampaignNoteSerializerTest(TestCase):
    """Test cases for CampaignNoteSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            budget=Decimal('10000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        self.factory = APIRequestFactory()
        self.request = self.factory.post('/')
        self.request.user = self.user
    
    def test_note_serializer_valid_data(self):
        """Test CampaignNoteSerializer with valid data"""
        data = {
            'campaign': self.campaign.id,
            'title': 'Test Note',
            'content': 'This is a test note content.',
            'is_private': False
        }
        
        serializer = CampaignNoteSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        
        self.assertEqual(note.title, 'Test Note')
        self.assertEqual(note.content, 'This is a test note content.')
        self.assertEqual(note.author, self.user)
        self.assertFalse(note.is_private)
    
    def test_note_serializer_private_note(self):
        """Test private note creation"""
        data = {
            'campaign': self.campaign.id,
            'title': 'Private Note',
            'content': 'This is a private note.',
            'is_private': True
        }
        
        serializer = CampaignNoteSerializer(
            data=data,
            context={'request': self.request}
        )
        self.assertTrue(serializer.is_valid())
        note = serializer.save()
        
        self.assertTrue(note.is_private)
        self.assertEqual(note.author, self.user)


class CampaignMetricsSummarySerializerTest(TestCase):
    """Test cases for CampaignMetricsSummarySerializer"""
    
    def test_metrics_summary_serializer(self):
        """Test CampaignMetricsSummarySerializer"""
        data = {
            'total_impressions': 10000,
            'total_clicks': 1000,
            'total_conversions': 100,
            'total_spent': Decimal('5000.00'),
            'average_ctr': Decimal('0.1000'),
            'average_cvr': Decimal('0.1000'),
            'average_cpc': Decimal('5.00'),
            'average_cpm': Decimal('50.00'),
            'budget_utilization': 50.0,
            'days_remaining': 15
        }
        
        serializer = CampaignMetricsSummarySerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        serialized_data = serializer.data
        self.assertEqual(serialized_data['total_impressions'], 10000)
        self.assertEqual(serialized_data['total_clicks'], 1000)
        self.assertEqual(serialized_data['total_conversions'], 100)
        self.assertEqual(serialized_data['total_spent'], '5000.00')
        self.assertEqual(serialized_data['average_ctr'], '0.1000')
        self.assertEqual(serialized_data['budget_utilization'], 50.0)
        self.assertEqual(serialized_data['days_remaining'], 15) 