from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date
from unittest.mock import patch, MagicMock
import json

from stripe_meta.middleware import UsageTrackingMiddleware
from stripe_meta.models import Plan, Subscription, UsageDaily
from core.models import Organization
from stripe_meta.permissions import generate_organization_access_token

User = get_user_model()


class UsageTrackingMiddlewareTest(TestCase):
    """Test cases for UsageTrackingMiddleware"""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = UsageTrackingMiddleware(lambda x: MagicMock(status_code=200))
        
        # Create test data
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            organization=self.organization
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
            end_date=timezone.now() + timezone.timedelta(days=30),
            is_active=True
        )
        
        # Delete auto-created Free subscription to keep tests focused on Basic Plan
        Subscription.objects.filter(organization=self.organization, plan__name="Free").delete()
        
        # Generate organization access token
        self.org_token = generate_organization_access_token(self.user)
    
    def test_middleware_initialization(self):
        """Test middleware initialization"""
        self.assertIsNotNone(self.middleware.tracking_rules)
        self.assertIn('/api/tasks/', self.middleware.tracking_rules)
        self.assertIn('/api/facebook_meta/associate-media/', self.middleware.tracking_rules)
    
    def test_process_request_trackable_endpoint(self):
        """Test middleware processing for trackable endpoints"""
        request = self.factory.post('/api/tasks/')
        request.META['HTTP_X_ORGANIZATION_TOKEN'] = self.org_token
        
        response = self.middleware.process_request(request)
        
        # Should return None to continue processing
        self.assertIsNone(response)
        # Should set tracking attributes
        self.assertTrue(hasattr(request, '_usage_tracking'))
        self.assertTrue(hasattr(request, '_usage_start_time'))
    
    def test_process_request_non_trackable_endpoint(self):
        """Test middleware processing for non-trackable endpoints"""
        request = self.factory.get('/api/other/')
        request.META['HTTP_X_ORGANIZATION_TOKEN'] = self.org_token
        
        response = self.middleware.process_request(request)
        
        # Should return None and not set tracking attributes
        self.assertIsNone(response)
        self.assertFalse(hasattr(request, '_usage_tracking'))
    
    def test_process_request_without_auth(self):
        """Test middleware processing without authentication"""
        request = self.factory.post('/api/tasks/')
        
        response = self.middleware.process_request(request)
        
        # Should return None (no tracking)
        self.assertIsNone(response)
        self.assertFalse(hasattr(request, '_usage_tracking'))
    
    def test_process_request_invalid_token(self):
        """Test middleware processing with invalid token"""
        request = self.factory.post('/api/tasks/')
        request.META['HTTP_X_ORGANIZATION_TOKEN'] = "invalid_token"
        
        response = self.middleware.process_request(request)
        
        # Should return None (no tracking)
        self.assertIsNone(response)
        self.assertFalse(hasattr(request, '_usage_tracking'))
    
    def test_process_response_successful_request(self):
        """Test middleware response processing for successful requests"""
        request = self.factory.post('/api/tasks/')
        request.META['HTTP_X_ORGANIZATION_TOKEN'] = self.org_token
        request._usage_tracking = {'action_type': 'task', 'platform': 'task'}
        request._usage_start_time = timezone.now()
        request.user = self.user
        
        response = MagicMock(status_code=201)
        
        result = self.middleware.process_response(request, response)
        
        # Should return the original response
        self.assertEqual(result, response)
        
        # Should create usage record
        usage = UsageDaily.objects.get(user=self.user, date=date.today())
        self.assertEqual(usage.tasks_used, 1)
    
    def test_process_response_failed_request(self):
        """Test middleware response processing for failed requests"""
        request = self.factory.post('/api/tasks/')
        request.META['HTTP_X_ORGANIZATION_TOKEN'] = self.org_token
        request._usage_tracking = {'action_type': 'task', 'platform': 'task'}
        request._usage_start_time = timezone.now()
        request.user = self.user
        
        response = MagicMock(status_code=400)
        
        result = self.middleware.process_response(request, response)
        
        # Should return the original response
        self.assertEqual(result, response)
        
        # Should not create usage record
        self.assertFalse(UsageDaily.objects.filter(user=self.user, date=date.today()).exists())
    
    def test_process_response_limit_exceeded(self):
        """Test middleware response processing when limit is exceeded"""
        request = self.factory.post('/api/tasks/')
        request.META['HTTP_X_ORGANIZATION_TOKEN'] = self.org_token
        request._usage_limit_exceeded = {
            'blocked': True,
            'message': 'Daily limit reached',
            'current_usage': 50,
            'limit': 50,
            'action_type': 'task'
        }
        
        response = MagicMock(status_code=200)
        
        result = self.middleware.process_response(request, response)
        
        # Should return JsonResponse with 400 status
        self.assertEqual(result.status_code, 400)
        data = result.content.decode('utf-8')
        data = json.loads(data)
        self.assertIn('error', data)
        self.assertEqual(data['code'], 'DAILY_LIMIT_EXCEEDED')
    
    def test_get_tracking_info_static_path(self):
        """Test tracking info retrieval for static paths"""
        info = self.middleware._get_tracking_info('/api/tasks/', 'POST')
        
        self.assertIsNotNone(info)
        self.assertEqual(info['action_type'], 'task')
        self.assertEqual(info['platform'], 'task')
    
    def test_get_tracking_info_dynamic_path(self):
        """Test tracking info retrieval for dynamic paths"""
        info = self.middleware._get_tracking_info('/api/tasks/123/lock/', 'POST')
        
        self.assertIsNotNone(info)
        self.assertEqual(info['action_type'], 'task')
        self.assertEqual(info['platform'], 'task')
    
    def test_get_tracking_info_wrong_method(self):
        """Test tracking info retrieval for wrong HTTP method"""
        info = self.middleware._get_tracking_info('/api/tasks/', 'GET')
        
        # Should return None for GET method (not in allowed methods)
        self.assertIsNone(info)
    
    def test_get_tracking_info_non_trackable_path(self):
        """Test tracking info retrieval for non-trackable paths"""
        info = self.middleware._get_tracking_info('/api/other/', 'POST')
        
        # Should return None for non-trackable paths
        self.assertIsNone(info)
    
    def test_record_usage_preview_action(self):
        """Test usage recording for preview actions"""
        request = MagicMock()
        request.user = self.user
        request._usage_tracking = {'action_type': 'preview', 'platform': 'facebook_meta'}
        
        response = MagicMock()
        response.data = {'items_processed': 3}
        
        self.middleware._record_usage(request, response)
        
        # Should create usage record with correct values
        usage = UsageDaily.objects.get(user=self.user, date=date.today())
        self.assertEqual(usage.previews_used, 3)
        self.assertEqual(usage.tasks_used, 0)
    
    def test_record_usage_task_action(self):
        """Test usage recording for task actions"""
        request = MagicMock()
        request.user = self.user
        request._usage_tracking = {'action_type': 'task', 'platform': 'task'}
        
        response = MagicMock()
        response.data = {'count': 2}
        
        self.middleware._record_usage(request, response)
        
        # Should create usage record with correct values
        usage = UsageDaily.objects.get(user=self.user, date=date.today())
        self.assertEqual(usage.previews_used, 0)
        self.assertEqual(usage.tasks_used, 2)
    
    def test_record_usage_default_quantity(self):
        """Test usage recording with default quantity"""
        request = MagicMock()
        request.user = self.user
        request._usage_tracking = {'action_type': 'task', 'platform': 'task'}
        
        response = MagicMock()
        response.data = {}
        
        self.middleware._record_usage(request, response)
        
        # Should create usage record with default quantity of 1
        usage = UsageDaily.objects.get(user=self.user, date=date.today())
        self.assertEqual(usage.tasks_used, 1)
    
    def test_check_usage_limits_within_limit(self):
        """Test usage limit checking when within limit"""
        tracking_info = {'action_type': 'task'}
        
        result = self.middleware._check_usage_limits(self.user, tracking_info)
        
        self.assertFalse(result['blocked'])
    
    def test_check_usage_limits_exceeded(self):
        """Test usage limit checking when limit is exceeded"""
        # Create usage record that exceeds limit
        UsageDaily.objects.create(
            user=self.user,
            date=date.today(),
            tasks_used=50  # This equals the limit
        )
        
        tracking_info = {'action_type': 'task'}
        
        result = self.middleware._check_usage_limits(self.user, tracking_info)
        
        self.assertTrue(result['blocked'])
        self.assertIn('limit reached', result['message'].lower())
    
    def test_check_usage_limits_no_subscription(self):
        """Test usage limit checking when user has no subscription"""
        # Remove subscription
        self.subscription.delete()
        
        tracking_info = {'action_type': 'task'}
        
        result = self.middleware._check_usage_limits(self.user, tracking_info)
        
        self.assertTrue(result['blocked'])
        self.assertIn('no active subscription', result['message'].lower())
    
    def test_get_user_plan_limits_success(self):
        """Test getting user plan limits successfully"""
        limits = self.middleware._get_user_plan_limits(self.user)
        
        self.assertIsNotNone(limits)
        self.assertEqual(limits['max_previews_per_day'], 100)
        self.assertEqual(limits['max_tasks_per_day'], 50)
    
    def test_get_user_plan_limits_no_organization(self):
        """Test getting user plan limits when user has no organization"""
        self.user.organization = None
        self.user.save()
        
        limits = self.middleware._get_user_plan_limits(self.user)
        
        self.assertIsNone(limits)
    
    def test_get_user_plan_limits_no_subscription(self):
        """Test getting user plan limits when organization has no subscription"""
        self.subscription.delete()
        
        limits = self.middleware._get_user_plan_limits(self.user)
        
        self.assertIsNone(limits)
    
    def test_extract_usage_quantity_from_response(self):
        """Test extracting usage quantity from response data"""
        response = MagicMock()
        response.data = {'items_processed': 5}
        
        quantity = self.middleware._extract_usage_quantity(
            MagicMock(), response, 'preview'
        )
        
        self.assertEqual(quantity, 5)
    
    def test_extract_usage_quantity_from_request(self):
        """Test extracting usage quantity from request data"""
        request = MagicMock()
        request.data = {'quantity': 3}
        
        quantity = self.middleware._extract_usage_quantity(
            request, MagicMock(), 'task'
        )
        
        self.assertEqual(quantity, 3)
    
    def test_extract_usage_quantity_default(self):
        """Test extracting usage quantity with default value"""
        request = MagicMock()
        request.data = {}
        
        quantity = self.middleware._extract_usage_quantity(
            request, MagicMock(), 'task'
        )
        
        self.assertEqual(quantity, 1)
