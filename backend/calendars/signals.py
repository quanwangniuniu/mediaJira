from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from decision.models import Decision
from task.models import Task
from .models import CalendarEvent


@receiver(post_save, sender=Decision)
def generate_calendar_events_for_decision(sender, instance, created, **kwargs):
    """
    Auto-generate CalendarEvents when a Decision is created or updated.
    - Decision Event: created when Decision has committed_at
    - Decision Review Event: created when Decision has approved_at
    """
    organization = getattr(instance, 'organization', None) or (
        instance.project.organization if instance.project else None
    )
    if not organization:
        return

    # Decision Event — Use committed_at as the time, or created_at if not available
    event_time = instance.committed_at or instance.created_at
    if event_time:
        CalendarEvent.objects.update_or_create(
            # Use these fields to find existing events to prevent duplicate generation
            event_type=CalendarEvent.EventType.DECISION,
            decision=instance,
            defaults={
                'organization': organization,
                'title': f"Decision: {instance.title or f'#{instance.id}'}",
                'start_time': event_time,
            }
        )

    # Decision Review Event — uses approved_at as time
    if instance.approved_at:
        CalendarEvent.objects.update_or_create(
            event_type=CalendarEvent.EventType.DECISION_REVIEW,
            decision=instance,
            defaults={
                'organization': organization,
                'title': f"Review: {instance.title or f'#{instance.id}'}",
                'start_time': instance.approved_at,
            }
        )


@receiver(post_save, sender=Task)
def generate_calendar_events_for_task(sender, instance, created, **kwargs):
    """
    Auto-generate CalendarEvents when a Task is created or updated.
    - Task Event: created when Task has due_date
    """
    organization = getattr(instance.project, 'organization', None)
    if not organization:
        return

    # Task Event — only generated if there is due_date
    if instance.due_date:
        # due_date is a DateField and needs to be converted into a DateTimeField
        start_time = timezone.make_aware(
            timezone.datetime.combine(instance.due_date, timezone.datetime.min.time())
        )
        CalendarEvent.objects.update_or_create(
            event_type=CalendarEvent.EventType.TASK,
            task=instance,
            defaults={
                'organization': organization,
                'title': f"Task: {instance.summary}",
                'start_time': start_time,
            }
        )