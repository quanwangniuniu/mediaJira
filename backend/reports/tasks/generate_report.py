# /app/reports/tasks/generate_report.py
# Purpose: Celery tasks to export reports (PDF/PPTX) and publish to Confluence
# Notes:
# - Idempotent short-circuit if job already succeeded
# - Validate export format
# - Use storage.save() returned name (it may rename keys)
# - Cleanup temp files
# - Best-effort webhook firing on success

from __future__ import annotations
from typing import Dict, Any
import hashlib
import logging
import os

from celery import shared_task
from django.db import transaction
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from ..services.storage import upload_report_file
from importlib import import_module

from ..models import ReportAsset, Job
from ..services.assembler import assemble

log = logging.getLogger(__name__)


def _load_backend(env_name: str, default_path: str):
    """Dynamically import exporter backend from ENV or fallback path."""
    import os as _os
    module_path = _os.getenv(env_name) or default_path
    return import_module(module_path)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def export_report_task(self, job_id: str, report_id: str, fmt: str = "pdf", include_csv: bool = False):
    """
    Celery task: export an approved report to PDF/PPTX.
    On success: create ReportAsset, update Job(result_asset, status), and fire webhook.
    On failure: mark Job failed and re-raise for Celery retry.

    Notes:
    - `include_csv` 仅用于 PPTX；PDF 分支会忽略该参数（report 正文已内嵌表格/图）。
    """
    job = Job.objects.get(pk=job_id)

    # Idempotency
    if job.status == "succeeded" and getattr(job, "result_asset_id", None):
        log.info("export_report_task: job %s already succeeded; skipping.", job_id)
        return

    if fmt not in ("pdf", "pptx"):
        raise ValueError(f"Unsupported format: {fmt}")

    job.status = "running"
    job.save(update_fields=["status", "updated_at"])

    out_path = None
    try:
        assembled: Dict[str, Any] = assemble(report_id)

        if fmt == "pptx":
            pptx_backend = _load_backend("EXPORT_PPTX_BACKEND", "reports.services.export_pptx")
            out_path = pptx_backend.export_pptx(
                assembled,
                title=getattr(assembled.get("report"), "title", None) or assembled.get("title") or "Report",
                include_raw_csv=include_csv,  # ← 仅 PPTX 使用
            )
            ext = "pptx"
        else:
           
            from ..services.export_pdf import export_pdf
            out_path = export_pdf(assembled, theme="light")
            ext = "pdf"

        with open(out_path, "rb") as f:
            content = f.read()

        # Upload using the new storage service
        filename = f"{job_id}.{ext}"
        storage_result = upload_report_file(
            file_content=content,
            filename=filename,
            content_type='application/pdf' if ext == 'pdf' else 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            folder=f"reports/{report_id}"
        )
        
        url = storage_result['file_url']
        checksum = hashlib.sha256(content).hexdigest()

        with transaction.atomic():
            asset = ReportAsset.objects.create(
                id=f"asset_{job_id}",
                report_id=report_id,
                file_url=url,
                file_type=ext,
                checksum=checksum,
            )
            job.result_asset = asset
            job.status = "succeeded"
            job.save(update_fields=["result_asset", "status", "updated_at"])

        # webhook（best-effort）
        try:
            from ..webhooks import fire_export_completed
            fire_export_completed(job, asset)
        except Exception:
            log.warning("export_report_task: webhook export.completed failed for job %s", job_id, exc_info=True)

    except Exception as e:
        job.status = "failed"
        job.message = str(e)
        job.save(update_fields=["status", "message", "updated_at"])
        raise
    finally:
        try:
            if out_path and os.path.exists(out_path):
                os.remove(out_path)
        except Exception:
            log.debug("export_report_task: failed to cleanup temp file %s", out_path, exc_info=True)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def publish_confluence_task(self, job_id: str, report_id: str, opts: Dict[str, Any]):
    """
    Celery task: publish assembled HTML to Confluence.
    On success: update Job(page_id/page_url/status) and create ReportAsset.
    On failure: mark Job failed and re-raise for retry.
    """
    from ..services.publisher_confluence import publish_html, create_report_asset_for_confluence

    job = Job.objects.get(pk=job_id)

    # Idempotency: if we already have page_id and succeeded, skip
    if job.status == "succeeded" and getattr(job, "page_id", None):
        log.info("publish_confluence_task: job %s already succeeded; skipping.", job_id)
        return

    job.status = "running"
    job.save(update_fields=["status", "updated_at"])

    try:
        assembled = assemble(report_id)
        html = assembled.get("html") or ""
        
        # Add title to publishing options if not provided
        if "title" not in opts:
            report = assembled.get("report")
            if report and hasattr(report, 'title'):
                opts["title"] = report.title
        
        page_id, page_url = publish_html(html, opts)

        # Create ReportAsset for the published Confluence page
        try:
            title = opts.get("title", "Generated Report")
            asset = create_report_asset_for_confluence(
                report_id=report_id,
                page_id=page_id,
                page_url=page_url,
                title=title
            )
            log.info(f"Created ReportAsset {asset.id} for Confluence page {page_id}")
        except Exception as e:
            log.warning(f"Failed to create ReportAsset for Confluence page: {e}")
            # Don't fail the task if asset creation fails
        
        # Update job with success info
        with transaction.atomic():
            job.page_id = page_id
            job.page_url = page_url
            job.status = "succeeded"
            job.save(update_fields=["page_id", "page_url", "status", "updated_at"])

        # Fire webhook (best-effort)
        try:
            from ..webhooks import fire_report_published
            fire_report_published(job, page_id, page_url)
        except Exception:
            log.warning(
                "publish_confluence_task: webhook report.published failed for job %s",
                job_id,
                exc_info=True,
            )

    except Exception as e:
        job.status = "failed"
        job.message = str(e)
        job.save(update_fields=["status", "message", "updated_at"])
        raise
