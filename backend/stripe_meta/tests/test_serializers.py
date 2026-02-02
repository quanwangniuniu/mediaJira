from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta

from stripe_meta.models import Plan, Subscription, UsageDaily, Payment
from stripe_meta.serializers import (
    PlanSerializer, SubscriptionSerializer, UsageDailySerializer,
    CheckoutSessionSerializer, OrganizationSerializer, UserSerializer
)
from core.models import Organization

User = get_user_model()


class PlanSerializerTest(TestCase):
    """Test cases for PlanSerializer"""
    
    def setUp(self):
        # Clear existing plans from migrations to ensure deterministic tests
        Plan.objects.all().delete()
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            desc="A basic plan description",
            max_team_members=5,
            max_previews_per_day=100,
            max_tasks_per_day=50,
            stripe_price_id="price_basic_123"
        )
    
    def test_plan_serialization(self):
        """Test plan serialization"""
        serializer = PlanSerializer(self.plan)
        data = serializer.data
        
        self.assertEqual(data['id'], self.plan.id)
        self.assertEqual(data['name'], "Basic Plan")
        self.assertEqual(data['desc'], "A basic plan description")
        self.assertEqual(data['max_team_members'], 5)
        self.assertEqual(data['max_previews_per_day'], 100)
        self.assertEqual(data['max_tasks_per_day'], 50)
        self.assertEqual(data['stripe_price_id'], "price_basic_123")
        self.assertIn('price', data)
        self.assertIn('price_currency', data)
        self.assertEqual(data['price_id'], "price_basic_123")
    
    def test_plan_serialization_multiple_plans(self):
        """Test serialization of multiple plans"""
        plan2 = Plan.objects.create(
            name="Pro Plan",
            max_team_members=10,
            max_previews_per_day=500,
            max_tasks_per_day=200,
            stripe_price_id="price_pro_123"
        )
        
        plans = Plan.objects.all()
        serializer = PlanSerializer(plans, many=True)
        data = serializer.data
        
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], "Basic Plan")
        self.assertEqual(data[1]['name'], "Pro Plan")


class SubscriptionSerializerTest(TestCase):
    """Test cases for SubscriptionSerializer"""
    
    def setUp(self):
        # Clear existing plans from migrations to ensure deterministic tests
        Plan.objects.all().delete()
        
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        self.plan = Plan.objects.create(
            name="Basic Plan",
            max_team_members=5,
            max_previews_per_day=100,
            max_tasks_per_day=50,
            stripe_price_id="price_basic_123"
        )
        
        self.subscription = Subscription.objects.create(
            organization=self.organization,
            plan=self.plan,
            stripe_subscription_id="sub_123456789",
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
            is_active=True
        )
    
    def test_subscription_serialization(self):
        """Test subscription serialization"""
        serializer = SubscriptionSerializer(self.subscription)
        data = serializer.data
        
        self.assertEqual(data['id'], self.subscription.id)
        self.assertEqual(data['plan']['name'], "Basic Plan")
        self.assertEqual(data['stripe_subscription_id'], "sub_123456789")
        self.assertTrue(data['is_active'])
        self.assertIn('start_date', data)
        self.assertIn('end_date', data)
    
    def test_subscription_serialization_inactive(self):
        """Test serialization of inactive subscription"""
        self.subscription.is_active = False
        self.subscription.save()
        
        serializer = SubscriptionSerializer(self.subscription)
        data = serializer.data
        
        self.assertFalse(data['is_active'])


class UsageDailySerializerTest(TestCase):
    """Test cases for UsageDailySerializer"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        self.usage = UsageDaily.objects.create(
            user=self.user,
            date=date.today(),
            previews_used=5,
            tasks_used=3
        )
    
    def test_usage_daily_serialization(self):
        """Test usage daily serialization"""
        serializer = UsageDailySerializer(self.usage)
        data = serializer.data
        
        self.assertEqual(data['id'], self.usage.id)
        self.assertEqual(data['date'], date.today().isoformat())
        self.assertEqual(data['previews_used'], 5)
        self.assertEqual(data['tasks_used'], 3)
    
    def test_usage_daily_serialization_zero_usage(self):
        """Test serialization with zero usage"""
        usage = UsageDaily.objects.create(
            user=self.user,
            date=date.today() + timedelta(days=1)
        )
        
        serializer = UsageDailySerializer(usage)
        data = serializer.data
        
        self.assertEqual(data['previews_used'], 0)
        self.assertEqual(data['tasks_used'], 0)


class CheckoutSessionSerializerTest(TestCase):
    """Test cases for CheckoutSessionSerializer"""
    
    def setUp(self):
        """Set up test data"""
        # Clear existing plans from migrations to ensure deterministic tests
        Plan.objects.all().delete()
        
        self.plan = Plan.objects.create(
            name="Test Plan",
            max_team_members=5,
            max_previews_per_day=100,
            max_tasks_per_day=50
        )
    
    def test_checkout_session_validation_valid(self):
        """Test checkout session validation with valid data"""
        data = {
            'plan_id': self.plan.id,
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel'
        }
        
        serializer = CheckoutSessionSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_checkout_session_validation_missing_plan_id(self):
        """Test checkout session validation without plan_id"""
        data = {
            'success_url': 'https://example.com/success',
            'cancel_url': 'https://example.com/cancel'
        }
        
        serializer = CheckoutSessionSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('plan_id', serializer.errors)
    
    def test_checkout_session_validation_missing_success_url(self):
        """Test checkout session validation without success_url"""
        data = {
            'plan_id': 1,
            'cancel_url': 'https://example.com/cancel'
        }
        
        serializer = CheckoutSessionSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('success_url', serializer.errors)
    
    def test_checkout_session_validation_missing_cancel_url(self):
        """Test checkout session validation without cancel_url"""
        data = {
            'plan_id': 1,
            'success_url': 'https://example.com/success'
        }
        
        serializer = CheckoutSessionSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('cancel_url', serializer.errors)
    
    def test_checkout_session_validation_invalid_urls(self):
        """Test checkout session validation with invalid URLs"""
        data = {
            'plan_id': 1,
            'success_url': 'not-a-url',
            'cancel_url': 'also-not-a-url'
        }
        
        serializer = CheckoutSessionSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('success_url', serializer.errors)
        self.assertIn('cancel_url', serializer.errors)


class OrganizationSerializerTest(TestCase):
    """Test cases for OrganizationSerializer"""
    
    def test_organization_serialization(self):
        """Test organization serialization"""
        organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        serializer = OrganizationSerializer(organization)
        data = serializer.data
        
        self.assertEqual(data['id'], organization.id)
        self.assertEqual(data['name'], "Test Organization")
        self.assertEqual(data['slug'], "test-org")
    
    def test_organization_validation_valid(self):
        """Test organization validation with valid data"""
        data = {
            'name': 'New Organization',
            'slug': 'new-org'
        }
        
        serializer = OrganizationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_organization_validation_missing_name(self):
        """Test organization validation without name"""
        data = {
            'slug': 'new-org'
        }
        
        serializer = OrganizationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_organization_validation_missing_slug(self):
        """Test organization validation without slug"""
        data = {
            'name': 'New Organization'
        }
        
        serializer = OrganizationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('slug', serializer.errors)
    
    def test_organization_validation_duplicate_slug(self):
        """Test organization validation with duplicate slug"""
        Organization.objects.create(
            name="Existing Organization",
            slug="existing-org"
        )
        
        data = {
            'name': 'New Organization',
            'slug': 'existing-org'  # Duplicate slug
        }
        
        serializer = OrganizationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('slug', serializer.errors)


class UserSerializerTest(TestCase):
    """Test cases for UserSerializer"""
    
    def test_user_serialization(self):
        """Test user serialization"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        serializer = UserSerializer(user)
        data = serializer.data
        
        self.assertEqual(data['id'], user.id)
        self.assertEqual(data['username'], "testuser")
        self.assertEqual(data['email'], "test@example.com")
    
    def test_user_serialization_with_organization(self):
        """Test user serialization with organization"""
        organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            organization=organization
        )
        
        serializer = UserSerializer(user)
        data = serializer.data
        
        self.assertEqual(data['organization']['name'], "Test Organization")
        self.assertEqual(data['organization']['slug'], "test-org")
    
    def test_user_serialization_without_organization(self):
        """Test user serialization without organization"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        
        serializer = UserSerializer(user)
        data = serializer.data
        
        self.assertIsNone(data['organization'])
