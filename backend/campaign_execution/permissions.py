from rest_framework import permissions
from django.contrib.auth.models import User


class CampaignExecutionPermission(permissions.BasePermission):
    """
    Permission class for campaign execution operations.
    Only Specialist or Senior Media Buyers can launch/pause campaigns.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Check if user has the required role for campaign execution
        user_roles = getattr(request.user, 'roles', [])
        allowed_roles = ['Specialist', 'Senior Media Buyer']
        
        return any(role in allowed_roles for role in user_roles)
    
    def has_object_permission(self, request, view, obj):
        # For object-level permissions, check if user can modify this specific campaign
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Campaign creator can always modify their campaigns
        if hasattr(obj, 'created_by') and obj.created_by == request.user:
            return True
            
        # Check role-based permissions
        user_roles = getattr(request.user, 'roles', [])
        allowed_roles = ['Specialist', 'Senior Media Buyer']
        
        return any(role in allowed_roles for role in user_roles)


class ReadOnlyPermission(permissions.BasePermission):
    """
    Read-only permission for viewing campaign data.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Allow read access to authenticated users
        return request.method in permissions.SAFE_METHODS
