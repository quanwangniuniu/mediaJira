from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from access_control.models import Permission, RolePermission, UserRole

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