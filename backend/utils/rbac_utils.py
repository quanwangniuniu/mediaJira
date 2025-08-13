from access_control.models import UserRole, RolePermission
from core.models import Permission
"""
RBAC permission check utility functions
"""

def has_rbac_permission(user, module, action, organization, team_id=None):
    """
    Check if a user has permission to access a specific module and action
    
    Args:
        user: The user to check permissions for (non-super admin users only)
        module: The module name (e.g., 'BUDGET_REQUEST')
        action: The action name (e.g., 'VIEW', 'EDIT', 'APPROVE')
        team_id: Optional team ID for team-specific permissions
        organization: Organization object to check organization boundaries (required)
    """
    # Check if required parameters are None
    if user is None or module is None or action is None or organization is None:
        return False

    if not user.is_authenticated:
        return False

    try:
        # Get all valid roles for the user
        user_roles_query = UserRole.objects.filter(
            user=user, 
            valid_to__isnull=True
        )

        # If team_id is provided, filter the user roles by team
        if team_id is not None:
            user_roles = user_roles_query.filter(team=team_id)
        else:
            # If no team_id provided, get all user roles (including those without team)
            user_roles = user_roles_query

        # Check if these roles have corresponding permissions
        for user_role in user_roles:
            if RolePermission.objects.filter(
                role=user_role.role,
                permission__module=module,
                permission__action=action,
                is_deleted=False
            ).exists():
                # Check organization boundaries - user can only access their own organization
                if user_role.role.organization == organization:
                    return True

        return False

    except Exception:
        return False

def require_user_context(request, require_team_context=False):
    """
    Ensure x-user-role is present, and optionally x-team-id.
    """
    # Check if request is None
    if request is None:
        return False
    
    # Check if request.headers is None
    if request.headers is None:
        return False
    
    if not request.headers.get('x-user-role'):
        return False
    if require_team_context and not request.headers.get('x-team-id'):
        return False
    return True

def user_has_team(user):
    """Check if a user has at least one team"""
    # Check if user is None or user is not authenticated
    if user is None or not user.is_authenticated:
        return False
    
    try:
        return UserRole.objects.filter(
            user=user,
            team__isnull=False,
            valid_to__isnull=True
        ).exists()
    except Exception:
        return False
    
    