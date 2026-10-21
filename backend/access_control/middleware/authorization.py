from django.http import JsonResponse
from django.db import connection
from datetime import timedelta
from core.models import Organization
from core.services.tenant import slug_to_schema_name
from access_control.models import RolePermission, UserRole, AdminOverrideAudit
from access_control import services as access_control_services
from access_control.services import get_user_permission_bundle
from typing import Optional, Callable, Any
from functools import wraps
from core.models import Team, TeamMember, TeamRole

class AuthorizationMiddleware:
    """
    Enforces module permissions based on URL path and HTTP method.

    access_control.services resolves each request to (module, action) and an
    enforcement state. Only "active" decisions (ASSET and /api/campaigns/**)
    create a gate; "planned" routes behave like unmapped ones (no 403, no
    override-audit row). Gate flow is unchanged: anonymous skipped; superuser
    and level-2 org admin bypass (audited); zero-role grace; fail open on
    query errors. See docs/decisions/MED-335-authorization-policy-matrix.md.
    """

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

        # Parse the module/action from the path first, e.g. /api/assets/... → ASSET.
        # This must happen before the superuser/org-admin bypass checks below so we
        # know whether there's an actual permission gate to bypass: audit logging
        # only fires when a real gate would have applied here — e.g. not
        # for /api/auth/login/, which never reaches a module permission check.
        decision = access_control_services.resolve_policy(request.path, request.method)
        module_key, action_key = decision.module, decision.action
        # MED-335: only "active" decisions create a gate.
        has_permission_gate = decision.enforced

        # Superusers bypass module-level authorization. The @require_* decorators
        # in this module already short-circuit for superusers ("Org admin
        # (superuser) can always proceed"); this middleware was missing the same
        # bypass, so superusers were denied any module whose RBAC permissions
        # had not been seeded.
        if getattr(user, 'is_superuser', False):
            if has_permission_gate:
                self._log_override(request, user, 'SUPERUSER', module_key, action_key)
            return None

        # Propagate org-admin role context for downstream permission checks (MED-240).
        # Default False; set True when a valid Organization Admin (level == 2) role exists.
        request.is_org_admin = False

        # Org admins (role level == 2) bypass module-level permission checks.
        # Level 2 is the Organization Admin level created by assign_org_admin().
        # This matches the criterion used by is_org_admin() in admin_utils.py.
        # TenantSchemaMiddleware has already set the correct search_path, so
        # querying UserRole here hits the right tenant schema directly.
        # Temporal validity is enforced: expired admin roles do not grant bypass.
        try:
            if access_control_services.user_has_org_admin_bypass_role(user):
                request.is_org_admin = True
                if has_permission_gate:
                    self._log_override(request, user, 'ORG_ADMIN', module_key, action_key)
                return None
        except Exception:
            pass

        if not has_permission_gate:
            return None

        # MED-299: use the cached permission bundle as a fast path.
        # If cache resolution fails, continue through the existing PostgreSQL path below.
        try:
            with connection.cursor() as cursor:
                cursor.execute("SHOW search_path")
                search_path = cursor.fetchone()[0]

            schema_name = search_path.split(",")[0].strip().strip('"')
            bundle = get_user_permission_bundle(
                request.user.id,
                schema_name,
            )

            required_permission = f"{module_key}:{action_key}"

            if required_permission in bundle["permissions"]:
                return None

            if bundle["has_any_role"]:
                return JsonResponse({'detail': 'Permission denied'}, status=403)

            return None

        except Exception:
            pass

        # CRITICAL: After multi-organization restructuring, UserRole and RolePermission
        # tables now live in TENANT schemas, not public schema. TenantSchemaMiddleware
        # has already set the correct search_path, so we query directly without switching.
        #
        # Wrap permission queries in try/except to gracefully handle cases where:
        # 1. Tables don't exist yet (new organizations)
        # 2. No roles/permissions have been set up yet
        try:
            has = access_control_services.user_has_module_permission(
                request.user, module_key, action_key
            )

            if not has:
                # Only enforce denial if the user has been assigned at least one role.
                # If no roles exist (new org / no RBAC configured), allow through as a
                # grace period.  Users with roles that are all expired or lack the
                # required permission are still denied.
                if not access_control_services.user_has_any_role(request.user):
                    return None

        except Exception:
            # If permission tables don't exist or query fails, allow access.
            # This handles new organizations where RBAC hasn't been configured yet.
            return None

        if has:
            return None  # Allow request to proceed
        # Deny if no matching permission found
        return JsonResponse({'detail': 'Permission denied'}, status=403)

    def _resolve_org_id_from_search_path(self):
        """
        Resolve the Organization whose tenant schema matches the DB
        connection's *current* search_path, rather than trusting
        user.current_organization_id.

        TenantSchemaMiddleware runs before this middleware and has already
        issued `SET search_path TO org_xxx, public` for this request. Reading
        it back here — instead of the user's saved current_organization_id —
        guarantees the audit row's organization always matches the tenant
        schema the row is actually written into. user.current_organization_id
        can diverge from that: it's a value cached on the user object, and a
        request can be served against a different org's schema than the
        user's own "current" org (e.g. an org-scoped token/header switched
        the schema for just this request without updating the user row).
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute('SHOW search_path')
                search_path = cursor.fetchone()[0]
            schema_name = search_path.split(',')[0].strip().strip('"')
            if schema_name in ('public', '$user'):
                return None
            # slug_to_schema_name() isn't reliably reversible in general (it
            # collapses every non-alphanumeric character to '_'), so match by
            # recomputing the forward transform per org rather than parsing
            # the schema name back into a slug. This only runs on override
            # events (superuser/org-admin bypasses), which are rare, so a
            # full scan of organizations is not a hot-path concern.
            for org_id, slug in Organization.objects.filter(is_deleted=False).values_list('id', 'slug'):
                if slug_to_schema_name(slug) == schema_name:
                    return org_id
            return None
        except Exception:
            return None

    def _log_override(self, request, user, override_type, module_key, action_key):
        """
        Record an audit row when a superuser/org-admin bypasses the module
        permission check. Best-effort: a logging failure must never block
        the request the bypass already allowed.
        """
        try:
            org_id = self._resolve_org_id_from_search_path()
            AdminOverrideAudit.objects.create(
                user=user,
                organization_id=org_id,
                override_type=override_type,
                module=module_key,
                action=action_key,
                method=request.method,
                path=request.path,
                ip_address=request.META.get('REMOTE_ADDR'),
                reason=request.META.get('HTTP_X_OVERRIDE_REASON', ''),
            )
        except Exception:
            pass

    # Authorization decorator for team endpoints
    

    def team_permission_required(required_role="LEADER"):
        """
        Decorator to enforce team permission checks on view functions.
        "MEMBER" accepts any member of the team; "LEADER" requires
        TeamRole.LEADER. Superusers and level-2 org admins of the current
        organization (see user_is_current_org_admin) bypass the membership
        check; everyone else needs the real TeamMember row.
        """
        def decorator(view_func: Callable) -> Callable:
            @wraps(view_func)
            def _wrapped_view(request, team_id=None, *args, **kwargs):
                user = request.user
                if not user.is_authenticated:
                    return JsonResponse({'error': 'Authentication required'}, status=401)
                # Superusers and current-org level-2 admins can always proceed
                if (hasattr(user, 'is_superuser') and user.is_superuser) or \
                        access_control_services.user_is_current_org_admin(user):
                    return view_func(request, team_id=team_id, *args, **kwargs)
                # Check team membership and role
                if not team_id:
                    return JsonResponse({'error': 'team_id required'}, status=400)

                # MED-335: Team/TeamMember are tenant-scoped; query under the
                # search_path TenantSchemaMiddleware already selected.
                membership = TeamMember.objects.filter(user=user, team_id=team_id).first()
                if not membership:
                    return JsonResponse({'error': 'Permission denied: not a team member'}, status=403)
                # Only allow if user has required role
                if required_role == "LEADER" and membership.role_id != TeamRole.LEADER:
                    return JsonResponse({'error': 'Permission denied: must be team leader'}, status=403)

                return view_func(request, team_id=team_id, *args, **kwargs)
            return _wrapped_view
        return decorator

    def org_admin_required(view_func: Callable) -> Callable:
        """MED-335: organization-wide Team endpoints (list/search, create,
        delete). Superusers and current-org level-2 admins only."""
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = request.user
            if not user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            if user.is_superuser or access_control_services.user_is_current_org_admin(user):
                return view_func(request, *args, **kwargs)
            return JsonResponse({'error': 'Permission denied: organization admin required'}, status=403)
        return _wrapped_view
