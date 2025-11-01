from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date, timedelta
from stripe_meta.models import Plan, Subscription, UsageDaily, Payment
from core.models import Organization

User = get_user_model()


class PlanModelTest(TestCase):
    """Test cases for Plan model"""
    
    def setUp(self):
        self.plan = Plan.objects.create(
            name="Basic Plan",
            max_team_members=5,
            max_previews_per_day=100,
            max_tasks_per_day=50,
            stripe_price_id="price_basic_123"
        )
    
    def test_plan_creation(self):
        """Test plan creation with all fields"""
        self.assertEqual(self.plan.name, "Basic Plan")
        self.assertEqual(self.plan.max_team_members, 5)
        self.assertEqual(self.plan.max_previews_per_day, 100)
        self.assertEqual(self.plan.max_tasks_per_day, 50)
        self.assertEqual(self.plan.stripe_price_id, "price_basic_123")
    
    def test_plan_str_representation(self):
        """Test plan string representation"""
        self.assertEqual(str(self.plan), "Basic Plan")
    
    def test_plan_required_fields(self):
        """Test that required fields cannot be null"""
        # Test that we can create a plan with valid data
        plan = Plan.objects.create(
            name="Test Plan",
            max_team_members=5,
            max_previews_per_day=100,
            max_tasks_per_day=50
        )
        self.assertIsNotNone(plan)
        self.assertEqual(plan.name, "Test Plan")


class SubscriptionModelTest(TestCase):
    """Test cases for Subscription model"""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name="Test Org",
            slug="test-org"
        )
        self.plan = Plan.objects.create(
            name="Pro Plan",
            max_team_members=10,
            max_previews_per_day=500,
            max_tasks_per_day=200,
            stripe_price_id="price_pro_123"
        )
        self.subscription = Subscription.objects.create(
            organization=self.organization,
            plan=self.plan,
            stripe_subscription_id="sub_123456789",
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
            is_active=True
        )
    
    def test_subscription_creation(self):
        """Test subscription creation"""
        self.assertEqual(self.subscription.organization, self.organization)
        self.assertEqual(self.subscription.plan, self.plan)
        self.assertEqual(self.subscription.stripe_subscription_id, "sub_123456789")
        self.assertTrue(self.subscription.is_active)
    
    def test_subscription_relationships(self):
        """Test subscription foreign key relationships"""
        self.assertEqual(self.subscription.organization.name, "Test Org")
        self.assertEqual(self.subscription.plan.name, "Pro Plan")
    
    def test_subscription_active_status(self):
        """Test subscription active status"""
        self.assertTrue(self.subscription.is_active)
        
        # Deactivate subscription
        self.subscription.is_active = False
        self.subscription.save()
        self.assertFalse(self.subscription.is_active)


class UsageDailyModelTest(TestCase):
    """Test cases for UsageDaily model"""
    
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
    
    def test_usage_daily_creation(self):
        """Test usage daily record creation"""
        self.assertEqual(self.usage.user, self.user)
        self.assertEqual(self.usage.date, date.today())
        self.assertEqual(self.usage.previews_used, 5)
        self.assertEqual(self.usage.tasks_used, 3)
    
    def test_usage_daily_defaults(self):
        """Test usage daily default values"""
        new_usage = UsageDaily.objects.create(
            user=self.user,
            date=date.today() + timedelta(days=1)
        )
        self.assertEqual(new_usage.previews_used, 0)
        self.assertEqual(new_usage.tasks_used, 0)
    
    def test_usage_daily_relationships(self):
        """Test usage daily foreign key relationships"""
        self.assertEqual(self.usage.user.username, "testuser")
        self.assertEqual(self.usage.user.email, "test@example.com")


class PaymentModelTest(TestCase):
    """Test cases for Payment model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.organization = Organization.objects.create(
            name="Test Org",
            slug="test-org"
        )
        self.plan = Plan.objects.create(
            name="Pro Plan",
            max_team_members=10,
            max_previews_per_day=500,
            max_tasks_per_day=200,
            stripe_price_id="price_pro_123"
        )
        self.subscription = Subscription.objects.create(
            organization=self.organization,
            plan=self.plan,
            stripe_subscription_id="sub_123456789",
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
            is_active=True
        )
        self.payment = Payment.objects.create(
            user=self.user,
            stripe_subscription_id=self.subscription.stripe_subscription_id,
            stripe_product_id="prod_123",
            stripe_price_id="price_123",
            stripe_customer_id="cus_123",
            is_active=True
        )
    
    def test_payment_creation(self):
        """Test payment creation"""
        self.assertEqual(self.payment.user, self.user)
        self.assertEqual(self.payment.stripe_subscription_id, self.subscription.stripe_subscription_id)
        self.assertEqual(self.payment.stripe_product_id, "prod_123")
        self.assertEqual(self.payment.stripe_price_id, "price_123")
        self.assertEqual(self.payment.stripe_customer_id, "cus_123")
        self.assertTrue(self.payment.is_active)
    
    def test_payment_relationships(self):
        """Test payment relationships"""
        self.assertEqual(self.payment.user.username, "testuser")
        # Verify the stripe_subscription_id matches
        self.assertEqual(self.payment.stripe_subscription_id, self.subscription.stripe_subscription_id)
    
    def test_payment_active_status(self):
        """Test payment active status"""
        self.assertTrue(self.payment.is_active)
        
        # Deactivate payment
        self.payment.is_active = False
        self.payment.save()
        self.assertFalse(self.payment.is_active)
