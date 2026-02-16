import logging
from celery import shared_task
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from .models import PatternJob, PatternJobStatus
from .services import WorkflowPatternService

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def apply_pattern_job(self, job_id: str) -> None:
    try:
        with transaction.atomic():
            # Lock only the PatternJob row to avoid SELECT FOR UPDATE + outer join errors.
            job = PatternJob.objects.select_for_update().get(id=job_id)
            if job.status != PatternJobStatus.QUEUED:
                return
            job.status = PatternJobStatus.RUNNING
            job.started_at = timezone.now()
            job.error_code = None
            job.error_message = ''
            job.save(update_fields=['status', 'started_at', 'error_code', 'error_message', 'updated_at'])
        # Refetch with related objects outside the lock.
        job = PatternJob.objects.select_related('pattern', 'sheet', 'spreadsheet', 'created_by').get(id=job_id)
    except PatternJob.DoesNotExist:
        logger.warning("PatternJob %s not found", job_id)
        return

    def update_progress(step_seq: int, completed: int, total: int) -> None:
        if total <= 0:
            progress = 0
        else:
            progress = int(round((completed / total) * 100))
        PatternJob.objects.filter(id=job_id).update(
            progress=progress,
            step_cursor=step_seq,
            updated_at=timezone.now()
        )

    try:
        WorkflowPatternService.apply_pattern(
            pattern=job.pattern,
            sheet=job.sheet,
            created_by=job.created_by,
            progress_callback=update_progress
        )
        PatternJob.objects.filter(id=job_id).update(
            status=PatternJobStatus.SUCCEEDED,
            progress=100,
            finished_at=timezone.now(),
            updated_at=timezone.now()
        )
    except ValidationError as exc:
        PatternJob.objects.filter(id=job_id).update(
            status=PatternJobStatus.FAILED,
            error_code='INVALID_ARGUMENT',
            error_message=str(exc),
            finished_at=timezone.now(),
            updated_at=timezone.now()
        )
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("PatternJob %s failed", job_id)
        PatternJob.objects.filter(id=job_id).update(
            status=PatternJobStatus.FAILED,
            error_code='EXECUTION_ERROR',
            error_message=str(exc),
            finished_at=timezone.now(),
            updated_at=timezone.now()
        )
        raise

