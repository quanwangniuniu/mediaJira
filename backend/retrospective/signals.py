# Retrospective Engine Signals
# Handles automatic retrospective task creation and status updates

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import RetrospectiveTask, Insight

# Optional Celery import - only import if Celery is available
try:
    from .tasks import generate_retrospective
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    generate_retrospective = None

User = get_user_model()


@receiver(post_save, sender=RetrospectiveTask)
def handle_retrospective_status_change(sender, instance, created, **kwargs):
    """
    Handle retrospective task status changes
    """
    if created:
        # New retrospective task created
        # Could trigger initial KPI data generation
        pass
    else:
        # Status changed - could trigger notifications or follow-up actions
        if instance.status == 'completed':
            # Retrospective completed - could trigger report generation
            pass
        elif instance.status == 'approved':
            # Retrospective approved - could trigger notifications
            pass


@receiver(post_save, sender=Insight)
def handle_insight_creation(sender, instance, created, **kwargs):
    """
    Handle insight creation and updates
    """
    if created:
        # New insight created - could trigger notifications
        pass
    else:
        # Insight updated - could trigger re-evaluation
        pass


@receiver(post_delete, sender=RetrospectiveTask)
def handle_retrospective_deletion(sender, instance, **kwargs):
    """
    Handle retrospective task deletion
    """
    # Clean up related data if needed
    pass


@receiver(post_delete, sender=Insight)
def handle_insight_deletion(sender, instance, **kwargs):
    """
    Handle insight deletion
    """
    # Clean up related data if needed
    pass 