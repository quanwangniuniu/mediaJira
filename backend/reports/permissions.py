# backend/reports/permissions.py
# Integrated RBAC permission system for reports, aligned with Budget module
# but without blocking login endpoints.

from rest_framework import permissions
from utils.rbac_utils import has_rbac_permission, require_user_context, user_has_team


class ReportPermission(permissions.BasePermission):
    """
    Permissions for viewing, creating, and editing reports.
    Combines simple group roles and RBAC checks for organizations/teams.
    """

    def has_permission(self, request, view):
        if request is None or view is None:
            return False

        # ✅ Skip login and public endpoints
        if request.path.startswith("/auth/") or request.path.startswith("/api/auth/"):
            return True

        # Superuser bypass
        if request.user.is_superuser:
            return True

        # Ensure basic user context exists (only for authenticated APIs)
        if not require_user_context(request, user_has_team(request.user)):
            return False

        # Resolve context
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)
        action = getattr(view, "action", None)

        # Determine permission by HTTP method
        if action == "create" or (action is None and request.method == "POST"):
            return has_rbac_permission(request.user, "REPORT", "CREATE", organization, team_id)
        elif action == "list" or (action is None and request.method == "GET"):
            return has_rbac_permission(request.user, "REPORT", "VIEW", organization, team_id)
        elif action in ["update", "partial_update"] or request.method in ["PUT", "PATCH"]:
            return has_rbac_permission(request.user, "REPORT", "EDIT", organization, team_id)
        elif action == "export":
            return has_rbac_permission(request.user, "REPORT", "EXPORT", organization, team_id)

        return True

    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False

        # Superuser bypass
        if request.user.is_superuser:
            return True

        # Get org/team from object
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", getattr(request.user, "organization", None))

        # Object-level control
        if request.method == "GET":
            return has_rbac_permission(request.user, "REPORT", "VIEW", organization, team_id)
        elif request.method in ["PUT", "PATCH"]:
            return has_rbac_permission(request.user, "REPORT", "EDIT", organization, team_id)
        elif request.method == "POST" and "export" in request.path:
            return has_rbac_permission(request.user, "REPORT", "EXPORT", organization, team_id)

        return False


class ReportApprovalPermission(permissions.BasePermission):
    """Permission class for approving or rejecting reports."""

    def has_permission(self, request, view):
        if request is None or view is None:
            return False

        # Allow login endpoint
        if request.path.startswith("/auth/") or request.path.startswith("/api/auth/"):
            return True

        if request.user.is_superuser:
            return True

        if not require_user_context(request, user_has_team(request.user)):
            return False

        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)

        if request.method == "POST":
            return has_rbac_permission(request.user, "REPORT_APPROVAL", "APPROVE", organization, team_id)

        return False

    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False

        if request.user.is_superuser:
            return True

        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", None)

        return has_rbac_permission(request.user, "REPORT_APPROVAL", "APPROVE", organization, team_id)


class ReportExportPermission(permissions.BasePermission):
    """Permission class for exporting reports."""

    def has_permission(self, request, view):
        if request is None or view is None:
            return False

        # Allow login endpoint
        if request.path.startswith("/auth/") or request.path.startswith("/api/auth/"):
            return True

        if request.user.is_superuser:
            return True

        if not require_user_context(request, user_has_team(request.user)):
            return False

        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)

        if request.method == "POST":
            return has_rbac_permission(request.user, "REPORT", "EXPORT", organization, team_id)

        return False

    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False

        if request.user.is_superuser:
            return True

        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", None)

        return has_rbac_permission(request.user, "REPORT", "EXPORT", organization, team_id)


# Additional permission classes for compatibility with existing views
class IsReportViewer(permissions.BasePermission):
    """Permission class for viewing reports."""
    
    def has_permission(self, request, view):
        if request is None or view is None:
            return False
        
        # Allow login endpoint
        if request.path.startswith("/auth/") or request.path.startswith("/api/auth/"):
            return True
        
        if request.user.is_superuser:
            return True
        
        if not require_user_context(request, user_has_team(request.user)):
            return False
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)
        
        return has_rbac_permission(request.user, "REPORT", "VIEW", organization, team_id)
    
    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False
        
        if request.user.is_superuser:
            return True
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", getattr(request.user, "organization", None))
        
        return has_rbac_permission(request.user, "REPORT", "VIEW", organization, team_id)


class IsReportEditor(permissions.BasePermission):
    """Permission class for editing reports."""
    
    def has_permission(self, request, view):
        if request is None or view is None:
            return False
        
        # Allow login endpoint
        if request.path.startswith("/auth/") or request.path.startswith("/api/auth/"):
            return True
        
        if request.user.is_superuser:
            return True
        
        # For non-superusers, check team context
        if not require_user_context(request, user_has_team(request.user)):
            return False
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)
        
        # Allow both CREATE and EDIT for report editing
        return (has_rbac_permission(request.user, "REPORT", "CREATE", organization, team_id) or
                has_rbac_permission(request.user, "REPORT", "EDIT", organization, team_id))
    
    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Check if user is the owner of the report
        if hasattr(obj, 'owner_id') and str(obj.owner_id) == str(request.user.id):
            return True
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", getattr(request.user, "organization", None))
        
        return has_rbac_permission(request.user, "REPORT", "EDIT", organization, team_id)


class IsApprover(permissions.BasePermission):
    """Permission class for approving reports."""
    
    def has_permission(self, request, view):
        if request is None or view is None:
            return False
        
        # Allow login endpoint
        if request.path.startswith("/auth/") or request.path.startswith("/api/auth/"):
            return True
        
        if request.user.is_superuser:
            return True
        
        if not require_user_context(request, user_has_team(request.user)):
            return False
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)
        
        return has_rbac_permission(request.user, "REPORT_APPROVAL", "APPROVE", organization, team_id)
    
    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False
        
        if request.user.is_superuser:
            return True
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", getattr(request.user, "organization", None))
        
        return has_rbac_permission(request.user, "REPORT_APPROVAL", "APPROVE", organization, team_id)


class IsAuthorApproverOrAdmin(permissions.BasePermission):
    """Permission class for report authors, approvers, or admins."""
    
    def has_permission(self, request, view):
        if request is None or view is None:
            return False
        
        # Allow login endpoint
        if request.path.startswith("/auth/") or request.path.startswith("/api/auth/"):
            return True
        
        if request.user.is_superuser:
            return True
        
        if not require_user_context(request, user_has_team(request.user)):
            return False
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)
        
        # Allow if user has any of these permissions
        return (has_rbac_permission(request.user, "REPORT", "EDIT", organization, team_id) or
                has_rbac_permission(request.user, "REPORT_APPROVAL", "APPROVE", organization, team_id) or
                has_rbac_permission(request.user, "REPORT", "VIEW", organization, team_id))
    
    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False
        
        if request.user.is_superuser:
            return True
        
        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", getattr(request.user, "organization", None))
        
        # Check if user is the author
        if hasattr(obj, 'owner_id') and str(obj.owner_id) == str(request.user.id):
            return True
        
        # Check RBAC permissions
        return (has_rbac_permission(request.user, "REPORT", "EDIT", organization, team_id) or
                has_rbac_permission(request.user, "REPORT_APPROVAL", "APPROVE", organization, team_id) or
                has_rbac_permission(request.user, "REPORT", "VIEW", organization, team_id))
