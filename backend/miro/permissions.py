from rest_framework import permissions
from core.models import Project, ProjectMember
from miro.models import Board


class IsBoardProjectMember(permissions.BasePermission):
    """Allow access only to users with active membership on the board's project."""

    def has_object_permission(self, request, view, obj):
        project = self._resolve_project(obj)
        if not project:
            return False

        return ProjectMember.objects.filter(
            user=request.user,
            project=project,
            is_active=True,
        ).exists()

    def _resolve_project(self, obj):
        """Resolve project from object"""
        if isinstance(obj, Project):
            return obj
        if isinstance(obj, Board):
            return obj.project
        # For BoardItem and BoardRevision, get project via board
        if hasattr(obj, 'board'):
            return obj.board.project
        # Fallback: try project attribute
        return getattr(obj, 'project', None)


class HasValidShareToken(permissions.BasePermission):
    """Allow access via valid share token (no authentication required)."""

    def has_permission(self, request, view):
        """Check if share_token is valid"""
        share_token = view.kwargs.get('share_token')
        if not share_token:
            return False
        
        # Check if board exists with this share token
        return Board.objects.filter(share_token=share_token).exists()

