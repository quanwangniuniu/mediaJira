"""
Permission classes for workflow API endpoints.
Ensures users can only access workflows belonging to their organization.
"""
from rest_framework import permissions


class WorkflowProjectPermission(permissions.BasePermission):
    """
    Permission to check if user has access to workflow based on organization.

    Rules:
    - User must be authenticated.
    - If workflow.organization is set, the requesting user's organization
      must match.
    - Global workflows (organization is null) are accessible to all
      authenticated users.

    This applies both to Workflow objects themselves and to related
    WorkflowNode / WorkflowConnection instances (via their workflow).
    """

    def has_permission(self, request, view):
        """Allow only authenticated users to access workflow APIs."""
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        """
        Check if user has access to the workflow object.

        Args:
            request: HTTP request
            view: View being accessed
            obj: Workflow, WorkflowNode, or WorkflowConnection instance

        Returns:
            True if user has access, False otherwise
        """
        # Determine the workflow object
        if hasattr(obj, "workflow"):
            # This is a Node or Connection, get parent workflow
            workflow = obj.workflow
        else:
            # This is a Workflow
            workflow = obj

        # Global workflows (no organization) are accessible to all authenticated users
        if workflow.organization_id is None:
            return True

        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Enforce organization-based access
        return user.organization_id == workflow.organization_id

