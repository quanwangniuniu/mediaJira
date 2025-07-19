from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from core.models import Permission
from access_control.models import RolePermission, UserRole
from typing import Optional, Callable, Any
from functools import wraps
from teams.models import Team, TeamMember
from teams.constants import TeamRole

class AuthorizationMiddleware:
    """
    A simple middleware example for enforcing permissions based on URL path and HTTP method.
    Assumes the URL prefix contains the module (e.g., 'assets' maps to ASSET),
    and HTTP methods map to actions (GET→VIEW, POST→EDIT, etc.).
    """
    METHOD_ACTION_MAP = {
        'GET': 'VIEW',
        'POST': 'EDIT',
        'PUT': 'EDIT',
        'PATCH': 'APPROVE',
        'DELETE': 'DELETE',
    }

    def __init__(self, get_response=None):
        self.get_response = get_response

    def __call__(self, request):
        # Skip permission checks here; handle them in process_view instead
        return self.get_response(request)

    def process_view(self, request, view_func, view_args, view_kwargs):
        # If there is no authenticated user, skip or return 401 as needed
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None

        # Parse the module from the path, e.g. /api/assets/... → ASSET
        parts = request.path.strip('/').split('/')
        if len(parts) < 2 or parts[0] != 'api':
            return None
        
        raw = parts[1]
        module_key = raw.rstrip('s').upper()  # e.g. 'assets' -> 'ASSET'
        # Special-case URL segments for approve/export actions
        if len(parts) >= 4 and parts[3] == 'approve':
            action_key = 'APPROVE'
        elif len(parts) >= 4 and parts[3] == 'export':
            action_key = 'EXPORT'
        else:
            action_key = self.METHOD_ACTION_MAP.get(request.method, None)
        if not action_key:
            return None
        
        
        # Only consider roles that are currently valid
        now = timezone.now()
        role_ids = UserRole.objects.filter(
            user=request.user,
            valid_from__lte=now
        ).filter(Q(valid_to__gte=now) | Q(valid_to__isnull=True)).values_list('role_id', flat=True)

        # Check if any of the user's roles grants the required permission
        has = RolePermission.objects.filter(
            role_id__in=role_ids,
            permission__module=module_key,
            permission__action=action_key
        ).exists()

        if has:
            return None  # Allow request to proceed
        # Deny if no matching permission found
        return JsonResponse({'detail': 'Permission denied'}, status=403)

    # Authorization decorator for team endpoints
    

    def team_permission_required(required_role="LEADER"):
        """
        Decorator to enforce team permission checks on view functions.
        Only users with the required role or org admins can proceed.
        """
        def decorator(view_func: Callable) -> Callable:
            @wraps(view_func)
            def _wrapped_view(request, team_id=None, *args, **kwargs):
                user = request.user
                if not user.is_authenticated:
                    return JsonResponse({'error': 'Authentication required'}, status=401)
                # Org admin (superuser) can always proceed
                if hasattr(user, 'is_superuser') and user.is_superuser:
                    return view_func(request, team_id=team_id, *args, **kwargs)
                # Check team membership and role
                if not team_id:
                    return JsonResponse({'error': 'team_id required'}, status=400)
                membership = TeamMember.objects.filter(user_id=user.id, team_id=team_id).first()
                if not membership:
                    return JsonResponse({'error': 'Permission denied: not a team member'}, status=403)
                # Only allow if user has required role
                if required_role == "LEADER" and membership.role_id != TeamRole.LEADER:
                    return JsonResponse({'error': 'Permission denied: must be team leader'}, status=403)
                return view_func(request, team_id=team_id, *args, **kwargs)
            return _wrapped_view
        return decorator
