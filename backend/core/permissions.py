from rest_framework import permissions

from core.models import Project, ProjectMember

PROJECT_MEMBER_MANAGEMENT_ROLES = {"owner", "Super Administrator", "Team Leader"}


def can_manage_project_members(user, project):
    membership = ProjectMember.objects.filter(
        user=user,
        project=project,
        is_active=True,
    ).first()
    return bool(membership and membership.role in PROJECT_MEMBER_MANAGEMENT_ROLES)


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
    Allow member management for privileged project roles with active memberships.
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

        return membership.role in PROJECT_MEMBER_MANAGEMENT_ROLES

    def has_permission(self, request, view):
        # Default True; object-level checks enforce actual permissions.
        return True

    def _resolve_project(self, obj):
        if isinstance(obj, Project):
            return obj
        return getattr(obj, 'project', None)
