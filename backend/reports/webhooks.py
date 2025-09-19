# /app/reports/webhooks.py
# Purpose: Minimal webhook sender with HMAC-SHA256 signature, OAS-aligned payload fields.

from __future__ import annotations
import hmac, hashlib, json, os, time
import logging
from typing import Any, Dict
import requests

log = logging.getLogger(__name__)

WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "dev_secret")
WEBHOOK_ENDPOINT = os.getenv("WEBHOOK_ENDPOINT", "http://localhost:9100")
TIMEOUT_SECS = float(os.getenv("WEBHOOK_TIMEOUT", "5"))
RETRIES = int(os.getenv("WEBHOOK_RETRIES", "2"))

def _compose_url(event: str) -> str:
    base = WEBHOOK_ENDPOINT.rstrip("/")
    return f"{base}/{event}"

def _post(event: str, payload: Dict[str, Any]) -> None:
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Event": event,
        "X-Signature-256": sig,
        "X-Idempotency-Key": hashlib.sha256(body).hexdigest(),
    }
    url = _compose_url(event)
    for attempt in range(1, RETRIES + 2):
        try:
            r = requests.post(url, data=body, headers=headers, timeout=TIMEOUT_SECS)
            if 200 <= r.status_code < 300:
                return
            log.warning("Webhook %s non-2xx: %s %s", event, r.status_code, r.text)
        except Exception as e:
            log.warning("Webhook %s attempt %d failed: %s", event, attempt, e)
        time.sleep(0.25 * attempt)

def _report_payload(report) -> Dict[str, Any]:
    return {
        "id": report.id,
        "title": getattr(report, "title", None),
        "owner_id": getattr(report, "owner_id", None),
        "status": getattr(report, "status", None),
        "report_template_id": getattr(report, "report_template_id", None),
        "created_at": getattr(report, "created_at", None).isoformat() if getattr(report, "created_at", None) else None,
        "updated_at": getattr(report, "updated_at", None).isoformat() if getattr(report, "updated_at", None) else None,
    }

def _job_payload(job) -> Dict[str, Any]:
    return {
        "id": job.id,
        "type": job.type,
        "status": job.status,
        "message": job.message,
        "created_at": getattr(job, "created_at", None).isoformat() if getattr(job, "created_at", None) else None,
        "updated_at": getattr(job, "updated_at", None).isoformat() if getattr(job, "updated_at", None) else None,
        "result_asset_id": getattr(job, "result_asset_id", None),
        "page_id": getattr(job, "page_id", None),
        "page_url": getattr(job, "page_url", None),
    }

def _asset_payload(asset) -> Dict[str, Any]:
    return {
        "id": asset.id,
        "report_id": getattr(asset, "report_id", None),
        "file_url": asset.file_url,
        "file_type": asset.file_type,
        "checksum": getattr(asset, "checksum", "") or "",
        "created_at": getattr(asset, "created_at", None).isoformat() if getattr(asset, "created_at", None) else None,
        "updated_at": getattr(asset, "updated_at", None).isoformat() if getattr(asset, "updated_at", None) else None,
    }

def fire_report_submitted(report, triggered_by: str) -> None:
    _post("report.submitted", {
        "report": _report_payload(report),
        "triggered_by": triggered_by,
        "occurred_at": getattr(report, "updated_at", None).isoformat() if getattr(report, "updated_at", None) else None,
    })

def fire_report_approved(report, approver_id: str) -> None:
    _post("report.approved", {
        "report": _report_payload(report),
        "approver_id": approver_id,
        "occurred_at": getattr(report, "updated_at", None).isoformat() if getattr(report, "updated_at", None) else None,
    })

def fire_export_completed(job, asset) -> None:
    _post("export.completed", {
        "job": _job_payload(job),
        "asset": _asset_payload(asset),
        "occurred_at": getattr(job, "updated_at", None).isoformat() if getattr(job, "updated_at", None) else None,
    })

def fire_report_published(job, page_id: str, page_url: str) -> None:
    _post("report.published", {
        "job": _job_payload(job),
        "page_id": page_id,
        "page_url": page_url,
        "occurred_at": getattr(job, "updated_at", None).isoformat() if getattr(job, "updated_at", None) else None,
    })