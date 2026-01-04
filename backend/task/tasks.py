import os
import logging
from celery import shared_task
from django.conf import settings
from .models import TaskAttachment
from utils.virus_scanner import perform_clamav_scan

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def scan_task_attachment(self, attachment_id):
    """Scan uploaded task attachment for viruses using ClamAV"""
    try:
        attachment = TaskAttachment.objects.get(id=attachment_id)

        if attachment.scan_status == TaskAttachment.PENDING:
            attachment.start_scan()
        elif attachment.scan_status == TaskAttachment.SCANNING:
            pass
        else:
            return True

        attachment.save()

        # Get file path (using MEDIA_ROOT)
        if not attachment.file:
            logger.warning(f"Attachment {attachment_id} has no file")
            return False

        file_path = attachment.file.path

        # Check if file exists
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            attachment.mark_error_scanning()
            attachment.save()
            return False

        # Perform virus scan
        is_infected = perform_clamav_scan(file_path)

        if is_infected:
            attachment.mark_infected()
        else:
            attachment.mark_clean()

        attachment.save()
        return not is_infected

    except TaskAttachment.DoesNotExist:
        logger.error(f"TaskAttachment {attachment_id} not found")
        return False
    except Exception as e:
        # On any error during scanning, mark error_scanning if we are scanning
        try:
            attachment = TaskAttachment.objects.get(id=attachment_id)
            if attachment.scan_status == TaskAttachment.SCANNING:
                attachment.mark_error_scanning()
                attachment.save()
        except Exception:
            pass
        logger.error(f"Error scanning task attachment {attachment_id}: {str(e)}")
        return False

