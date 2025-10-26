from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import TikTokCreative
from .tasks import scan_tiktok_creative_for_virus


@receiver(post_save, sender=TikTokCreative)
def trigger_tiktok_virus_scan(sender, instance, created, **kwargs):
    """
    Trigger virus scan when a new TikTok creative is uploaded
    """
    if created and instance.scan_status == TikTokCreative.INCOMING:
        # Trigger virus scan asynchronously
        scan_tiktok_creative_for_virus.delay(instance.id)
