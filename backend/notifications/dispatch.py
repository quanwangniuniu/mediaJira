"""
External channel dispatch (email mock, Slack mock) after in-app notifications.

Respects UserNotificationPreference JSON and user_preferences.NotificationSettings.
"""

from __future__ import annotations

import logging

from django.contrib.auth import get_user_model
from django.utils import timezone

logger = logging.getLogger(__name__)
User = get_user_model()


def maybe_dispatch_external_channels(*, notification, user, event_type: str) -> None:
    dispatch_notification_channels(user.id, event_type, notification.title)


def dispatch_notification_channels(user_id: int, trigger_type: str, message: str) -> dict:
    """
    Mock dispatch for email/Slack; used by user_preferences.NotificationDispatcher.
    """
    from .services import is_email_enabled, is_slack_integration_enabled

    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return {"error": "User not found", "mock_logs": [], "channels_would_notify": []}

    mock_logs: list[str] = []
    channels: list[str] = []

    if _is_in_quiet_hours(user):
        return {
            "user_id": user_id,
            "trigger_type": trigger_type,
            "quiet_hours_active": True,
            "channels_would_notify": [],
            "mock_logs": [f"[notifications] Skipped quiet hours user={user_id}"],
        }

    try:
        from user_preferences.models import NotificationSettings, SlackIntegration

        settings_rows = NotificationSettings.objects.filter(
            user=user,
            setting_key=trigger_type,
            enabled=True,
        )
        for row in settings_rows:
            channels.append(row.channel_name)
            if row.channel_id == 1:
                if SlackIntegration.objects.filter(user=user, is_active=True).exists() and is_slack_integration_enabled(
                    user
                ):
                    si = SlackIntegration.objects.filter(user=user, is_active=True).first()
                    mock_logs.append(f"[MOCK SLACK] webhook user={user_id} msg={message[:120]}")
                else:
                    mock_logs.append("[MOCK SLACK] skipped (no integration or preference off)")
            else:
                if is_email_enabled(user, trigger_type):
                    mock_logs.append(f"[MOCK EMAIL] to={user.email} trigger={trigger_type}")
                else:
                    mock_logs.append("[MOCK EMAIL] skipped (preference off)")

        if not settings_rows.exists():
            if is_email_enabled(user, trigger_type):
                mock_logs.append(f"[MOCK EMAIL] default route to={user.email}")
            if is_slack_integration_enabled(user) and SlackIntegration.objects.filter(
                user=user, is_active=True
            ).exists():
                mock_logs.append(f"[MOCK SLACK] default route user={user_id}")
    except Exception as exc:  # pragma: no cover
        logger.warning("dispatch_notification_channels: %s", exc)
        mock_logs.append(f"[notifications] dispatch error: {exc}")

    return {
        "user_id": user_id,
        "trigger_type": trigger_type,
        "quiet_hours_active": False,
        "channels_would_notify": channels or ["default"],
        "mock_logs": mock_logs,
    }


def _is_in_quiet_hours(user) -> bool:
    try:
        import pytz

        prefs = user.preferences
        if not prefs.quiet_hours_start or not prefs.quiet_hours_end:
            return False
        tz_name = prefs.timezone or "UTC"
        try:
            tz = pytz.timezone(tz_name)
        except pytz.UnknownTimeZoneError:
            tz = pytz.UTC
        now = timezone.now().astimezone(tz)
        t = now.time()
        qs, qe = prefs.quiet_hours_start, prefs.quiet_hours_end
        if qs <= qe:
            return qs <= t <= qe
        return t >= qs or t <= qe
    except Exception:
        return False
