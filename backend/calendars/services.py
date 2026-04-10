"""
CalendarEvent query service.
Abstracts raw database queries from the API layer.
"""
from django.db.models import Q, QuerySet

from .models import CalendarEvent


def get_calendar_events(
    organization,
    start: str | None = None,
    end: str | None = None,
    event_type: str | None = None,
    project_id: str | None = None,
) -> QuerySet:
    """
    Query CalendarEvents for a given organization with optional filters.
    Returns a sorted, UI-ready queryset.

    Args:
        organization: The organization to scope the query to
        start: ISO datetime string for start of range (inclusive)
        end: ISO datetime string for end of range (exclusive)
        event_type: Filter by event type (decision / task / decision_review)
        project_id: Filter by project ID

    Returns:
        QuerySet of CalendarEvent ordered by start_time
    """
    queryset = CalendarEvent.objects.filter(
        organization=organization,
    ).select_related('decision', 'task', 'review')

    if start:
        queryset = queryset.filter(start_time__gte=start)

    if end:
        queryset = queryset.filter(start_time__lt=end)

    if event_type:
        queryset = queryset.filter(event_type=event_type)

    if project_id:
        queryset = queryset.filter(
            Q(decision__project_id=project_id) |
            Q(task__project_id=project_id)
        )

    return queryset.order_by('start_time')