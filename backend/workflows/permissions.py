"""
Permission classes for workflow API endpoints.
Ensures users can only access workflows belonging to projects they are members of.
"""
from rest_framework import permissions
from core.models import ProjectMember


class WorkflowProjectPermission(permissions.BasePermission):
    """
    Permission to check if user has access to workflow based on project membership.
    
    - Users can only access workflows for projects they are members of
    - Global workflows (project_id=None) are accessible to all authenticated users
    """
    
    def has_permission(self, request, view):
        """Check if user is authenticated"""
        return request.user and request.user.is_authenticated
    
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
        if hasattr(obj, 'workflow'):
            # This is a Node or Connection, get parent workflow
            workflow = obj.workflow
        else:
            # This is a Workflow
            workflow = obj
        
        # Global workflows (no project) are accessible to all authenticated users
        if workflow.project_id is None:
            return True
        
        # Check if user is a member of the workflow's project
        return ProjectMember.objects.filter(
            user=request.user,
            project_id=workflow.project_id,
            is_active=True
        ).exists()



