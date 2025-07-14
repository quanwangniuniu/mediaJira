from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta

from campaigns.models import (
    Campaign, CampaignAssignment, CampaignMetric, CampaignNote,
    CampaignStatus, CampaignType
)

User = get_user_model()
class CampaignModelTest(TestCase):
    """
    Test cases for Campaign model
    
    Tests all model functionality including:
    - Field validation
    - Business logic methods
    - Status transitions
    - Computed properties
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            description='A test campaign for unit testing',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('10000.00'),
            spent_amount=Decimal('5000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
    
    def test_campaign_creation(self):
        """Test basic campaign creation"""
        self.assertEqual(self.campaign.name, 'Test Campaign')
        self.assertEqual(self.campaign.status, CampaignStatus.DRAFT)
        self.assertEqual(self.campaign.budget, Decimal('10000.00'))
        self.assertTrue(self.campaign.is_active)
    
    def test_campaign_string_representation(self):
        """Test string representation of campaign"""
        expected = f"Test Campaign ({self.campaign.get_status_display()})"
        self.assertEqual(str(self.campaign), expected)
    
    def test_budget_utilization_calculation(self):
        """Test budget utilization percentage calculation"""
        # 5000 / 10000 = 50%
        self.assertEqual(self.campaign.budget_utilization, 50.0)
        
        # Test with zero budget
        self.campaign.budget = Decimal('0.00')
        self.assertEqual(self.campaign.budget_utilization, 0.0)
    
    def test_is_over_budget_property(self):
        """Test over budget detection"""
        # Current: 5000 spent, 10000 budget - not over budget
        self.assertFalse(self.campaign.is_over_budget)
        
        # Set spent amount higher than budget
        self.campaign.spent_amount = Decimal('15000.00')
        self.assertTrue(self.campaign.is_over_budget)
    
    def test_duration_days_calculation(self):
        """Test campaign duration calculation"""
        # 30 days difference
        self.assertEqual(self.campaign.duration_days, 29)  # 30 - 1 = 29 days
        
        # Test with None dates
        self.campaign.start_date = None
        self.assertEqual(self.campaign.duration_days, 0)
    
    def test_is_running_property(self):
        """Test if campaign is currently running"""
        # Draft status - not running
        self.assertFalse(self.campaign.is_running)
        
        # Set to active and current time within range
        self.campaign.status = CampaignStatus.ACTIVE
        self.campaign.start_date = timezone.now() - timedelta(days=1)
        self.campaign.end_date = timezone.now() + timedelta(days=1)
        self.assertTrue(self.campaign.is_running)
        
        # Past end date - not running
        self.campaign.end_date = timezone.now() - timedelta(days=1)
        self.assertFalse(self.campaign.is_running)
    
    def test_status_transition_validation(self):
        """Test valid and invalid status transitions"""
        # Draft can transition to Active or Cancelled
        self.assertTrue(self.campaign.can_transition_to(CampaignStatus.ACTIVE))
        self.assertTrue(self.campaign.can_transition_to(CampaignStatus.CANCELLED))
        self.assertFalse(self.campaign.can_transition_to(CampaignStatus.PAUSED))
        
        # Active can transition to Paused, Completed, or Cancelled
        self.campaign.status = CampaignStatus.ACTIVE
        self.assertTrue(self.campaign.can_transition_to(CampaignStatus.PAUSED))
        self.assertTrue(self.campaign.can_transition_to(CampaignStatus.COMPLETED))
        self.assertTrue(self.campaign.can_transition_to(CampaignStatus.CANCELLED))
        self.assertFalse(self.campaign.can_transition_to(CampaignStatus.DRAFT))
        
        # Completed cannot transition to any other status
        self.campaign.status = CampaignStatus.COMPLETED
        self.assertFalse(self.campaign.can_transition_to(CampaignStatus.ACTIVE))
        self.assertFalse(self.campaign.can_transition_to(CampaignStatus.DRAFT))
    
    def test_campaign_validation(self):
        """Test campaign field validation"""
        # Test invalid date range
        self.campaign.start_date = timezone.now() + timedelta(days=30)
        self.campaign.end_date = timezone.now() + timedelta(days=1)
        
        with self.assertRaises(ValidationError):
            self.campaign.clean()
        
        # Test spent amount exceeding budget
        self.campaign.start_date = timezone.now() + timedelta(days=1)
        self.campaign.end_date = timezone.now() + timedelta(days=30)
        self.campaign.spent_amount = Decimal('15000.00')
        self.campaign.budget = Decimal('10000.00')
        
        with self.assertRaises(ValidationError):
            self.campaign.clean()


class CampaignAssignmentModelTest(TestCase):
    """
    Test cases for CampaignAssignment model
    """
    
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
        
        self.assignment = CampaignAssignment.objects.create(
            campaign=self.campaign,
            user=self.user,
            role='manager'
        )
    
    def test_assignment_creation(self):
        """Test basic assignment creation"""
        self.assertEqual(self.assignment.campaign, self.campaign)
        self.assertEqual(self.assignment.user, self.user)
        self.assertEqual(self.assignment.role, 'manager')
        self.assertTrue(self.assignment.is_active)
    
    def test_assignment_string_representation(self):
        """Test string representation of assignment"""
        expected = f"{self.user.username} - Test Campaign (Manager)"
        self.assertEqual(str(self.assignment), expected)
    
    def test_unique_constraint(self):
        """Test that user can only be assigned once per campaign"""
        # Try to create another assignment for the same user and campaign
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            CampaignAssignment.objects.create(
                campaign=self.campaign,
                user=self.user,
                role='analyst'
            )


class CampaignMetricModelTest(TestCase):
    """
    Test cases for CampaignMetric model
    """
    
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
        
        self.metric = CampaignMetric.objects.create(
            campaign=self.campaign,
            impressions=1000,
            clicks=100,
            conversions=10,
            cost_per_click=Decimal('2.50'),
            cost_per_impression=Decimal('0.25'),
            cost_per_conversion=Decimal('25.00')
        )
    
    def test_metric_creation(self):
        """Test basic metric creation"""
        self.assertEqual(self.metric.campaign, self.campaign)
        self.assertEqual(self.metric.impressions, 1000)
        self.assertEqual(self.metric.clicks, 100)
        self.assertEqual(self.metric.conversions, 10)
    
    def test_metric_string_representation(self):
        """Test string representation of metric"""
        expected = f"Test Campaign - {self.metric.date} (1000 impressions)"
        self.assertEqual(str(self.metric), expected)
    
    def test_calculated_metrics(self):
        """Test automatic calculation of CTR and CVR"""
        # CTR = clicks / impressions = 100 / 1000 = 0.1
        self.assertEqual(self.metric.click_through_rate, Decimal('0.1000'))
        
        # CVR = conversions / clicks = 10 / 100 = 0.1
        self.assertEqual(self.metric.conversion_rate, Decimal('0.1000'))
    
    def test_calculated_metrics_with_zero_values(self):
        """Test calculated metrics with zero values"""
        metric = CampaignMetric.objects.create(
            campaign=self.campaign,
            impressions=0,
            clicks=0,
            conversions=0
        )
        
        # Should default to 0.0000
        self.assertEqual(metric.click_through_rate, Decimal('0.0000'))
        self.assertEqual(metric.conversion_rate, Decimal('0.0000'))
    
    def test_unique_constraint(self):
        """Test that only one metric per campaign per date"""
        # Try to create another metric for the same campaign and date
        with self.assertRaises(Exception):  # IntegrityError
            CampaignMetric.objects.create(
                campaign=self.campaign,
                impressions=500,
                clicks=50,
                conversions=5
            )


class CampaignNoteModelTest(TestCase):
    """
    Test cases for CampaignNote model
    """
    
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
        
        self.note = CampaignNote.objects.create(
            campaign=self.campaign,
            author=self.user,
            title='Test Note',
            content='This is a test note for the campaign.',
            is_private=False
        )
    
    def test_note_creation(self):
        """Test basic note creation"""
        self.assertEqual(self.note.campaign, self.campaign)
        self.assertEqual(self.note.author, self.user)
        self.assertEqual(self.note.title, 'Test Note')
        self.assertEqual(self.note.content, 'This is a test note for the campaign.')
        self.assertFalse(self.note.is_private)
    
    def test_note_string_representation(self):
        """Test string representation of note"""
        expected = f"Test Note - Test Campaign"
        self.assertEqual(str(self.note), expected)
    
    def test_private_note(self):
        """Test private note functionality"""
        private_note = CampaignNote.objects.create(
            campaign=self.campaign,
            author=self.user,
            title='Private Note',
            content='This is a private note.',
            is_private=True
        )
        
        self.assertTrue(private_note.is_private) 