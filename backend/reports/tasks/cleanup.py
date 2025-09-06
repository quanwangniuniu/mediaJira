"""
Celery tasks for cleaning up old files and reports.
"""

import logging
from datetime import datetime, timedelta

from celery import shared_task
from django.utils import timezone

from ..models import ReportAsset
from ..services.storage import delete_old_files

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def cleanup_old_files(self, older_than_days: int = 7):
    """
    Clean up old files from storage.
    
    Args:
        older_than_days: Delete files older than this many days (default: 7)
    
    Returns:
        Dict with cleanup results
    """
    logger.info(f"Starting file cleanup task: deleting files older than {older_than_days} days")
    
    try:
        # Clean up files from storage backend
        storage_deleted = delete_old_files(older_than_days)
        
        # Clean up old ReportAsset records (optional)
        # You might want to keep the records for audit purposes
        cutoff_date = timezone.now() - timedelta(days=older_than_days)
        
        # Find assets that should be cleaned up
        old_assets = ReportAsset.objects.filter(
            created_at__lt=cutoff_date,
            file_type__in=['pdf', 'pptx', 'csv']  # Don't auto-delete confluence assets
        )
        
        db_deleted = 0
        for asset in old_assets:
            try:
                # Optionally delete the file reference (but keep the record)
                # asset.file_url = None
                # asset.save()
                
                # Or completely delete the record (more aggressive)
                asset.delete()
                db_deleted += 1
                
            except Exception as e:
                logger.error(f"Failed to clean up asset {asset.id}: {e}")
        
        result = {
            'success': True,
            'storage_files_deleted': storage_deleted,
            'database_records_deleted': db_deleted,
            'cutoff_date': cutoff_date.isoformat(),
            'completed_at': timezone.now().isoformat()
        }
        
        logger.info(f"File cleanup completed successfully: {result}")
        return result
        
    except Exception as e:
        logger.error(f"File cleanup task failed: {e}")
        result = {
            'success': False,
            'error': str(e),
            'completed_at': timezone.now().isoformat()
        }
        raise self.retry(exc=e, countdown=60)


@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 30})
def cleanup_orphaned_assets(self):
    """
    Clean up orphaned ReportAsset records that reference non-existent files.
    This task helps maintain data consistency.
    """
    logger.info("Starting orphaned assets cleanup task")
    
    try:
        from ..services.storage import storage_service
        
        # Find assets with file URLs that no longer exist
        file_assets = ReportAsset.objects.filter(
            file_type__in=['pdf', 'pptx', 'csv'],
            file_url__isnull=False
        ).exclude(file_url='')
        
        orphaned_count = 0
        checked_count = 0
        
        for asset in file_assets:
            checked_count += 1
            
            try:
                # Extract storage key from URL
                from ..services.storage import extract_storage_key_from_url
                storage_key = extract_storage_key_from_url(asset.file_url)
                
                # Check if file exists
                if not storage_service.file_exists(storage_key):
                    logger.warning(f"Found orphaned asset {asset.id}: file {storage_key} does not exist")
                    
                    # Clear the file URL but keep the record for audit
                    asset.file_url = None
                    asset.save()
                    orphaned_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to check asset {asset.id}: {e}")
        
        result = {
            'success': True,
            'assets_checked': checked_count,
            'orphaned_assets_found': orphaned_count,
            'completed_at': timezone.now().isoformat()
        }
        
        logger.info(f"Orphaned assets cleanup completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Orphaned assets cleanup failed: {e}")
        result = {
            'success': False,
            'error': str(e),
            'completed_at': timezone.now().isoformat()
        }
        raise self.retry(exc=e, countdown=30)


@shared_task
def schedule_daily_cleanup():
    """
    Schedule daily cleanup tasks.
    This is typically called by Celery Beat.
    """
    logger.info("Scheduling daily cleanup tasks")
    
    # Schedule file cleanup (7 days retention)
    cleanup_old_files.delay(older_than_days=7)
    
    # Schedule orphaned assets cleanup
    cleanup_orphaned_assets.delay()
    
    return {
        'success': True,
        'scheduled_at': timezone.now().isoformat(),
        'tasks_scheduled': ['cleanup_old_files', 'cleanup_orphaned_assets']
    }