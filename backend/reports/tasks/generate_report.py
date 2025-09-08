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
    - `include_csv` is only used for PPTX; PDF branch ignores this parameter (report body already embeds tables/charts).
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
        # Simplified version: get data from report and pass to assembler
        from ..models import Report
        report = Report.objects.get(id=report_id)
        
        # If there's a configured data source, use it; otherwise use default data
        data = {}
        if hasattr(report, 'slice_config') and report.slice_config:
            # Here we can add logic to get data from configuration
            # For now, use empty data, actual usage will pass from ViewSet
            data = report.slice_config.get('inline_data', {})
        
        assembled: Dict[str, Any] = assemble(report_id, data)

        if fmt == "pptx":
            pptx_backend = _load_backend("EXPORT_PPTX_BACKEND", "reports.services.export_pptx")
            out_path = pptx_backend.export_pptx(
                assembled,
                title=getattr(assembled.get("report"), "title", None) or assembled.get("title") or "Report",
                include_raw_csv=include_csv,  # ← Only used for PPTX
            )
            ext = "pptx"
        else:
           
            from ..services.export_pdf import export_pdf
            out_path = export_pdf(assembled, theme="light")
            ext = "pdf"

        with open(out_path, "rb") as f:
            content = f.read()

        # Save to local storage
        filename = f"reports/{report_id}/{job_id}.{ext}"
        file_obj = ContentFile(content, name=filename)
        saved_path = default_storage.save(filename, file_obj)
        url = default_storage.url(saved_path)
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

        # webhook (best-effort)
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
        # Simplified version: get data from report and pass to assembler
        from ..models import Report
        report = Report.objects.get(id=report_id)
        
        data = {}
        if hasattr(report, 'slice_config') and report.slice_config:
            data = report.slice_config.get('inline_data', {})
        
        assembled = assemble(report_id, data)
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
