"""
Celery tasks for facebook_meta app
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging
from .models import AdCreativePreview

logger = logging.getLogger(__name__)


@shared_task
def cleanup_expired_previews():
    """
    Clean up expired preview records from the database
    This task runs every hour to remove expired preview tokens
    """
    try:        
        # Get current time
        now = timezone.now()
        
        # Count expired previews before deletion
        expired_count = AdCreativePreview.objects.filter(
            expires_at__lt=now
        ).count()
        
        if expired_count == 0:
            logger.info("No expired previews found for cleanup")
            return {
                'status': 'success',
                'message': 'No expired previews found',
                'deleted_count': 0
            }
        
        # Delete expired previews in a transaction
        with transaction.atomic():
            deleted_count, _ = AdCreativePreview.objects.filter(
                expires_at__lt=now
            ).delete()
        
        logger.info(f"Successfully cleaned up {deleted_count} expired preview records")
        
        return {
            'status': 'success',
            'message': f'Cleaned up {deleted_count} expired previews',
            'deleted_count': deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up expired previews: {str(e)}")
        return {
            'status': 'error',
            'message': f'Error cleaning up expired previews: {str(e)}',
            'deleted_count': 0
        }