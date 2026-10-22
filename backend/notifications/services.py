from __future__ import annotations

import logging
from typing import Iterable, Sequence

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import QuerySet

from .dispatch import maybe_dispatch_external_channels
from .models import (
    DEADLINE_TAB_EVENT_TYPES,
    MENTION_TAB_EVENT_TYPES,
    Notification,
    NotificationCategory,
    NotificationEventType,
    UserNotificationPreference,
    default_notification_preferences,
)

logger = logging.getLogger(__name__)
User = get_user_model()


def _push_notification_to_redis(recipient_id: int, notification: Notification) -> None:
    """
    Publish a new in-app notification to the per-user Redis Pub/Sub channel
    so any active SSE stream can forward it to the browser immediately.
    """
    from .sse import publish_notification_to_redis  # noqa: PLC0415

    publish_notification_to_redis(recipient_id, notification)

PREFERENCE_SECTION_KEYS = (
    "collaboration_assets",
    "core_business",
    "automation_system",
    "integrations",
)

# event_type -> (section, row_key) for UserNotificationPreference JSON
_EVENT_PREFERENCE_KEY: dict[str, tuple[str, str]] = {
    NotificationEventType.CHAT_NEW_MESSAGE: ("collaboration_assets", "chat_in_app"),
    NotificationEventType.CHAT_NEW_CONVERSATION: ("collaboration_assets", "chat_new_session"),
    NotificationEventType.CHAT_MENTION: ("collaboration_assets", "chat_in_app"),
    NotificationEventType.MESSAGE_REMINDER: ("collaboration_assets", "message_reminder"),
    NotificationEventType.PROJECT_INVITE: ("collaboration_assets", "project_invite"),
    NotificationEventType.CALENDAR_REMINDER: ("collaboration_assets", "calendar_reminders"),
    NotificationEventType.DOC_ASSET_UPDATE: ("collaboration_assets", "doc_asset_updates"),
    NotificationEventType.MEETING_CREATED: ("core_business", "meeting_created_updated"),
    NotificationEventType.MEETING_UPDATED: ("core_business", "meeting_created_updated"),
    NotificationEventType.MEETING_PARTICIPANT_ADDED: ("core_business", "meeting_participant_assign"),
    NotificationEventType.MEETING_PARTICIPANT_REMOVED: ("core_business", "meeting_participant_assign"),
    NotificationEventType.MEETING_STARTING_SOON: ("core_business", "meeting_starting_soon"),
    NotificationEventType.MEETING_AGENDA_CHANGED: ("core_business", "meeting_agenda_minutes"),
    NotificationEventType.MEETING_MINUTES_PUBLISHED: ("core_business", "meeting_agenda_minutes"),
    NotificationEventType.TASK_ASSIGNED: ("core_business", "task_assignee"),
    NotificationEventType.TASK_OWNER_CHANGED: ("core_business", "task_assignee"),
    NotificationEventType.TASK_STATUS_CHANGED: ("core_business", "task_status"),
    NotificationEventType.TASK_DEADLINE_SOON: ("core_business", "task_deadline"),
    NotificationEventType.TASK_OVERDUE: ("core_business", "task_deadline"),
    NotificationEventType.TASK_COMMENT_MENTION: ("core_business", "task_mention"),
    NotificationEventType.TASK_ANOMALY: ("core_business", "task_alert"),
    NotificationEventType.DECISION_REVIEW_NEEDED: ("core_business", "decision_review"),
    NotificationEventType.DECISION_DEADLINE: ("core_business", "decision_deadline"),
    NotificationEventType.DECISION_PUBLISHED: ("core_business", "decision_published"),
    NotificationEventType.BUDGET_REVIEW_NEEDED: ("core_business", "budget_review"),
    NotificationEventType.BUDGET_APPROVAL_RESULT: ("automation_system", "approval_budget_member"),
    NotificationEventType.BUDGET_POOL_LOW: ("core_business", "budget_pool_low"),
    NotificationEventType.BUDGET_ESCALATION: ("core_business", "budget_escalation"),
    # Organization
    NotificationEventType.ORG_INVITE: ("collaboration_assets", "org_invite"),
    NotificationEventType.WORKFLOW_NODE: ("automation_system", "workflow_nodes"),
    NotificationEventType.ACCOUNT_PERMISSION: ("automation_system", "account_security_billing"),
    NotificationEventType.BILLING_ANOMALY: ("automation_system", "account_security_billing"),
    NotificationEventType.SYSTEM: ("automation_system", "workflow_nodes"),
}

# Maps notification event_type to user_preferences.NotificationSettings.setting_key (legacy)
EVENT_TO_SETTING_KEY: dict[str, str] = {}


def _setting_key_for_event(event_type: str) -> str:
    return EVENT_TO_SETTING_KEY.get(event_type, event_type)


def _legacy_notification_settings_blocks_in_app(user, event_type: str) -> bool:
    """
    If the user has NotificationSettings rows for this trigger but all are disabled,
    block in-app delivery. If there are no rows, do not block (backward compatible).
    """
    try:
        from user_preferences.models import NotificationSettings
    except Exception:  # pragma: no cover
        return False

    key = _setting_key_for_event(event_type)
    qs = NotificationSettings.objects.filter(user=user, setting_key=key)
    if not qs.exists():
        return False
    return not qs.filter(enabled=True).exists()


def _get_or_create_prefs(user) -> UserNotificationPreference:
    prefs, _ = UserNotificationPreference.objects.get_or_create(
        user=user,
        defaults={"preferences": default_notification_preferences()},
    )
    return prefs


def _is_in_app_enabled(user, event_type: str) -> bool:
    data = coalesce_preferences(_get_or_create_prefs(user).preferences)
    if data.get("disable_all"):
        return False
    mapped = _EVENT_PREFERENCE_KEY.get(event_type)
    if not mapped:
        return True
    section, key = mapped
    section_data = data.get(section) or {}
    row = section_data.get(key) or {}
    return bool(row.get("web", True))


def is_email_enabled(user, event_type: str) -> bool:
    data = coalesce_preferences(_get_or_create_prefs(user).preferences)
    if data.get("disable_all"):
        return False
    mapped = _EVENT_PREFERENCE_KEY.get(event_type)
    if not mapped:
        return True
    section, key = mapped
    row = (data.get(section) or {}).get(key) or {}
    return bool(row.get("email", True))


def is_slack_integration_enabled(user) -> bool:
    data = coalesce_preferences(_get_or_create_prefs(user).preferences)
    if data.get("disable_all"):
        return False
    row = (data.get("integrations") or {}).get("slack_webhook") or {}
    return bool(row.get("web", True))


def coalesce_preferences(stored: dict | None) -> dict:
    """
    Merge defaults with stored JSON and migrate legacy keys (meetings/tasks/decisions/approval_system).
    """
    base = default_notification_preferences()
    if not stored:
        return base

    raw = dict(stored)

    if "meetings" in raw:
        m = raw.pop("meetings", {}) or {}
        cb = dict(base["core_business"])
        if "created_updated" in m:
            cb["meeting_created_updated"] = {**cb.get("meeting_created_updated", {}), **m["created_updated"]}
        if "join_remove" in m:
            cb["meeting_participant_assign"] = {**cb.get("meeting_participant_assign", {}), **m["join_remove"]}
        if "starting_soon" in m:
            cb["meeting_starting_soon"] = {**cb.get("meeting_starting_soon", {}), **m["starting_soon"]}
        if "agenda_changed" in m:
            cb["meeting_agenda_minutes"] = {**cb.get("meeting_agenda_minutes", {}), **m["agenda_changed"]}
        base["core_business"] = {**base["core_business"], **cb}

    if "tasks" in raw:
        t = raw.pop("tasks", {}) or {}
        cb = dict(base["core_business"])
        mapping = {
            "assignee_change": "task_assignee",
            "deadline_soon": "task_deadline",
            "deadline_overdue": "task_deadline",
            "status_change": "task_status",
            "comment_mention": "task_mention",
            "anomaly": "task_alert",
        }
        for old_k, new_k in mapping.items():
            if old_k in t:
                cb[new_k] = {**(cb.get(new_k) or {}), **t[old_k]}
        base["core_business"] = {**base["core_business"], **cb}

    if "decisions" in raw:
        d = raw.pop("decisions", {}) or {}
        cb = dict(base["core_business"])
        dm = {
            "review_needed": "decision_review",
            "deadline": "decision_deadline",
            "published": "decision_published",
        }
        for old_k, new_k in dm.items():
            if old_k in d:
                cb[new_k] = {**(cb.get(new_k) or {}), **d[old_k]}
        base["core_business"] = {**base["core_business"], **cb}

    if "approval_system" in raw:
        a = raw.pop("approval_system", {}) or {}
        au = dict(base["automation_system"])
        am = {
            "budget": "approval_budget_member",
            "project_invite": "approval_budget_member",
            "workflow": "workflow_nodes",
            "account_permission": "account_security_billing",
            "billing": "account_security_billing",
        }
        for old_k, new_k in am.items():
            if old_k in a:
                au[new_k] = {**(au.get(new_k) or {}), **a[old_k]}
        base["automation_system"] = {**base["automation_system"], **au}

    if "disable_all" in raw:
        base["disable_all"] = bool(raw["disable_all"])

    for sec in PREFERENCE_SECTION_KEYS:
        if sec in raw and isinstance(raw[sec], dict):
            merged = {**base.get(sec, {}), **raw[sec]}
            for row_k, row_v in merged.items():
                default_row = base.get(sec, {}).get(row_k)
                if isinstance(row_v, dict) and isinstance(default_row, dict):
                    merged[row_k] = {**default_row, **row_v}
                elif isinstance(row_v, dict):
                    merged[row_k] = row_v
            base[sec] = merged

    return _normalize_preference_sections(base)


def _normalize_preference_sections(data: dict) -> dict:
    """Ensure every known row is a {web, email} dict so API responses never contain null/invalid rows."""
    defaults = default_notification_preferences()
    out = {**data}
    out["disable_all"] = bool(out.get("disable_all", False))
    for sec in PREFERENCE_SECTION_KEYS:
        sec_def = defaults.get(sec) or {}
        sec_in = out.get(sec)
        if not isinstance(sec_in, dict):
            out[sec] = {k: dict(v) for k, v in sec_def.items()}
            continue
        fixed: dict = {}
        for row_key, default_row in sec_def.items():
            row_val = sec_in.get(row_key)
            if isinstance(row_val, dict):
                fixed[row_key] = {
                    "web": bool(row_val.get("web", default_row["web"])),
                    "email": bool(row_val.get("email", default_row["email"])),
                }
            else:
                fixed[row_key] = dict(default_row)
        out[sec] = fixed
    return out


@transaction.atomic
def create_notification(
    *,
    recipient_id: int,
    actor_id: int | None,
    category: str,
    event_type: str,
    title: str,
    body: str = "",
    related_object_type: str = "",
    related_object_id: str = "",
    action_url: str = "",
    metadata: dict | None = None,
) -> Notification | None:
    if recipient_id == actor_id:
        # Self-notifications are always suppressed; this is expected behaviour.
        return None

    try:
        recipient = User.objects.get(pk=recipient_id)
    except User.DoesNotExist:
        logger.warning(
            "create_notification: SKIPPED — recipient_id=%s does not exist (event=%s)",
            recipient_id, event_type,
        )
        return None

    if not _is_in_app_enabled(recipient, event_type):
        logger.warning(
            "create_notification: SKIPPED — in-app disabled for recipient_id=%s event=%s "
            "(check UserNotificationPreference for this user)",
            recipient_id, event_type,
        )
        return None

    if _legacy_notification_settings_blocks_in_app(recipient, event_type):
        logger.warning(
            "create_notification: SKIPPED — legacy NotificationSettings block "
            "recipient_id=%s event=%s",
            recipient_id, event_type,
        )
        return None

    n = Notification.objects.create(
        recipient_id=recipient_id,
        actor_id=actor_id,
        category=category,
        event_type=event_type,
        related_object_type=related_object_type or "",
        related_object_id=str(related_object_id) if related_object_id is not None else "",
        title=title[:255],
        body=body or "",
        action_url=action_url[:1024] if action_url else "",
        metadata=metadata or {},
    )

    # Isolate external dispatch (Slack, email) in its own savepoint so that
    # a missing table or broken integration cannot abort the outer transaction
    # and lose the notification record.
    try:
        with transaction.atomic():
            maybe_dispatch_external_channels(notification=n, user=recipient, event_type=event_type)
    except Exception:
        logger.warning(
            "create_notification: external dispatch failed for id=%s event=%s — notification still saved",
            n.id, event_type,
        )

    # Push to Redis only after the transaction commits, so the notification
    # is guaranteed to be in the DB before the SSE event fires.
    def _push():
        _push_notification_to_redis(recipient_id, n)

    transaction.on_commit(_push)

    logger.info(
        "create_notification: OK — id=%s recipient_id=%s event=%s",
        n.id, recipient_id, event_type,
    )
    return n


def create_notifications_for_users(
    *,
    recipient_ids: Iterable[int],
    actor_id: int | None,
    category: str,
    event_type: str,
    title: str,
    body: str = "",
    related_object_type: str = "",
    related_object_id: str = "",
    action_url: str = "",
    metadata: dict | None = None,
) -> list[Notification]:
    created: list[Notification] = []
    for rid in set(recipient_ids):
        n = create_notification(
            recipient_id=rid,
            actor_id=actor_id,
            category=category,
            event_type=event_type,
            title=title,
            body=body,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            action_url=action_url,
            metadata=metadata,
        )
        if n:
            created.append(n)
    return created


def _chat_message_notification_qs(*, recipient_id: int, chat_id: int):
    """All chat_new_message notifications for one recipient + chat (read or unread)."""
    return Notification.objects.filter(
        recipient_id=recipient_id,
        event_type=NotificationEventType.CHAT_NEW_MESSAGE,
        related_object_type="chat",
        related_object_id=str(chat_id),
    )


def _truncate_message_preview(message_preview: str) -> str:
    return message_preview[:200] + "…" if len(message_preview) > 200 else message_preview


def _chat_notification_title(message_count: int) -> str:
    if message_count <= 1:
        return "New message"
    return f"{message_count} new messages"


def _consolidate_duplicate_chat_notifications(
    *,
    recipient_id: int,
    chat_id: int,
    keep: Notification,
    merge_unread_counts: bool,
) -> int:
    """
    Delete extra chat_new_message rows for the same chat, keeping ``keep``.
    When ``merge_unread_counts`` is True, add duplicate unread message_count values onto ``keep``.
    """
    duplicates = _chat_message_notification_qs(
        recipient_id=recipient_id, chat_id=chat_id
    ).exclude(id=keep.id)
    dup_count = duplicates.count()
    if dup_count == 0:
        return 0

    if merge_unread_counts and not keep.is_read:
        for dup in duplicates:
            if not dup.is_read:
                keep.metadata["message_count"] = keep.metadata.get("message_count", 1) + dup.metadata.get(
                    "message_count", 1
                )

    duplicates.delete()
    logger.warning(
        "chat_notification: CONSOLIDATED %s duplicate rows for recipient_id=%s chat_id=%s (kept=%s)",
        dup_count,
        recipient_id,
        chat_id,
        keep.id,
    )
    return dup_count


def _apply_chat_message_to_notification(
    notification: Notification,
    *,
    actor_id: int,
    message_id: int,
    project_id: int,
    message_preview: str,
    was_unread: bool,
) -> Notification:
    """Update a single chat notification row for a new message."""
    from django.utils import timezone

    body = _truncate_message_preview(message_preview)
    metadata = dict(notification.metadata or {})
    metadata["chat_id"] = metadata.get("chat_id") or int(notification.related_object_id or 0)
    metadata["project_id"] = project_id
    # Preserve first unread message_id when notification was already unread;
    # only reset to the new message when transitioning from read -> unread.
    if not was_unread:
        metadata["message_id"] = message_id
    metadata["last_message_id"] = message_id

    if was_unread:
        new_count = metadata.get("message_count", 1) + 1
    else:
        new_count = 1

    metadata["message_count"] = new_count
    notification.metadata = metadata
    notification.actor_id = actor_id
    notification.title = _chat_notification_title(new_count)
    notification.body = body
    notification.is_read = False
    notification.created_at = timezone.now()
    notification.save(
        update_fields=["metadata", "actor_id", "title", "body", "is_read", "created_at"]
    )
    return notification


@transaction.atomic
def repair_duplicate_chat_notifications_for_user(user) -> int:
    """
    One card per chat: merge historical duplicate chat_new_message rows for a user.
    Called from the notification list API so existing duplicates disappear without waiting
    for the next message.
    """
    from django.db.models import Count

    user_id = user.pk if hasattr(user, "pk") else user
    chat_ids = (
        Notification.objects.filter(
            recipient_id=user_id,
            event_type=NotificationEventType.CHAT_NEW_MESSAGE,
            related_object_type="chat",
        )
        .values("related_object_id")
        .annotate(c=Count("id"))
        .filter(c__gt=1)
        .values_list("related_object_id", flat=True)
    )

    removed = 0
    for chat_id_str in chat_ids:
        try:
            chat_id = int(chat_id_str)
        except (TypeError, ValueError):
            continue
        rows = list(
            _chat_message_notification_qs(recipient_id=user_id, chat_id=chat_id).order_by(
                "-created_at", "-id"
            )
        )
        if len(rows) <= 1:
            continue
        keep = rows[0]
        # Prefer an unread row as canonical when multiple exist
        for row in rows:
            if not row.is_read:
                keep = row
                break
        removed += _consolidate_duplicate_chat_notifications(
            recipient_id=user_id,
            chat_id=chat_id,
            keep=keep,
            merge_unread_counts=not keep.is_read,
        )
        if not keep.is_read:
            keep.save(update_fields=["metadata"])
    return removed


CHAT_DRAWER_EVENT_TYPES = frozenset(
    {
        NotificationEventType.CHAT_NEW_MESSAGE,
        NotificationEventType.CHAT_NEW_CONVERSATION,
        NotificationEventType.CHAT_MENTION,
        NotificationEventType.CHAT_THREAD_REPLY,
        NotificationEventType.CHAT_REACTION,
    }
)


def _chat_id_for_notification(notification: Notification) -> int | None:
    metadata = notification.metadata or {}
    raw_chat_id = metadata.get("chat_id")
    if raw_chat_id is None and notification.related_object_type == "chat":
        raw_chat_id = notification.related_object_id
    try:
        return int(raw_chat_id)
    except (TypeError, ValueError):
        return None


@transaction.atomic
def repair_stale_chat_notifications_for_user(user) -> int:
    """
    Delete chat notifications that can no longer open for the recipient.

    This handles old local/dev data and access changes: if the target chat was deleted
    or the recipient is no longer an active participant, the notification should not
    be listed or counted.
    """
    from chat.models import Chat, ChatParticipant

    user_id = user.pk if hasattr(user, "pk") else user
    candidates = list(
        Notification.objects.filter(
            recipient_id=user_id,
            event_type__in=CHAT_DRAWER_EVENT_TYPES,
        ).only("id", "event_type", "related_object_type", "related_object_id", "metadata")
    )
    if not candidates:
        return 0

    notification_chat_ids: dict[str, int] = {}
    stale_ids: list[str] = []
    chat_ids: set[int] = set()

    for notification in candidates:
        chat_id = _chat_id_for_notification(notification)
        if chat_id is None:
            stale_ids.append(notification.id)
            continue
        notification_chat_ids[str(notification.id)] = chat_id
        chat_ids.add(chat_id)

    existing_chat_ids = set(Chat.objects.filter(id__in=chat_ids).values_list("id", flat=True))
    active_chat_ids = set(
        ChatParticipant.objects.filter(
            chat_id__in=existing_chat_ids,
            user_id=user_id,
            is_active=True,
        ).values_list("chat_id", flat=True)
    )

    for notification in candidates:
        key = str(notification.id)
        chat_id = notification_chat_ids.get(key)
        if chat_id is None:
            continue
        if chat_id not in existing_chat_ids or chat_id not in active_chat_ids:
            stale_ids.append(notification.id)

    if not stale_ids:
        return 0

    removed, _ = Notification.objects.filter(id__in=stale_ids).delete()
    logger.warning(
        "repair_stale_chat_notifications_for_user: removed %s stale chat notification(s) for user_id=%s",
        removed,
        user_id,
    )
    return removed


@transaction.atomic
def create_or_update_chat_notification(
    *,
    recipient_id: int,
    actor_id: int,
    chat_id: int,
    message_id: int,
    project_id: int,
    message_preview: str,
    actor_name: str = "",
) -> Notification | None:
    """
    Create or update the single in-app notification card for a chat conversation.

    One recipient + chat always maps to at most one chat_new_message notification:
    - New messages update that row (even if it was previously marked read).
    - Unread batches increment message_count; after read, the next message resets count to 1.
    """
    if recipient_id == actor_id:
        return None

    try:
        recipient = User.objects.get(pk=recipient_id)
    except User.DoesNotExist:
        logger.warning(
            "create_or_update_chat_notification: SKIPPED — recipient_id=%s does not exist",
            recipient_id,
        )
        return None

    event_type = NotificationEventType.CHAT_NEW_MESSAGE

    if not _is_in_app_enabled(recipient, event_type):
        logger.warning(
            "create_or_update_chat_notification: SKIPPED — in-app disabled for recipient_id=%s",
            recipient_id,
        )
        return None

    if _legacy_notification_settings_blocks_in_app(recipient, event_type):
        logger.warning(
            "create_or_update_chat_notification: SKIPPED — legacy settings block recipient_id=%s",
            recipient_id,
        )
        return None

    existing = (
        _chat_message_notification_qs(recipient_id=recipient_id, chat_id=chat_id)
        .select_for_update()
        .order_by("-created_at", "-id")
        .first()
    )

    if existing:
        _consolidate_duplicate_chat_notifications(
            recipient_id=recipient_id,
            chat_id=chat_id,
            keep=existing,
            merge_unread_counts=not existing.is_read,
        )
        was_unread = existing.is_read is False
        updated = _apply_chat_message_to_notification(
            existing,
            actor_id=actor_id,
            message_id=message_id,
            project_id=project_id,
            message_preview=message_preview,
            was_unread=was_unread,
        )
        _push_notification_to_redis(recipient_id, updated)
        logger.info(
            "create_or_update_chat_notification: UPDATED — id=%s recipient_id=%s chat_id=%s message_count=%s",
            updated.id,
            recipient_id,
            chat_id,
            updated.metadata.get("message_count", 1),
        )
        return updated

    try:
        from chat.models import Chat
        from chat.url_helpers import build_messages_action_url

        chat_slug = Chat.objects.filter(pk=chat_id).values_list('slug', flat=True).first()
        if not chat_slug:
            chat_slug = str(chat_id)

        n = Notification.objects.create(
            recipient_id=recipient_id,
            actor_id=actor_id,
            category=NotificationCategory.COLLABORATION,
            event_type=event_type,
            related_object_type="chat",
            related_object_id=str(chat_id),
            title="New message",
            body=_truncate_message_preview(message_preview),
            action_url=build_messages_action_url(chat_slug),
            metadata={
                "chat_id": chat_id,
                "chat_slug": chat_slug,
                "message_id": message_id,
                "project_id": project_id,
                "message_count": 1,
            },
        )
        _consolidate_duplicate_chat_notifications(
            recipient_id=recipient_id,
            chat_id=chat_id,
            keep=n,
            merge_unread_counts=True,
        )
        maybe_dispatch_external_channels(notification=n, user=recipient, event_type=event_type)
        _push_notification_to_redis(recipient_id, n)
        logger.info(
            "create_or_update_chat_notification: CREATED — id=%s recipient_id=%s chat_id=%s",
            n.id,
            recipient_id,
            chat_id,
        )
        return n
    except IntegrityError:
        logger.warning(
            "create_or_update_chat_notification: RACE DETECTED — retrying update for recipient_id=%s chat_id=%s",
            recipient_id,
            chat_id,
        )
        existing = (
            _chat_message_notification_qs(recipient_id=recipient_id, chat_id=chat_id)
            .select_for_update()
            .order_by("-created_at", "-id")
            .first()
        )
        if existing:
            was_unread = existing.is_read is False
            updated = _apply_chat_message_to_notification(
                existing,
                actor_id=actor_id,
                message_id=message_id,
                project_id=project_id,
                message_preview=message_preview,
                was_unread=was_unread,
            )
            _push_notification_to_redis(recipient_id, updated)
            return updated
        raise


def filter_notifications_for_user(
    qs: QuerySet[Notification],
    *,
    category: str | None,
    is_read: bool | None,
    tab: str | None,
) -> QuerySet[Notification]:
    if category:
        qs = qs.filter(category=category)
    if is_read is not None:
        qs = qs.filter(is_read=is_read)
    t = (tab or "all").lower()
    if t == "unread":
        qs = qs.filter(is_read=False)
    elif t == "mentions":
        qs = qs.filter(event_type__in=MENTION_TAB_EVENT_TYPES)
    elif t == "deadlines":
        qs = qs.filter(event_type__in=DEADLINE_TAB_EVENT_TYPES)
    return qs


def mark_notifications_read(user, ids: Sequence[str], *, mark_all: bool = False) -> int:
    qs = Notification.objects.filter(recipient=user)
    if mark_all:
        return qs.filter(is_read=False).update(is_read=True)
    if not ids:
        return 0
    return qs.filter(id__in=ids).update(is_read=True)


def clear_notifications(
    user,
    *,
    scope: str,
    ids: Sequence[str] | None = None,
) -> int:
    qs = Notification.objects.filter(recipient=user)
    scope = (scope or "ids").lower()
    if scope == "all":
        count, _ = qs.delete()
        return count
    if scope == "read":
        count, _ = qs.filter(is_read=True).delete()
        return count
    if scope == "ids" and ids:
        count, _ = qs.filter(id__in=ids).delete()
        return count
    return 0


def merge_preferences_update(existing: dict | None, patch: dict) -> dict:
    """Apply a PATCH on top of coalesced preferences (includes legacy migration)."""
    base = coalesce_preferences(existing)
    if "disable_all" in patch:
        base["disable_all"] = bool(patch["disable_all"])
    for section in PREFERENCE_SECTION_KEYS:
        if section not in patch or not isinstance(patch[section], dict):
            continue
        sec_defaults = default_notification_preferences().get(section) or {}
        sec_base = {**sec_defaults, **(base.get(section) or {})}
        for row_key, row_val in patch[section].items():
            if isinstance(row_val, dict):
                prev = {**(sec_base.get(row_key) or {})}
                for k in ("web", "email"):
                    if k in row_val:
                        prev[k] = bool(row_val[k])
                sec_base[row_key] = prev
        base[section] = sec_base
    return base


def apply_and_save_notification_preferences(user, patch: dict) -> UserNotificationPreference:
    """
    Ensure a UserNotificationPreference row exists for this user, merge the partial patch,
    and persist. Preferences are stored as one JSON document per user (section -> row -> web/email),
    not as separate NotificationSetting rows.

    Uses update_or_create pattern to handle race conditions and ensure the preference
    record always exists before updating.
    """
    with transaction.atomic():
        try:
            pref, created = UserNotificationPreference.objects.get_or_create(
                user=user,
                defaults={"preferences": default_notification_preferences()},
            )
            if created:
                logger.debug(
                    "Created new UserNotificationPreference for user_id=%s",
                    getattr(user, "pk", None),
                )
        except IntegrityError:
            logger.warning(
                "get_or_create race for user_id=%s; retrying get_or_create",
                getattr(user, "pk", None),
            )
            # Use get_or_create again instead of get() to handle edge cases
            # where the record might not exist after a concurrent rollback
            pref, _ = UserNotificationPreference.objects.get_or_create(
                user=user,
                defaults={"preferences": default_notification_preferences()},
            )
        pref.preferences = merge_preferences_update(pref.preferences, patch)
        pref.save(update_fields=["preferences", "updated_at"])
        return pref


def revoke_access_to_resource(user_id: int, object_type: str, object_id: str) -> int:
    """
    Mark all historical notifications for a user about a specific resource
    as revoked_access, indicating the user no longer has permission to access it.

    This is used when a user loses access to a resource (removed from project/meeting,
    rejected invitation, etc.) to prevent them from accessing it via old notifications.

    Args:
        user_id: The user who lost access
        object_type: e.g., "meeting", "project", "task"
        object_id: The ID of the related object

    Returns:
        Number of notifications updated

    Note:
        Uses PostgreSQL jsonb_set for efficient batch update.
    """
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE notifications_notification
            SET metadata = jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{revoked_access}',
                'true',
                true
            )
            WHERE recipient_id = %s
              AND related_object_type = %s
              AND related_object_id = %s
              AND (metadata->>'revoked_access' IS NULL
                   OR metadata->>'revoked_access' = 'false')
        """, [user_id, object_type, object_id])
        count = cursor.rowcount

    logger.info(
        "Revoked access to %s:%s for user %s, updated %d notifications",
        object_type, object_id, user_id, count
    )
    return count
