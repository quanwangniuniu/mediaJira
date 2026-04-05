from typing import Iterable, List

from django.db import transaction

from core.models import ProjectMember
from meetings.models import AgendaItem, Meeting, MeetingDocument, ParticipantLink


def user_has_meeting_document_access(user_id: int, meeting: Meeting) -> bool:
    """Project member (active) or explicit meeting participant may load/sync the meeting document."""
    if ProjectMember.objects.filter(
        user_id=user_id,
        project_id=meeting.project_id,
        is_active=True,
    ).exists():
        return True
    return ParticipantLink.objects.filter(meeting_id=meeting.id, user_id=user_id).exists()


def reorder_agenda_items(meeting_id: int, items: Iterable[dict]) -> List[AgendaItem]:
    """
    Reorder agenda items for a given meeting.

    This function performs the update in a single transaction to avoid
    transient unique_together(meeting, order_index) conflicts.
    """

    items = list(items)

    temp_offset = 1000000

    with transaction.atomic():
        agenda_items = {
            item.id: item
            for item in AgendaItem.objects.select_for_update().filter(
                meeting_id=meeting_id, id__in=[i["id"] for i in items]
            )
        }

        for payload in items:
            agenda_item = agenda_items.get(payload["id"])
            if not agenda_item:
                continue
            agenda_item.order_index = payload["order_index"] + temp_offset
            agenda_item.save(update_fields=["order_index"])

        for payload in items:
            agenda_item = agenda_items.get(payload["id"])
            if not agenda_item:
                continue
            agenda_item.order_index = payload["order_index"]
            agenda_item.save(update_fields=["order_index"])

    return list(
        AgendaItem.objects.filter(meeting_id=meeting_id).order_by("order_index")
    )


def get_or_create_meeting_document(meeting_id: int) -> MeetingDocument:
    document, _ = MeetingDocument.objects.get_or_create(meeting_id=meeting_id)
    return document


def update_meeting_document_content(
    *,
    meeting_id: int,
    content: str,
    yjs_state: str | None = None,
    user_id: int | None = None,
) -> MeetingDocument:
    document = get_or_create_meeting_document(meeting_id)
    document.content = content
    if isinstance(yjs_state, str):
        document.yjs_state = yjs_state
    document.last_edited_by_id = user_id
    update_fields = ["content", "last_edited_by", "updated_at"]
    if isinstance(yjs_state, str):
        update_fields.append("yjs_state")
    document.save(update_fields=update_fields)
    return document

