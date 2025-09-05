from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import MetricFile
from .tasks import scan_file_for_virus


@receiver(post_save, sender=MetricFile)
def trigger_virus_scan(sender, instance, created, **kwargs):
    """
    Trigger virus scan when a new file is uploaded
    """
    if created and instance.status == MetricFile.INCOMING:
        # Trigger virus scan asynchronously
        scan_file_for_virus.delay(instance.id)
