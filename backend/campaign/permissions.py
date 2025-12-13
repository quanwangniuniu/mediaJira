from rest_framework import permissions
from utils.rbac_utils import has_rbac_permission, require_user_context, user_has_team
from access_control.models import UserRole


def has_media_buyer_role(user, organization, team_id=None):
    """
    Check if user has Specialist Media Buyer or Senior Media Buyer role.
    
    Args:
        user: User to check
        organization: Organization object
        team_id: Optional team ID
        
    Returns:
        bool: True if user has one of the required roles
    """
    if not user or not user.is_authenticated or not organization:
        return False
    
    try:
        user_roles_query = UserRole.objects.filter(
            user=user,
            valid_to__isnull=True,
            role__organization=organization
        )
        
        if team_id is not None:
            user_roles_query = user_roles_query.filter(team_id=team_id)
        
        allowed_role_names = ['Specialist Media Buyer', 'Senior Media Buyer']
        
        for user_role in user_roles_query:
            if user_role.role.name in allowed_role_names:
                return True
        
        return False
    except Exception:
        return False


class CampaignPermission(permissions.BasePermission):
    """
    Permissions for campaign execution operations.
    Uses RBAC for general access, with role checks for launch/pause actions.
    """
    
    def has_permission(self, request, view):
        """Check if the user has permission to access the entire view"""
        
        if request is None or view is None:
            return False
        
        # Super admin bypass all permission checks
        if request.user.is_superuser:
            return True
        
        # Check required request headers
        if not require_user_context(request, user_has_team(request.user)):
            return False
        
        # Get team_id if user has team
        team_id = request.headers.get('x-team-id') if user_has_team(request.user) else None
        
        # Get organization from user
        organization = getattr(request.user, 'organization', None)
        if not organization:
            return False
        
        # Check RBAC permissions based on action type or HTTP method
        action = getattr(view, 'action', None)
        
        # Launch action requires Media Buyer role
        if action == 'launch' or (hasattr(view, 'action') and 'launch' in request.path):
            if not has_media_buyer_role(request.user, organization, team_id):
                return False
            return has_rbac_permission(request.user, 'CAMPAIGN', 'EDIT', organization, team_id)
        
        # Pause action requires Media Buyer role
        if action == 'pause' or (hasattr(view, 'action') and 'pause' in request.path):
            if not has_media_buyer_role(request.user, organization, team_id):
                return False
            return has_rbac_permission(request.user, 'CAMPAIGN', 'EDIT', organization, team_id)
        
        # Create action
        if action == 'create' or (action is None and request.method == 'POST'):
            return has_rbac_permission(request.user, 'CAMPAIGN', 'EDIT', organization, team_id)
        
        # List/Retrieve action
        if action in ['list', 'retrieve'] or (action is None and request.method == 'GET'):
            return has_rbac_permission(request.user, 'CAMPAIGN', 'VIEW', organization, team_id)
        
        # Update action
        if action in ['update', 'partial_update'] or (action is None and request.method in ['PUT', 'PATCH']):
            return has_rbac_permission(request.user, 'CAMPAIGN', 'EDIT', organization, team_id)
        
        # Delete action
        if action == 'destroy' or (action is None and request.method == 'DELETE'):
            return has_rbac_permission(request.user, 'CAMPAIGN', 'DELETE', organization, team_id)
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """Check if the user has permission to access a specific object"""
        
        if request is None or view is None or obj is None:
            return False
        
        # Super admin bypass all object permission checks
        if request.user.is_superuser:
            return True
        
        # Get team_id if user has team
        team_id = request.headers.get('x-team-id') if user_has_team(request.user) else None
        
        # Get organization from the object (via created_by or task.project)
        organization = None
        if hasattr(obj, 'created_by') and hasattr(obj.created_by, 'organization'):
            organization = obj.created_by.organization
        elif hasattr(obj, 'task') and obj.task and hasattr(obj.task, 'project'):
            if hasattr(obj.task.project, 'organization'):
                organization = obj.task.project.organization
        else:
            organization = getattr(request.user, 'organization', None)
        
        if not organization:
            return False
        
        action = getattr(view, 'action', None)
        
        # Launch action requires Media Buyer role
        if 'launch' in request.path:
            if not has_media_buyer_role(request.user, organization, team_id):
                return False
            return has_rbac_permission(request.user, 'CAMPAIGN', 'EDIT', organization, team_id)
        
        # Pause action requires Media Buyer role
        if 'pause' in request.path:
            if not has_media_buyer_role(request.user, organization, team_id):
                return False
            return has_rbac_permission(request.user, 'CAMPAIGN', 'EDIT', organization, team_id)
        
        # Owner can always view/edit their own campaigns
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            if action in ['retrieve', 'update', 'partial_update'] or request.method in ['GET', 'PUT', 'PATCH']:
                return has_rbac_permission(request.user, 'CAMPAIGN', 'VIEW', organization, team_id)
        
        # View action
        if action == 'retrieve' or request.method == 'GET':
            return has_rbac_permission(request.user, 'CAMPAIGN', 'VIEW', organization, team_id)
        
        # Update action
        if action in ['update', 'partial_update'] or request.method in ['PUT', 'PATCH']:
            return has_rbac_permission(request.user, 'CAMPAIGN', 'EDIT', organization, team_id)
        
        # Delete action
        if action == 'destroy' or request.method == 'DELETE':
            return has_rbac_permission(request.user, 'CAMPAIGN', 'DELETE', organization, team_id)
        
        return False

