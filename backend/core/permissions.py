from rest_framework import permissions

from core.models import Project, ProjectMember


class IsProjectMember(permissions.BasePermission):
    """Allow access only to users with active membership on the project."""

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
        if isinstance(obj, Project):
            return obj
        return getattr(obj, 'project', None)


class IsProjectOwner(permissions.BasePermission):
    """Allow access only to the project owner."""

    def has_object_permission(self, request, view, obj):
        project = self._resolve_project(obj)
        if not project:
            return False
        return project.owner_id == request.user.id

    def _resolve_project(self, obj):
        if isinstance(obj, Project):
            return obj
        return getattr(obj, 'project', None)


class CanManageProjectMembers(permissions.BasePermission):
    """
    Allow member management for owners and members with active memberships.
    """

    def has_object_permission(self, request, view, obj):
        project = self._resolve_project(obj)
        if not project:
            return False

        membership = ProjectMember.objects.filter(
            user=request.user,
            project=project,
            is_active=True,
        ).first()

        if not membership:
            return False

        return membership.role in ['owner', 'member']

    def has_permission(self, request, view):
        # Default True; object-level checks enforce actual permissions.
        return True

    def _resolve_project(self, obj):
        if isinstance(obj, Project):
            return obj
        return getattr(obj, 'project', None)

