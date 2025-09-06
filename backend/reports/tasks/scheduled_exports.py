# /app/reports/tasks/scheduled_exports.py
# Purpose: Periodic scheduler that scans approved reports and enqueues export jobs when due

from __future__ import annotations

import logging
import secrets
import time as pytime
from typing import Optional, Tuple, Dict, Any
from datetime import datetime, time as dtime, timedelta

from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from celery import shared_task

from ..models import Report, ReportAsset, Job
from .generate_report import export_report_task

logger = logging.getLogger(__name__)

EXPORT_CONFIG_MAP: Dict[str, Dict[str, Any]] = {
    "exp_daily_pdf": {"format": "pdf", "schedule": "daily@09:00"},
    "exp_daily_pptx": {"format": "pptx", "schedule": "daily@10:00"},
    "exp_test_pdf": {"format": "pdf", "schedule": "daily@09:08"},  # 测试用，每天09:08
}
DEFAULT_EXPORT_CONFIG = {"format": "pdf", "schedule": "daily@09:00"}

_DOW = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}

def _parse_hhmm(hhmm: str) -> Optional[dtime]:
    try:
        hh, mm = hhmm.split(":")
        return dtime(hour=int(hh), minute=int(mm))
    except Exception:
        return None

def parse_schedule(expr: str) -> Tuple[str, tuple]:
    if not expr:
        return ("unsupported", ())
    s = expr.strip().lower()
    if s.startswith("daily@"):
        t = _parse_hhmm(s.split("@", 1)[1])
        return ("daily", (t,)) if t else ("unsupported", ())
    if s.startswith("weekly@"):
        parts = s.split("@")
        if len(parts) == 3 and parts[1] in _DOW:
            t = _parse_hhmm(parts[2])
            return ("weekly", (_DOW[parts[1]], t)) if t else ("unsupported", ())
    if s.startswith("cron:"):
        return ("unsupported", ())
    return ("unsupported", ())

def _today_utc(dt: datetime) -> datetime:
    return dt.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

def _dt_on_date_utc(date_utc: datetime, t: dtime) -> datetime:
    return date_utc.replace(hour=t.hour, minute=t.minute, second=0, microsecond=0)

def _is_due(now: datetime, schedule_expr: str) -> Tuple[bool, Optional[datetime]]:
    kind, payload = parse_schedule(schedule_expr)
    if kind == "daily":
        (t,) = payload
        if not t:
            return (False, None)
        scheduled = _dt_on_date_utc(_today_utc(now), t)
        return (now >= scheduled, scheduled)

    if kind == "weekly":
        dow, t = payload
        if t is None:
            return (False, None)
        today0 = _today_utc(now)
        if today0.weekday() != dow:
            return (False, None)
        scheduled = _dt_on_date_utc(today0, t)
        return (now >= scheduled, scheduled)

    return (False, None)

def _already_exported_for_window(report_id: str, file_type: str, window_start: datetime, window_end: datetime) -> bool:
    return ReportAsset.objects.filter(
        report_id=report_id,
        file_type=file_type,
        created_at__gte=window_start,
        created_at__lt=window_end,
    ).exists()

def _job_enqueued_for_window(report_id: str, window_start: datetime, window_end: datetime) -> bool:
    return Job.objects.filter(
        report_id=report_id,
        type="export",
        created_at__gte=window_start,
        created_at__lt=window_end,
        status__in=("queued", "running"),
    ).exists()

def _load_export_config(config_id: Optional[str]) -> Dict[str, Any]:
    cfg = EXPORT_CONFIG_MAP.get(config_id or "", None)
    if isinstance(cfg, dict):
        fmt = (cfg.get("format") or "pdf").lower()
        sch = cfg.get("schedule") or "daily@09:00"
        return {"format": fmt, "schedule": sch}
    return DEFAULT_EXPORT_CONFIG.copy()

@shared_task(bind=True)
def scan_and_schedule_exports(self):
    """
    Recommended Celery Beat: */5 * * * * (every 5 minutes).
    """
    now = timezone.now()

    qs = (
        Report.objects
        .filter(status="approved")
        .exclude(Q(export_config_id__isnull=True) | Q(export_config_id__exact=""))
        .only("id", "export_config_id", "status", "created_at", "updated_at")
    )

    for rpt in qs.iterator():
        cfg = _load_export_config(rpt.export_config_id)
        fmt = (cfg.get("format") or "pdf").lower()
        if fmt not in ("pdf", "pptx"):
            fmt = "pdf"
        schedule_expr = cfg.get("schedule") or "daily@09:00"

        due, scheduled_at = _is_due(now, schedule_expr)
        if not due or scheduled_at is None:
            continue

        window_start = scheduled_at
        window_end = scheduled_at + timedelta(days=1)

        if _already_exported_for_window(rpt.id, fmt, window_start, window_end):
            logger.debug("Skip export (already exported): report=%s schedule=%s", rpt.id, schedule_expr)
            continue

        if _job_enqueued_for_window(rpt.id, window_start, window_end):
            logger.debug("Skip export (job already queued/running): report=%s schedule=%s", rpt.id, schedule_expr)
            continue

        date_key = window_start.astimezone(timezone.utc).strftime("%Y%m%d")
        # Truncate report_id to max 20 chars and use shorter timestamp
        short_report_id = rpt.id[:20] if len(rpt.id) > 20 else rpt.id
        short_timestamp = str(int(pytime.time()))[-8:]  # Last 8 digits
        job_id = f"exp_{short_report_id}_{date_key}_{short_timestamp}_{secrets.token_hex(2)}"

        with transaction.atomic():
            job = Job.objects.create(
                id=job_id,
                report=rpt,
                type="export",
                status="queued",
                message=f"scheduled run at {scheduled_at.isoformat()} fmt={fmt}",
            )
        try:
            export_report_task.delay(job.id, rpt.id, fmt, False)
            logger.info("Scheduled export: report=%s job=%s schedule=%s fmt=%s", rpt.id, job.id, schedule_expr, fmt)
        except Exception as e:
            job.status = "failed"
            job.message = f"enqueue error: {e}"
            job.save(update_fields=["status", "message", "updated_at"])
            logger.exception("Failed to enqueue export for report=%s job=%s", rpt.id, job.id)
