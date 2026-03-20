from rest_framework import permissions

from core.models import Project, ProjectMember

# NOTE:
# - Project ownership is stored in `Project.owner`.
# - ProjectMember.role is a *per-project* persisted role string.
#   We use it only to decide which users can manage members/roles.
PROJECT_MEMBER_ADMIN_SUPER_ROLES = {
    "Super Administrator",
    "Organization Admin",
    "Team Leader",
    "Campaign Manager",
}


def is_project_owner(user, project: Project) -> bool:
    """
    Actor is the owner of this project (authoritative source: `Project.owner`).
    """
    if user is None or not getattr(user, "is_authenticated", False):
        return False
    if not project:
        return False
    return project.owner_id == user.id


def can_invite_project_members(user, project: Project) -> bool:
    """
    Invite operation is allowed for:
    - project owner (authoritative source: Project.owner)
    - privileged project member roles (admin/super roles stored in ProjectMember.role)
    """
    return can_manage_project_members(user, project)


def can_manage_project_members(user, project: Project) -> bool:
    """
    Manage operation (change roles / approve invitations / remove members) is allowed to:
    - project owner (via `Project.owner`)
    - admin/super roles from the project membership (`ProjectMember.role`)
    """
    if is_project_owner(user, project):
        return True

    membership = ProjectMember.objects.filter(
        user=user,
        project=project,
        is_active=True,
    ).first()
    if not membership:
        return False
    return membership.role in PROJECT_MEMBER_ADMIN_SUPER_ROLES or membership.role == "owner"


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

        return can_manage_project_members(request.user, project)

    def has_permission(self, request, view):
        # Default True; object-level checks enforce actual permissions.
        return True

    def _resolve_project(self, obj):
        if isinstance(obj, Project):
            return obj
        return getattr(obj, 'project', None)
