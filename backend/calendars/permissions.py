from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import permissions

from core.models import Organization, ProjectMember, Project
from .models import Calendar, CalendarSubscription, Event


User = get_user_model()


def get_user_organization(user: User) -> Organization | None:
    """
    Helper to fetch the current organization from the user.
    """
    org_id = getattr(user, "organization_id", None)
    if not org_id:
        return None
    return Organization.objects.filter(id=org_id).first()


def get_user_project_membership(user: User, project: Project) -> ProjectMember | None:
    """
    Get the ProjectMember record for a user in a specific project.
    Returns None if user is not a member of the project.
    """
    if not user or not user.is_authenticated:
        return None
    return ProjectMember.objects.filter(
        user=user,
        project=project,
        is_active=True,
        is_deleted=False,
    ).first()


def is_project_owner(user: User, project: Project) -> bool:
    """
    Check if the user is the project owner.
    """
    if not user or not user.is_authenticated:
        return False
    return project.owner_id == user.id


def is_project_manager_or_owner(user: User, project: Project) -> bool:
    """
    Check if the user is a project owner or has a management role.
    Now simplified: project owner only (for backward compatibility).
    """
    return is_project_owner(user, project)


def is_project_member(user: User, project: Project) -> bool:
    """
    Check if the user is an active member of the project.
    """
    if not user or not user.is_authenticated:
        return False
    
    return ProjectMember.objects.filter(
        user=user,
        project=project,
        is_active=True,
        is_deleted=False,
    ).exists()


class IsAuthenticatedInOrganization(permissions.BasePermission):
    """
    Ensures the user is authenticated and belongs to an organization.
    """

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return bool(getattr(user, "organization_id", None))


class CalendarAccessPermission(permissions.BasePermission):
    """
    Calendar-level access control based on ProjectMember.

    Permission levels (simplified: members can edit):
    - view_all: Any active project member can view
    - edit: Any active project member can edit
    - manage: Any active project member can manage
    - delete: Only project owner can delete calendars
    
    Expected view attributes:
    - required_permission: one of "view_all", "edit", "manage", "delete"
    """

    message = "You do not have access to this calendar."

    def has_object_permission(self, request, view, obj: Any) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        organization = get_user_organization(user)
        if not organization:
            return False

        # Determine the calendar from the object
        if isinstance(obj, Event):
            calendar = obj.calendar
        elif isinstance(obj, Calendar):
            calendar = obj
        else:
            return False

        # Must be in the same organization
        if calendar.organization_id != organization.id:
            return False

        # Get the project from the calendar
        project = calendar.project
        if not project:
            return False

        # Check if user is a member of the project
        if not is_project_member(user, project):
            return False

        # Determine required permission level
        required_permission = getattr(view, "required_permission", "view_all")

        # For view_all, edit, manage: any project member has access
        if required_permission in ["view_all", "edit", "manage"]:
            return True

        # For delete permission, only project owner can delete calendars
        if required_permission == "delete":
            return is_project_owner(user, project)

        return False


class EventAccessPermission(permissions.BasePermission):
    """
    Event-level access control based on ProjectMember.

    Permission levels:
    - view_all: Any active project member can view
    - edit: Any active project member can create/edit events
    - delete: Event creator can delete own event, or project owner can delete any event
    
    Expected view attributes:
    - required_permission: one of "view_all", "edit", "delete"
    """

    message = "You do not have access to this event."

    def has_object_permission(self, request, view, obj: Any) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        organization = get_user_organization(user)
        if not organization:
            return False

        if not isinstance(obj, Event):
            return False

        calendar = obj.calendar
        if not calendar:
            return False

        # Must be in the same organization
        if calendar.organization_id != organization.id:
            return False

        # Get the project from the calendar
        project = calendar.project
        if not project:
            return False

        # Check if user is a member of the project
        if not is_project_member(user, project):
            return False

        # Determine required permission level
        required_permission = getattr(view, "required_permission", "view_all")

        # For view_all, any project member has access
        if required_permission == "view_all":
            return True

        # For edit permission, any project member can create/edit events
        if required_permission == "edit":
            return True

        # For delete permission: creator can delete own event, or project owner can delete any
        if required_permission == "delete":
            # Event creator can delete their own event
            if obj.created_by_id == user.id:
                return True
            # Project owner can delete any event
            return is_project_owner(user, project)

        return False


class SubscriptionOwnerPermission(permissions.BasePermission):
    """
    Ensures the current user owns the subscription object.
    """

    message = "You do not have access to this subscription."

    def has_object_permission(self, request, view, obj: Any) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return obj.user_id == user.id

