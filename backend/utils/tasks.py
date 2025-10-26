"""
Generic Celery tasks for common operations
"""
import os
import logging
from celery import shared_task
from django.conf import settings
from .virus_scanner import scan_file_generic

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def scan_file_for_virus_generic(self, model_path, file_id, file_path_key='storage_path', status_field='scan_status'):
    """
    Generic virus scanning task that can work with any model.
    
    Args:
        model_path: String path to model class (e.g., 'metric_upload.models.MetricFile')
        file_id: ID of the model instance
        file_path_key: Name of the field containing file path (default: 'storage_path')
        status_field: Name of the status field (default: 'scan_status')
    
    Returns:
        bool: True if file is clean, False if infected or error
    """
    try:
        # Import model class dynamically
        module_path, class_name = model_path.rsplit('.', 1)
        module = __import__(module_path, fromlist=[class_name])
        model_class = getattr(module, class_name)
        
        # Get file path - handle case where record doesn't exist
        try:
            instance = model_class.objects.get(id=file_id)
        except model_class.DoesNotExist:
            logger.warning(f"Record {file_id} not found in {model_class.__name__}, skipping virus scan")
            return False
        
        relative_path = getattr(instance, file_path_key)
        
        # Determine full path based on model type
        if 'metric_upload' in model_path:
            full_path = os.path.join(settings.FILE_STORAGE_DIR, relative_path)
        else:  # tiktok and others
            full_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        
        return scan_file_generic(full_path, model_class, file_id, status_field)
        
    except Exception as e:
        logger.error(f"Error in generic virus scan task: {str(e)}")
        return False
