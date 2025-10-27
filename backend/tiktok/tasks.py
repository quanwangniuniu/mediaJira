import os
import logging
from celery import shared_task
from django.conf import settings
from utils.tasks import scan_file_for_virus_generic

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def scan_tiktok_creative_for_virus(self, creative_id):
    """Scan TikTok creative file for viruses using generic scanner."""
    return scan_file_for_virus_generic.delay(
        model_path='tiktok.models.TikTokCreative',
        file_id=creative_id,
        file_path_key='storage_path',
        status_field='scan_status'
    )
