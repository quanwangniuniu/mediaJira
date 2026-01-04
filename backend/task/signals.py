from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TaskAttachment
from .tasks import scan_task_attachment


@receiver(post_save, sender=TaskAttachment)
def trigger_virus_scan(sender, instance, created, **kwargs):
    """
    Trigger virus scan when a new task attachment is uploaded
    """
    if created and instance.scan_status == TaskAttachment.PENDING:
        # Trigger virus scan asynchronously
        scan_task_attachment.delay(instance.id)

