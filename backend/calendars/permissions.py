from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import permissions

from core.models import Organization
from .models import Calendar, CalendarShare, CalendarSubscription, Event


User = get_user_model()


def get_user_organization(user: User) -> Organization | None:
    """
    Helper to fetch the current organization from the user.
    """
    org_id = getattr(user, "organization_id", None)
    if not org_id:
        return None
    return Organization.objects.filter(id=org_id).first()


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
    Calendar-level access control based on ownership and CalendarShare.

    Expected view attributes:
    - required_permission: one of CalendarShare.PERMISSION_CHOICES keys
    """

    message = "You do not have access to this calendar."

    def has_object_permission(self, request, view, obj: Any) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        organization = get_user_organization(user)
        if not organization:
            return False

        if isinstance(obj, Event):
            calendar = obj.calendar
        elif isinstance(obj, Calendar):
            calendar = obj
        else:
            return False

        if calendar.organization_id != organization.id:
            return False

        if calendar.owner_id == user.id:
            return True

        required_permission = getattr(view, "required_permission", "view_all")
        share = (
            CalendarShare.objects.filter(
                organization=organization,
                calendar=calendar,
                shared_with=user,
                is_deleted=False,
            )
            .only("permission")
            .first()
        )
        if not share:
            return False

        return share.has_permission(required_permission)


class EventAccessPermission(CalendarAccessPermission):
    """
    Same as CalendarAccessPermission but for Event objects.
    """

    def has_object_permission(self, request, view, obj: Any) -> bool:
        if not isinstance(obj, Event):
            return False
        return super().has_object_permission(request, view, obj)


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

