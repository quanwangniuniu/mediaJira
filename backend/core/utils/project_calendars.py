from __future__ import annotations

from typing import Optional


PROJECT_ROLE_TO_CALENDAR_PERMISSION = {
    "owner": "manage",
    "member": "edit",
    "viewer": "view_all",
    "Team Leader": "manage",
    "Super Administrator": "manage",
}


def map_project_role_to_calendar_permission(role: str | None) -> str:
    if not role:
        return "view_all"
    return PROJECT_ROLE_TO_CALENDAR_PERMISSION.get(role, "view_all")


def ensure_project_calendar(project):
    from calendars.models import Calendar

    defaults = {
        "organization": project.organization,
        "owner": project.owner,
        "name": f"{project.name} Calendar",
        "color": "#1E88E5",
        "visibility": "private",
        "timezone": "UTC",
        "is_primary": False,
    }
    calendar, created = Calendar.objects.get_or_create(project=project, defaults=defaults)
    if created:
        return calendar

    changed_fields: list[str] = []
    if calendar.organization_id != project.organization_id:
        calendar.organization = project.organization
        changed_fields.append("organization")
    if calendar.owner_id != project.owner_id:
        calendar.owner = project.owner
        changed_fields.append("owner")
    if changed_fields:
        calendar.save(update_fields=changed_fields + ["updated_at"])
    return calendar


def sync_project_member_calendar_access(project, user, role: str | None, include_subscription: bool = True):
    calendar = ensure_project_calendar(project)
    # Project-bound calendar access is now resolved dynamically from ProjectMember.
    # Keep this helper as a compatibility no-op for older callsites/scripts.
    if calendar.project_id:
        return calendar

    from calendars.models import CalendarShare, CalendarSubscription

    if project.owner_id and user.id == project.owner_id:
        CalendarShare.objects.filter(
            organization=project.organization,
            calendar=calendar,
            shared_with=user,
            is_deleted=False,
        ).update(is_deleted=True)
        return calendar

    permission = map_project_role_to_calendar_permission(role)
    share = (
        CalendarShare.objects.filter(
            organization=project.organization,
            calendar=calendar,
            shared_with=user,
        )
        .order_by("-created_at")
        .first()
    )
    if share:
        share.permission = permission
        share.can_invite_others = permission in {"manage", "owner"}
        share.notification_enabled = True
        share.is_deleted = False
        share.save()
    else:
        CalendarShare.objects.create(
            organization=project.organization,
            calendar=calendar,
            shared_with=user,
            permission=permission,
            can_invite_others=permission in {"manage", "owner"},
            notification_enabled=True,
        )

    if include_subscription:
        subscription = (
            CalendarSubscription.objects.filter(
                organization=project.organization,
                user=user,
                calendar=calendar,
            )
            .order_by("-created_at")
            .first()
        )
        if subscription:
            subscription.source_url = None
            subscription.is_hidden = False
            subscription.notification_enabled = True
            subscription.is_deleted = False
            subscription.save()
        else:
            CalendarSubscription.objects.create(
                organization=project.organization,
                user=user,
                calendar=calendar,
                source_url=None,
                is_hidden=False,
                notification_enabled=True,
            )
    return calendar


def remove_project_member_calendar_access(project, user):
    from calendars.models import Calendar, CalendarShare, CalendarSubscription

    calendar: Optional[Calendar] = (
        Calendar.objects.filter(project=project, organization=project.organization, is_deleted=False).first()
    )
    if not calendar:
        return
    if calendar.project_id:
        # Project-bound calendar access is now resolved dynamically from ProjectMember.
        return

    CalendarShare.objects.filter(
        organization=project.organization,
        calendar=calendar,
        shared_with=user,
        is_deleted=False,
    ).update(is_deleted=True)

    CalendarSubscription.objects.filter(
        organization=project.organization,
        user=user,
        calendar=calendar,
        is_deleted=False,
    ).update(is_deleted=True)
