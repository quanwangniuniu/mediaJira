from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from .models import UsageDaily
from .permissions import decode_organization_access_token
import logging
from django.http import JsonResponse
from .models import Subscription
from django.contrib.auth import get_user_model
from django.conf import settings


User = get_user_model()

logger = logging.getLogger(__name__)

class UsageTrackingMiddleware(MiddlewareMixin):
    """
    Middleware to track usage across different platforms.
    Monitors preview requests and automatically records daily usage.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.async_mode = False
        
        # Define tracking rules for different platforms/endpoints
        self.tracking_rules = {
            # Facebook Meta preview endpoints
            '/api/facebook_meta/associate-media/': {
                'action_type': 'preview',
                'platform': 'facebook_meta',
                'pattern': r'^/api/facebook_meta/[^/]+/associate-media/$',
                'methods': ['POST', 'DELETE']
            },
            '/api/facebook_meta/share-preview/': {
                'action_type': 'preview',
                'platform': 'facebook_meta',
                'pattern': r'^/api/facebook_meta/[^/]+/share-preview/$',
                'methods': ['POST', 'DELETE']
            },
            
            # Task CRUD endpoints
            '/api/tasks/': {
                'action_type': 'task',
                'platform': 'task',
                'methods': ['POST']  # Only track task creation
            },
            '/api/tasks/detail/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/$',
                'methods': ['PATCH', 'DELETE']  # Track updates and deletions
            },
            
            # Task action endpoints
            '/api/tasks/link/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/link/$',
                'methods': ['POST']
            },
            '/api/tasks/make-approval/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/make-approval/$',
                'methods': ['POST']
            },
            '/api/tasks/cancel/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/cancel/$',
                'methods': ['POST']
            },
            '/api/tasks/revise/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/revise/$',
                'methods': ['POST']
            },
            '/api/tasks/forward/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/forward/$',
                'methods': ['POST']
            },
            '/api/tasks/start-review/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/start-review/$',
                'methods': ['POST']
            },
            '/api/tasks/lock/': {
                'action_type': 'task',
                'platform': 'task',
                'pattern': r'^/api/tasks/[^/]+/lock/$',
                'methods': ['POST']
            }
        }
    
    def process_request(self, request):
        """Process the request and identify if it should be tracked"""
        # Check if this endpoint should be tracked
        path = request.path
        method = request.method
        tracking_info = self._get_tracking_info(path, method)
        
        # If not a trackable endpoint, skip all processing
        if not tracking_info:
            logger.debug(f"Path {path} is not trackable")
            return None
            
        # Only proceed with authentication for trackable endpoints
        try:
            # Check for organization access token first
            org_token = request.META.get('HTTP_X_ORGANIZATION_TOKEN')
            if org_token:
                # Decode organization token to get user info
                payload = decode_organization_access_token(org_token)
                if payload and 'user_id' in payload:
                    try:
                        user = User.objects.get(id=payload['user_id'])
                        request.user = user
                        logger.debug(f"Organization token authentication successful for user {user.id}")
                    except User.DoesNotExist:
                        logger.debug(f"User {payload['user_id']} not found for organization token")
                        return None
                else:
                    logger.debug(f"Invalid organization token for path: {request.path}")
                    return None
            # Fallback to standard Django authentication
            elif not hasattr(request, 'user') or not request.user.is_authenticated:
                logger.debug(f"No authentication found for path: {request.path}")
                return None
                
            # Only track authenticated users (either method)
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                logger.debug(f"User not authenticated for path: {request.path}")
                return None
            
            # Check usage limits BEFORE allowing the request
            limit_check = self._check_usage_limits(request.user, tracking_info)
            if limit_check['blocked']:
                # Store limit check result to handle in process_response
                request._usage_limit_exceeded = limit_check
                return None
                
            request._usage_tracking = tracking_info
            request._usage_start_time = timezone.now()
            logger.debug(f"Usage tracking initiated for user {request.user.id} on {tracking_info['platform']} - {tracking_info['action_type']}")
                
        except Exception as e:
            logger.error(f"Error in usage tracking middleware: {e}")
            # Don't block the request if there's an error in the middleware
            return None
            
        return None
    
    def process_response(self, request, response):
        """Process the response and record usage if applicable"""
        # Check if usage limit was exceeded
        if hasattr(request, '_usage_limit_exceeded'):
            limit_check = request._usage_limit_exceeded
            return JsonResponse({
                'error': limit_check['message'],
                'code': 'DAILY_LIMIT_EXCEEDED',
                'current_usage': limit_check['current_usage'],
                'limit': limit_check['limit'],
                'action_type': limit_check.get('action_type', 'unknown')
            }, status=400)  # Bad Request
        
        # Only track if request was marked for tracking and was successful
        if (hasattr(request, '_usage_tracking') and 
            hasattr(request, '_usage_start_time') and 
            response.status_code in [200, 201, 202]):
            
            try:
                self._record_usage(request, response)
            except Exception as e:
                logger.error(f"Error recording usage: {e}")
                
        return response
    
    def _get_tracking_info(self, path, method):
        """Get tracking information for a given path and HTTP method"""
        import re
        
        for endpoint, info in self.tracking_rules.items():
            # Check if path matches the endpoint pattern
            if 'pattern' in info:
                # Use regex pattern for dynamic paths
                if re.match(info['pattern'], path):
                    # Check if HTTP method is allowed
                    if method in info.get('methods', ['GET', 'POST', 'PUT', 'DELETE']):
                        return info
            else:
                # Use simple prefix matching for static paths
                if path.startswith(endpoint):
                    # Check if HTTP method is allowed
                    if method in info.get('methods', ['GET', 'POST', 'PUT', 'DELETE']):
                        return info
        return None
    
    def _record_usage(self, request, response):
        """Record usage for the user"""
        user = request.user
        tracking_info = request._usage_tracking
        today = timezone.now().date()
        
        # Get or create daily usage record
        usage, created = UsageDaily.objects.get_or_create(
            user=user,
            date=today,
            defaults={
                'previews_used': 0,
                'tasks_used': 0,
            }
        )
        
        # Update usage based on action type
        action_type = tracking_info['action_type']
        platform = tracking_info['platform']
        
        # Count usage based on response data if available
        quantity = self._extract_usage_quantity(request, response, action_type)
        
        # Update the appropriate counter
        if action_type == 'preview':
            usage.previews_used += quantity
        elif action_type == 'task':
            usage.tasks_used += quantity
            
        usage.save()
        
        # Log the usage for monitoring
        logger.info(f"Recorded {action_type} usage for user {user.id} on {platform}: {quantity}")
        
        # Log current usage status
        logger.debug(f"User {user.id} current usage: {usage.previews_used} previews, {usage.tasks_used} tasks")
    
    def _extract_usage_quantity(self, request, response, action_type):
        """Extract usage quantity from request/response data"""
        # Default to 1 if no specific quantity found
        quantity = 1
        
        try:
            # Check if response has data with quantity information
            if hasattr(response, 'data') and isinstance(response.data, dict):
                # Look for common quantity fields
                quantity_fields = [
                    'items_processed',
                    'count',
                    'quantity',
                    'items_count',
                    'total_items'
                ]
                
                for field in quantity_fields:
                    if field in response.data:
                        quantity = int(response.data[field])
                        break
                        
            # Check request data for quantity
            elif hasattr(request, 'data') and isinstance(request.data, dict):
                if 'quantity' in request.data:
                    quantity = int(request.data['quantity'])
                elif 'count' in request.data:
                    quantity = int(request.data['count'])
                    
        except (ValueError, TypeError, KeyError):
            # If extraction fails, use default quantity of 1
            quantity = 1
            
        return max(1, quantity)  # Ensure at least 1
    
    def _check_usage_limits(self, user, tracking_info):
        """Check if user has exceeded usage limits and return blocking status"""
         # ✅ Local development environment: Skip all usage/subscription limits
        # If you only want to allow task, you can write:
        # if getattr(settings, "DEBUG", False) and tracking_info.get("action_type") == "task":
        if getattr(settings, "DEBUG", False):
            return {'blocked': False}
        # Get user's current plan limits
        plan_limits = self._get_user_plan_limits(user)
        if not plan_limits:
            # No plan limits found - user doesn't have active subscription
            return {
                'blocked': True,
                'message': 'No active subscription found. Please subscribe to a plan to use this feature.',
                'current_usage': 0,
                'limit': 0,
                'action_type': tracking_info['action_type']
            }
        
        # Get current usage for today
        today = timezone.now().date()
        usage, created = UsageDaily.objects.get_or_create(
            user=user,
            date=today,
            defaults={
                'previews_used': 0,
                'tasks_used': 0,
            }
        )
        
        action_type = tracking_info['action_type']
        current_usage = 0
        limit = 0
        
        # Check specific limits based on action type
        if action_type == 'preview':
            current_usage = usage.previews_used
            limit = plan_limits.get('max_previews_per_day', 0)
        elif action_type == 'task':
            current_usage = usage.tasks_used
            limit = plan_limits.get('max_tasks_per_day', 0)
        
        # Check if limit would be exceeded
        if current_usage >= limit:
            return {
                'blocked': True,
                'message': f'Daily {action_type} limit reached. You have used {current_usage} out of {limit} allowed. Please upgrade your plan or try again tomorrow.',
                'current_usage': current_usage,
                'limit': limit,
                'action_type': action_type
            }
        
        return {'blocked': False}
    
    def _get_user_plan_limits(self, user):
        """Get user's plan limits from their organization subscription"""
        
        if not user.organization:
            logger.debug(f"User {user.id} has no organization")
            return None
            
        # Get active subscription for the organization
        subscription = Subscription.objects.filter(
            organization=user.organization,
            is_active=True
        ).first()
        
        if not subscription:
            logger.debug(f"User {user.id} organization {user.organization.slug} has no active subscription")
            return None
            
        if not subscription.plan:
            logger.debug(f"User {user.id} subscription {subscription.id} has no plan")
            return None
            
        plan = subscription.plan
        logger.debug(f"User {user.id} has plan {plan.name} with limits: previews={plan.max_previews_per_day}, tasks={plan.max_tasks_per_day}")
        
        return {
            'max_previews_per_day': plan.max_previews_per_day,
            'max_tasks_per_day': plan.max_tasks_per_day
        }
