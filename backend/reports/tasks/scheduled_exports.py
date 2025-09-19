# =============================
# File: /app/reports/tasks/scheduled_exports.py
# Purpose: Simplified scheduled export functionality
# Notes:
#  - Simplified version after merging charts.py into assembler.py
#  - Maintains original API for compatibility
# =============================
from __future__ import annotations
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from celery import shared_task

from ..models import Report, Job
from .generate_report import export_report_task

log = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def scan_and_schedule_exports(self, dry_run: bool = False) -> Dict[str, Any]:
    """
    Simplified scheduled export scanner.
    
    Scans for reports that need scheduled exports and queues them.
    
    Args:
        dry_run: If True, only scan but don't actually schedule exports
        
    Returns:
        Dict with scan results
    """
    try:
        log.info("Starting scheduled export scan (dry_run=%s)", dry_run)
        
        # Get approved reports that might need scheduled exports
        # Simplified: only look for approved reports with scheduling config
        candidates = Report.objects.filter(
            status='approved'
        ).exclude(
            slice_config__isnull=True
        )
        
        scheduled_count = 0
        scanned_count = 0
        
        for report in candidates:
            scanned_count += 1
            
            # Check if this report has scheduling configuration
            slice_config = getattr(report, 'slice_config', {}) or {}
            schedule_config = slice_config.get('schedule', {})
            
            if not schedule_config:
                continue
            
            # Simple scheduling logic - check if we should export now
            if _should_export_now(report, schedule_config):
                if not dry_run:
                    # Queue the export task
                    try:
                        export_report_task.delay(
                            report_id=report.id,
                            format='pdf',  # Default format
                            triggered_by='scheduled_export'
                        )
                        scheduled_count += 1
                        log.info("Scheduled export for report %s", report.id)
                    except Exception as e:
                        log.error("Failed to schedule export for report %s: %s", report.id, e)
                else:
                    scheduled_count += 1
                    log.info("Would schedule export for report %s (dry run)", report.id)
        
        result = {
            'success': True,
            'scanned_reports': scanned_count,
            'scheduled_exports': scheduled_count,
            'dry_run': dry_run,
            'timestamp': timezone.now().isoformat()
        }
        
        log.info("Scheduled export scan completed: %s", result)
        return result
        
    except Exception as e:
        log.error("Scheduled export scan failed: %s", e)
        return {
            'success': False,
            'error': str(e),
            'scanned_reports': 0,
            'scheduled_exports': 0,
            'dry_run': dry_run,
            'timestamp': timezone.now().isoformat()
        }


def _should_export_now(report: Report, schedule_config: Dict[str, Any]) -> bool:
    """
    Simplified scheduling logic to determine if a report should be exported now.
    
    Args:
        report: Report instance
        schedule_config: Scheduling configuration from report.slice_config.schedule
        
    Returns:
        True if report should be exported now
    """
    try:
        # Get schedule type (daily, weekly, monthly)
        schedule_type = schedule_config.get('type', 'manual')
        
        if schedule_type == 'manual':
            return False
        
        # Get last export time from most recent successful job
        last_export = None
        last_job = Job.objects.filter(
            report=report,
            type='export',
            status='succeeded'
        ).order_by('-created_at').first()
        
        if last_job:
            last_export = last_job.created_at
        
        now = timezone.now()
        
        # Simple scheduling logic
        if schedule_type == 'daily':
            # Export once per day
            if last_export is None:
                return True
            return (now - last_export) >= timedelta(days=1)
            
        elif schedule_type == 'weekly':
            # Export once per week
            if last_export is None:
                return True
            return (now - last_export) >= timedelta(weeks=1)
            
        elif schedule_type == 'monthly':
            # Export once per month (approximate)
            if last_export is None:
                return True
            return (now - last_export) >= timedelta(days=30)
        
        return False
        
    except Exception as e:
        log.error("Error checking schedule for report %s: %s", report.id, e)
        return False


@shared_task
def cleanup_old_jobs(max_age_days: int = 30) -> Dict[str, Any]:
    """
    Cleanup old job records to prevent database bloat.
    
    Args:
        max_age_days: Maximum age in days for job records
        
    Returns:
        Dict with cleanup results
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=max_age_days)
        
        # Delete old completed/failed jobs
        deleted_count, _ = Job.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['succeeded', 'failed', 'cancelled']
        ).delete()
        
        result = {
            'success': True,
            'deleted_jobs': deleted_count,
            'cutoff_date': cutoff_date.isoformat(),
            'timestamp': timezone.now().isoformat()
        }
        
        log.info("Job cleanup completed: %s", result)
        return result
        
    except Exception as e:
        log.error("Job cleanup failed: %s", e)
        return {
            'success': False,
            'error': str(e),
            'deleted_jobs': 0,
            'timestamp': timezone.now().isoformat()
        }