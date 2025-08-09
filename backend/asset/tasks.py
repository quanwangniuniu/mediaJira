import os
import logging
import clamd
from celery import shared_task
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from typing import Optional, Dict, Any
from .models import AssetVersion
from .services import AssetEventService

logger = logging.getLogger(__name__)


class VirusScanResult:
    """Represents the result of a virus scan operation"""
    
    def __init__(self, status: str, message: str, details: Optional[Dict[str, Any]] = None):
        self.status = status
        self.message = message
        self.details = details or {}


class VirusScanner:
    """Handles virus scanning operations with ClamAV"""
    
    def __init__(self, host: str = None, port: int = None):
        self.host = host or getattr(settings, 'CLAMAV_HOST', 'localhost')
        self.port = port or getattr(settings, 'CLAMAV_PORT', 3310)
        self._clamd = None
    
    def _get_clamd_connection(self):
        """Get or create ClamAV connection"""
        if self._clamd is None:
            try:
                self._clamd = clamd.ClamdNetworkSocket(host=self.host, port=self.port)
                # Test connection
                self._clamd.ping()
                logger.info(f"Successfully connected to ClamAV at {self.host}:{self.port}")
            except Exception as e:
                logger.error(f"Failed to connect to ClamAV at {self.host}:{self.port}: {e}")
                raise
        return self._clamd
    
    def scan_file(self, file_path: str) -> VirusScanResult:
        """Scan a file for viruses"""
        try:
            cd = self._get_clamd_connection()
            
            # Check if file exists
            if not os.path.exists(file_path):
                return VirusScanResult(
                    AssetVersion.ERROR,
                    "File not found on disk",
                    {'file_path': file_path}
                )
            
            # Scan the file
            with open(file_path, 'rb') as f:
                scan_result = cd.instream(f)
            
            # Process scan result
            if scan_result['stream'][0] == 'OK':
                return VirusScanResult(
                    AssetVersion.CLEAN,
                    "File is clean",
                    {'scan_result': scan_result}
                )
            else:
                return VirusScanResult(
                    AssetVersion.INFECTED,
                    f"Virus detected: {scan_result['stream'][1]}",
                    {'scan_result': scan_result, 'virus_name': scan_result['stream'][1]}
                )
                
        except Exception as e:
            logger.error(f"Virus scan failed for {file_path}: {e}")
            return VirusScanResult(
                AssetVersion.ERROR,
                f"Scan failed: {str(e)}",
                {'error': str(e), 'file_path': file_path}
            )


class AssetVersionScanner:
    """Handles asset version scanning operations"""
    
    def __init__(self):
        self.virus_scanner = VirusScanner()
    
    def update_scan_status(self, version: AssetVersion, status: str, message: str):
        """Update asset version scan status and broadcast event"""
        try:
            with transaction.atomic():
                # If version is in pending state, start scan first
                if version.scan_status == AssetVersion.PENDING:
                    version.start_scan()
                    version.save(update_fields=['scan_status'])
                
                # Use transition methods instead of direct field assignment
                if status == AssetVersion.CLEAN:
                    version.mark_clean()
                    version.save(update_fields=['scan_status'])

                elif status == AssetVersion.INFECTED:
                    # Extract virus name from message if available
                    virus_name = message.split(': ')[-1] if ': ' in message else None
                    version.mark_infected(virus_name=virus_name)
                    version.save(update_fields=['scan_status'])
                elif status == AssetVersion.ERROR:
                    version.mark_error(error_message=message)
                    version.save(update_fields=['scan_status'])
                else:
                    # For other statuses, use direct assignment (should not happen in normal flow)
                    version.scan_status = status
                    version.save(update_fields=['scan_status'])
                
                # Broadcast status update
                AssetEventService.broadcast_version_scan_completed(
                    asset_id=version.asset.id,
                    version_id=version.id,
                    version_number=version.version_number,
                    scan_status=status,
                    scan_result=message
                )
                
                logger.info(f"Updated scan status for version {version.id}: {status} - {message}")
                
        except Exception as e:
            logger.error(f"Failed to update scan status for version {version.id}: {e}")
            raise
    
    def broadcast_scan_started(self, version: AssetVersion):
        """Broadcast scan started event"""
        try:
            AssetEventService.broadcast_version_scan_started(
                asset_id=version.asset.id,
                version_id=version.id,
                version_number=version.version_number
            )
            logger.info(f"Broadcasted scan started for version {version.id}")
        except Exception as e:
            logger.error(f"Failed to broadcast scan started for version {version.id}: {e}")
    
    def scan_version(self, version_id: int) -> str:
        """Scan a single asset version"""
        try:
            # Get the asset version
            version = AssetVersion.objects.select_related('asset').get(pk=version_id)
            logger.info(f"Starting virus scan for version {version_id}")
            
            # Check if version can be scanned
            if not version.can_be_scanned():
                result = VirusScanResult(
                    AssetVersion.ERROR, 
                    "No file available for scanning"
                )
                self.update_scan_status(version, result.status, result.message)
                return result.message
            
            # Update status to scanning
            with transaction.atomic():
                version.start_scan()
                version.save(update_fields=['scan_status'])
            
            # Broadcast scanning started event
            self.broadcast_scan_started(version)
            
            # Scan the local file
            result = self.virus_scanner.scan_file(version.file.path)
            
            # Update scan status and broadcast result
            self.update_scan_status(version, result.status, result.message)
            
            logger.info(f"Completed virus scan for version {version_id}: {result.status} - {result.message}")
            return result.message
            
        except AssetVersion.DoesNotExist:
            error_msg = f"Asset version {version_id} not found"
            logger.error(error_msg)
            return error_msg
        except Exception as e:
            error_msg = f"Unexpected error scanning version {version_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            return error_msg


# Global scanner instance
_scanner = AssetVersionScanner()


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True
)
def scan_asset_version(self, version_id: int) -> str:
    """
    Scan an asset version for viruses using ClamAV.
    
    Args:
        version_id: ID of the AssetVersion to scan
        
    Returns:
        String message describing the scan result
        
    Raises:
        Exception: If scan fails and max retries exceeded
    """
    logger.info(f"Starting virus scan task for version {version_id} (attempt {self.request.retries + 1})")
    
    try:
        result = _scanner.scan_version(version_id)
        logger.info(f"Virus scan task completed for version {version_id}: {result}")
        return result
        
    except Exception as exc:
        logger.error(f"Virus scan task failed for version {version_id}: {exc}")
        
        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying virus scan for version {version_id} (attempt {self.request.retries + 1}/{self.max_retries})")
            raise self.retry(exc=exc)
        else:
            logger.error(f"Max retries exceeded for version {version_id}, marking as error")
            # Mark version as error if max retries exceeded
            try:
                version = AssetVersion.objects.get(pk=version_id)
                _scanner.update_scan_status(
                    version, 
                    AssetVersion.ERROR, 
                    f"Scan failed after {self.max_retries} retries: {str(exc)}"
                )
            except AssetVersion.DoesNotExist:
                pass
            raise


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30
)
def scan_all_pending_versions(self) -> str:
    """
    Scan all asset versions that are pending scan.
    
    Returns:
        String message describing the operation result
    """
    logger.info("Starting batch scan of all pending versions")
    
    try:
        # Get all pending versions that can be scanned
        pending_versions = AssetVersion.objects.filter(
            scan_status__in=[AssetVersion.PENDING, AssetVersion.ERROR],
            file__isnull=False  # Only versions with files
        ).select_related('asset').values_list('id', flat=True)
        
        version_count = len(pending_versions)
        logger.info(f"Found {version_count} pending versions to scan")
        
        if version_count == 0:
            return "No pending versions to scan"
        
        # Queue scan tasks in batches to avoid overwhelming the system
        batch_size = getattr(settings, 'VIRUS_SCAN_BATCH_SIZE', 10)
        queued_count = 0
        
        for i in range(0, version_count, batch_size):
            batch = pending_versions[i:i + batch_size]
            
            for version_id in batch:
                try:
                    scan_asset_version.delay(version_id)
                    queued_count += 1
                except Exception as e:
                    logger.error(f"Failed to queue scan task for version {version_id}: {e}")
        
        result_msg = f"Queued {queued_count}/{version_count} versions for scanning"
        logger.info(result_msg)
        return result_msg
        
    except Exception as exc:
        logger.error(f"Batch scan task failed: {exc}")
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        else:
            return f"Batch scan failed after {self.max_retries} retries: {str(exc)}"


@shared_task
def cleanup_failed_scans():
    """
    Clean up asset versions that have been in ERROR status for too long.
    This task can be scheduled to run periodically.
    """
    logger.info("Starting cleanup of failed scans")
    
    try:
        # Find versions that have been in ERROR status for more than 24 hours
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        failed_versions = AssetVersion.objects.filter(
            scan_status=AssetVersion.ERROR,
            updated_at__lt=cutoff_time
        ).select_related('asset')
        
        count = failed_versions.count()
        logger.info(f"Found {count} failed versions to reset")
        
        for version in failed_versions:
            try:
                with transaction.atomic():
                    # Reset to pending - this would need a new transition method
                    # For now, use direct assignment since we don't have a reset transition
                    version.scan_status = AssetVersion.PENDING
                    version.save(update_fields=['scan_status'])
                    
                    # Broadcast reset event
                    AssetEventService.broadcast_version_scan_completed(
                        asset_id=version.asset.id,
                        version_id=version.id,
                        version_number=version.version_number,
                        scan_status=AssetVersion.PENDING,
                        scan_result="Reset to pending for retry"
                    )
                    
                    logger.info(f"Reset version {version.id} to pending status")
                    
            except Exception as e:
                logger.error(f"Failed to reset version {version.id}: {e}")
        
        return f"Reset {count} failed versions to pending status"
        
    except Exception as e:
        logger.error(f"Cleanup task failed: {e}")
        return f"Cleanup failed: {str(e)}"


@shared_task
def get_scan_statistics() -> Dict[str, Any]:
    """
    Get statistics about virus scanning operations.
    This task can be used for monitoring and reporting.
    """
    logger.info("Generating scan statistics")
    
    try:
        from django.db.models import Count, Q
        from django.utils import timezone
        from datetime import timedelta
        
        # Get counts by status
        status_counts = AssetVersion.objects.values('scan_status').annotate(
            count=Count('id')
        )
        
        # Get recent activity (last 24 hours)
        cutoff_time = timezone.now() - timedelta(hours=24)
        recent_activity = AssetVersion.objects.filter(
            updated_at__gte=cutoff_time
        ).values('scan_status').annotate(
            count=Count('id')
        )
        
        # Get error details
        error_versions = AssetVersion.objects.filter(
            scan_status=AssetVersion.ERROR
        ).count()
        
        # Get pending versions (only local files that need scanning)
        pending_versions = AssetVersion.objects.filter(
            scan_status=AssetVersion.PENDING
        ).count()
        
        # Get versions with files (can be scanned)
        versions_with_files = AssetVersion.objects.filter(
            file__isnull=False
        ).count()
        
        stats = {
            'total_versions': AssetVersion.objects.count(),
            'status_breakdown': list(status_counts),
            'recent_activity': list(recent_activity),
            'error_count': error_versions,
            'pending_count': pending_versions,
            'versions_with_files': versions_with_files,
            'generated_at': timezone.now().isoformat()
        }
        
        logger.info(f"Generated scan statistics: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Failed to generate scan statistics: {e}")
        return {'error': str(e)} 