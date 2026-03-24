from typing import Iterable, List

from django.db import transaction

from meetings.models import AgendaItem


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

