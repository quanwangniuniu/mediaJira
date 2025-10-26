from celery import shared_task
from django.utils import timezone
from .models import UsageDaily
import logging

logger = logging.getLogger(__name__)

@shared_task
def reset_daily_usage():
    """
    Reset daily usage records at midnight every day.
    This task should be scheduled to run daily at 00:00 UTC.
    """
    try:
        # Get current date
        today = timezone.now().date()
        
        # Delete all usage records (they will be recreated as needed)
        deleted_count, _ = UsageDaily.objects.all().delete()
        
        logger.info(f"Daily usage reset completed. Deleted {deleted_count} records at {today}")
        
        return {
            'status': 'success',
            'deleted_records': deleted_count,
            'reset_date': today.isoformat(),
            'message': f'Successfully reset {deleted_count} daily usage records'
        }
        
    except Exception as e:
        logger.error(f"Error resetting daily usage: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'message': 'Failed to reset daily usage records'
        }
