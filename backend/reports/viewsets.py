# viewsets.py — ORM-backed ViewSets + workflow actions (English comments)

from __future__ import annotations  # allow forward references in type hints (must be first)

import time
import secrets
from typing import Any, Dict

from django.db import transaction
from django.utils import timezone
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .exceptions import ReportLocked
from .utils_versioning import fork_report_to_draft

from .models import ReportTemplate
from .serializers import ReportTemplateSerializer

from .models import (
    Report,
    ReportSection,
    ReportAnnotation,
    ReportApproval,
    ReportAsset,
    Job,
)
from .serializers import (
    ReportSerializer,
    ReportSectionSerializer,
    ReportAnnotationSerializer,
    ReportApprovalSerializer,
    ReportAssetSerializer,
    JobSerializer,
)
from .permissions import (
    IsReportViewer,
    IsReportEditor,
    IsApprover,
    IsAuthorApproverOrAdmin,
)
from .etag import ETagMixin
from .services.assembler import assemble

# Prefer Celery tasks; fall back to synchronous helpers when Celery is not available (dev convenience)
try:
    from .tasks.generate_report import export_report_task, publish_confluence_task  # Celery tasks
    _CELERY_AVAILABLE = True
except Exception:
    _CELERY_AVAILABLE = False


# ---------------------------------------
# Helpers: synchronous fallbacks for export/publish (if Celery is unavailable)
# ---------------------------------------
def _export_sync(job_id: str, report_id: str, fmt: str = "pdf", include_csv: bool = False) -> None:
    """
    Synchronous export fallback used when Celery is unavailable.
    Mirrors the async task logic: assemble → export → store → create asset → update job → fire webhook.

    NOTE:
    - PDF path now ignores `include_csv` (no CSV appendix). `export_pdf` signature is export_pdf(assembled, theme="light").
    - PPTX path keeps `include_raw_csv` for export_pptx if your exporter supports embedding raw CSV.
    """
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    from .services.export_pdf import export_pdf
    from .services.storage import upload_report_file
    import hashlib

    job = Job.objects.get(pk=job_id)
    job.status = "running"
    job.save(update_fields=["status", "updated_at"])

    assembled = assemble(report_id)

    if fmt == "pptx":
        # Keep existing behavior: PPTX 可选附带原始 CSV（若 export_pptx 支持）
        from .services import export_pptx
        out_path = export_pptx.export_pptx(
            assembled,
            title=assembled["report"].title,
            include_raw_csv=include_csv,  # ← 保留给 PPTX
        )
        ext = "pptx"
        with open(out_path, "rb") as f:
            content = f.read()
    else:
        # PDF 不再附加 CSV；新签名无 include_raw_csv
        out_path = export_pdf(assembled, theme="light")
        ext = "pdf"
        with open(out_path, "rb") as f:
            content = f.read()

    # persist file + checksum using new storage service
    filename = f"{job_id}.{ext}"
    storage_result = upload_report_file(
        file_content=content,
        filename=filename,
        content_type='application/pdf' if ext == 'pdf' else 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        folder=f"reports/{report_id}"
    )
    url = storage_result['file_url']
    checksum = hashlib.sha256(content).hexdigest()

    # create ReportAsset + mark job succeeded
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

    # best-effort webhook
    try:
        from .webhooks import fire_export_completed
        fire_export_completed(job, asset)
    except Exception:
        pass



def _publish_sync(job_id: str, report_id: str, opts: Dict[str, Any]) -> None:
    """
    Synchronous publish fallback used when Celery is unavailable.
    Assemble → publish to Confluence (mock/real via service) → update job fields.
    """
    from .services.publisher_confluence import publish_html

    job = Job.objects.get(pk=job_id)
    job.status = "running"
    job.save(update_fields=["status", "updated_at"])

    assembled = assemble(report_id)
    page_id, page_url = publish_html(assembled["html"], opts)
    job.page_id = page_id
    job.page_url = page_url
    job.status = "succeeded"
    job.save(update_fields=["page_id", "page_url", "status", "updated_at"])


# ---------------------------------------
# ViewSet: Report (includes workflow actions)
# ---------------------------------------
class ReportTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for Report Templates
    """
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [IsAuthenticated]

    # choice： 
    filterset_fields = ["is_default"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-updated_at"]

class ReportViewSet(ETagMixin, ModelViewSet):
    """
    Implements CRUD for reports and workflow endpoints (/submit, /approve, /export, /publish/confluence).
    Adds ETag handling (If-None-Match for 304, If-Match for updates) via ETagMixin.
    """
    queryset = Report.objects.all().order_by("-created_at")
    serializer_class = ReportSerializer

    # enable filtering, search, and ordering to align with OAS query params
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    # Mapping:
    # - owner_id: exact
    # - status: exact
    # - report_template: exact (client can pass ?report_template=<tpl_id>)
    # - created_at: gte/lte (maps to created_from / created_to)
    filterset_fields = {
        "owner_id": ["exact"],
        "status": ["exact"],
        "report_template": ["exact"],
        "created_at": ["gte", "lte"],
    }
    search_fields = ["title"]  # maps to ?search=<title>
    ordering_fields = ["created_at", "updated_at", "title", "status"]
    ordering = ["-updated_at"]  # default ordering (can be overridden via ?ordering=)

    def get_permissions(self):
        """
        Choose permission classes by action:
        - list/retrieve: read-only viewer
        - create/update/partial_update/destroy/submit: editor (author/editor/admin or owner)
        - approve: approver/admin
        - export/publish_confluence: editor (author/editor/admin)
        """
        if self.action in ["list", "retrieve"]:
            return [IsReportViewer()]
        elif self.action in ["create", "update", "partial_update", "destroy", "submit"]:
            return [IsReportEditor()]
        elif self.action in ["approve"]:
            return [IsApprover()]
        elif self.action in ["export", "publish_confluence"]:
            return [IsReportEditor()]
        return super().get_permissions()
        

    # GET /reports/{id}/ — support 304 (If-None-Match) via ETagMixin
    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        resp_304 = self.check_not_modified(request, obj)
        if resp_304:
            return resp_304
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    # PATCH/PUT — require If-Match and recompute query_hash if key fields changed
    # PATCH/PUT — require If-Match；但若已 approved 先 409
    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status == "approved":
            raise ReportLocked(obj.id)
        self.check_precondition(request, obj, required=True)
        return self._update_and_rehash(request, full=True, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status == "approved":
            raise ReportLocked(obj.id)
        self.check_precondition(request, obj, required=True)
        return self._update_and_rehash(request, full=False, *args, **kwargs)

    def _update_and_rehash(self, request, full: bool, *args, **kwargs):
        """
        Apply update, then recompute query_hash when slice/time_range/template changed.
        Lock reports in approved/published states.
        """
        obj = self.get_object()
        if obj.status in ("approved", "published"):
            raise ValidationError({"detail": "Report is locked (approved/published)."})

        before = {
            "slice_config": obj.slice_config,
            "time_range_start": obj.time_range_start,
            "time_range_end": obj.time_range_end,
            "report_template_id": obj.report_template_id,
        }

        if full:
            response = super().update(request, *args, **kwargs)
        else:
            response = super().partial_update(request, *args, **kwargs)

        obj.refresh_from_db()

        changed = (
            before["slice_config"] != obj.slice_config
            or before["time_range_start"] != obj.time_range_start
            or before["time_range_end"] != obj.time_range_end
            or before["report_template_id"] != obj.report_template_id
        )
        if changed:
            obj.recompute_query_hash()
            obj.save(update_fields=["query_hash", "updated_at"])
            response.data = self.get_serializer(obj).data
        return response

    # DELETE /reports/{id}/ — require If-Match (handled by ETagMixin)
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status == "approved":
            raise ReportLocked(obj.id)
        self.check_precondition(request, obj, required=True)
        return super().destroy(request, *args, **kwargs)

    # POST /reports/{id}/submit/ — transition: draft → in_review
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        rpt = self.get_object()
        if rpt.status != "draft":
            return Response({"detail": "Report must be in 'draft' status."}, status=409)
        rpt.status = "in_review"
        rpt.save(update_fields=["status", "updated_at"])
        # best-effort webhook
        try:
            from .webhooks import fire_report_submitted
            uid = str(getattr(request.user, "id", ""))
            fire_report_submitted(rpt, triggered_by=uid)
        except Exception:
            pass
        return Response(self.get_serializer(rpt).data)

    # POST /reports/{id}/approve/ — body: {action: approve|reject, comment?: str}
    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        payload = request.data or {}
        action_ = payload.get("action")
        comment = payload.get("comment")
        rpt = self.get_object()

        if rpt.status != "in_review":
            return Response({"detail": "Report must be in 'in_review' status."}, status=409)
        if action_ not in ("approve", "reject"):
            raise ValidationError({"action": "Expected 'approve' or 'reject'."})

        with transaction.atomic():
            appr = ReportApproval.objects.create(
                id=f"appr_{rpt.id}_{int(time.time())}_{secrets.token_hex(4)}",
                report=rpt,
                approver_id=str(getattr(request.user, "id", "")),
                status="approved" if action_ == "approve" else "rejected",
                comment=comment,
                decided_at=timezone.now(),  # audit trail
            )
            if action_ == "approve":
                rpt.status = "approved"
            else:
                rpt.status = "draft"
            rpt.save(update_fields=["status", "updated_at"])

        if action_ == "approve":
            # best-effort webhook
            try:
                from .webhooks import fire_report_approved
                fire_report_approved(rpt, approver_id=appr.approver_id)
            except Exception:
                pass
        return Response(self.get_serializer(rpt).data)
    
    # —— 新增：显式分叉 —— POST /api/reports/{id}/fork/
    @action(detail=True, methods=["post"], url_path="fork")
    def fork(self, request, pk=None):
        rpt = self.get_object()
        new_rpt = fork_report_to_draft(rpt)
        data = self.get_serializer(new_rpt).data
        resp = Response(data, status=status.HTTP_201_CREATED)
        resp["Location"]    = f"/api/reports/{new_rpt.id}/"
        resp["X-Report-Id"] = new_rpt.id
        return resp
    
    # POST /reports/{id}/export/ — queue export job (returns 202 + Job)
    @action(detail=True, methods=["post"])
    def export(self, request, pk=None):
        rpt = self.get_object()
        if rpt.status != "approved":
            return Response({"detail": "Report must be in 'approved' status."}, status=409)

        fmt = (request.data or {}).get("format", "pdf")
        include_csv = bool((request.data or {}).get("include_raw_csv", False))

        # Generate shorter job_id to fit 64 char limit
        short_report_id = rpt.id[:20] if len(rpt.id) > 20 else rpt.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"exp_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"
        
        job = Job.objects.create(
            id=job_id,
            report=rpt,
            type="export",
            status="queued",
        )
        if _CELERY_AVAILABLE:
            export_report_task.delay(job.id, rpt.id, fmt, include_csv)
        else:
            _export_sync(job.id, rpt.id, fmt, include_csv)
        return Response(JobSerializer(job).data, status=202)

    # POST /reports/{id}/publish/confluence/ — queue publish job (returns 202 + Job)
    @action(detail=True, methods=["post"], url_path="publish/confluence")
    def publish_confluence(self, request, pk=None):
        rpt = self.get_object()
        if rpt.status != "approved":
            return Response({"detail": "Report must be in 'approved' status."}, status=409)

        opts: Dict[str, Any] = request.data or {}
        # Generate shorter job_id to fit 64 char limit
        short_report_id = rpt.id[:20] if len(rpt.id) > 20 else rpt.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"pub_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"
        
        job = Job.objects.create(
            id=job_id,
            report=rpt,
            type="publish",
            status="queued",
        )
        if _CELERY_AVAILABLE:
            publish_confluence_task.delay(job.id, rpt.id, opts)
        else:
            _publish_sync(job.id, rpt.id, opts)
        return Response(JobSerializer(job).data, status=202)


# ---------------------------------------
# Nested resources (expected nested router param: report_pk)
# ---------------------------------------
class ReportSectionViewSet(ETagMixin, ModelViewSet):
    """
    OAS:
      - GET/POST   /reports/{id}/sections/
      - GET/PATCH  /reports/{id}/sections/{sid}/
    """
    serializer_class = ReportSectionSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsReportViewer()]
        return [IsReportEditor()]

    def get_queryset(self):
        """
        Filter by parent report id using nested router param names.
        Accepts report_pk / report_id / id for robustness.
        """
        report_id = self.kwargs.get("report_pk") or self.kwargs.get("report_id") or self.kwargs.get("id")
        qs = ReportSection.objects.all()
        if report_id:
            qs = qs.filter(report_id=report_id)
        return qs.order_by("order_index")

    def perform_create(self, serializer):
        report_id = self.kwargs.get("report_pk") or self.kwargs.get("report_id") or self.kwargs.get("id")
        if not report_id:
            raise ValidationError({"detail": "Missing report id in nested route."})
        parent = Report.objects.get(pk=report_id)
        if parent.status == "approved":
            raise ReportLocked(parent.id)
        serializer.save(report_id=report_id)

    # GET /reports/{id}/sections/{sid}/ — support 304
    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        resp_304 = self.check_not_modified(request, obj)
        if resp_304:
            return resp_304
        return Response(self.get_serializer(obj).data)

    # PATCH requires If-Match
    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            raise ReportLocked(obj.report_id)
        self.check_precondition(request, obj, required=True)
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            raise ReportLocked(obj.report_id)
        self.check_precondition(request, obj, required=True)
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            raise ReportLocked(obj.report_id)
        self.check_precondition(request, obj, required=True)
        return super().destroy(request, *args, **kwargs)



class ReportAnnotationViewSet(ETagMixin, ModelViewSet):
    """
    OAS:
      - GET/POST   /reports/{id}/annotations/
      - GET/PATCH  /reports/{id}/annotations/{aid}/   (PATCH only allows status=resolved)
    """
    serializer_class = ReportAnnotationSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsReportViewer()]
        # OAS requires: author/approver/admin can create annotations
        return [IsAuthorApproverOrAdmin()]

    def get_queryset(self):
        """
        Filter by parent report id and order newest-first.
        """
        report_id = self.kwargs.get("report_pk") or self.kwargs.get("report_id") or self.kwargs.get("id")
        qs = ReportAnnotation.objects.all()
        if report_id:
            qs = qs.filter(report_id=report_id)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        report_id = self.kwargs.get("report_pk") or self.kwargs.get("report_id") or self.kwargs.get("id")
        if not report_id:
            raise ValidationError({"detail": "Missing report id in nested route."})
        parent = Report.objects.get(pk=report_id)
        if parent.status == "approved":
            raise ReportLocked(parent.id)
        author = str(getattr(self.request.user, "id", ""))
        serializer.save(report_id=report_id, author_id=author)


    # GET /reports/{id}/annotations/{aid}/ — support 304
    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        resp_304 = self.check_not_modified(request, obj)
        if resp_304:
            return resp_304
        return Response(self.get_serializer(obj).data)

    # PATCH with If-Match; only allow status -> resolved
    def partial_update(self, request, *args, **kwargs):
        ann = self.get_object()
        if ann.report.status == "approved":
            raise ReportLocked(ann.report_id)
        self.check_precondition(request, ann, required=True)
        new_status = (request.data or {}).get("status")
        if new_status != "resolved":
            return Response({"detail": "status must be 'resolved'."}, status=400)
        ann.mark_resolved(str(getattr(request.user, "id", "")))
        ann.save(update_fields=["status", "resolved_at", "resolved_by", "updated_at"])
        return Response(self.get_serializer(ann).data)
    
    def destroy(self, request, *args, **kwargs):
        ann = self.get_object()
        if ann.report.status == "approved":
            raise ReportLocked(ann.report_id)
        self.check_precondition(request, ann, required=True)
        return super().destroy(request, *args, **kwargs)


class ReportAssetViewSet(ReadOnlyModelViewSet):
    """
    OAS:
      - GET /reports/{id}/assets/
      - GET /reports/{id}/assets/{aid}/
      - POST /reports/{id}/assets/{aid}/signed_url/  # 新增：生成签名URL
    """
    serializer_class = ReportAssetSerializer

    def get_permissions(self):
        return [IsReportViewer()]

    def get_queryset(self):
        """
        Filter assets by parent report id and order newest-first.
        """
        report_id = self.kwargs.get("report_pk") or self.kwargs.get("report_id") or self.kwargs.get("id")
        qs = ReportAsset.objects.all()
        if report_id:
            qs = qs.filter(report_id=report_id)
        return qs.order_by("-created_at")
    
    @action(detail=True, methods=["post"], url_path="signed_url")
    def get_signed_url(self, request, pk=None, **kwargs):
        """
        Generate signed download URL for file (returns regular URL for local storage)
        
        POST /api/reports/{report_id}/assets/{asset_id}/signed_url/
        Body: {"expires_in": 3600}  # Optional, default 1 hour
        
        Response: {
            "signed_url": "http://localhost:8000/media/reports/file.pdf",
            "expires_in": 3600,
            "asset_id": "asset_123",
            "file_type": "pdf"
        }
        """
        asset = self.get_object()
        
        # Confluence assets do not support file download
        if asset.file_type == "confluence":
            return Response(
                {"detail": "Confluence assets do not support file download"}, 
                status=400
            )
        
        # Get expiration time parameter
        expires_in = request.data.get("expires_in", 3600)
        try:
            expires_in = int(expires_in)
            if expires_in <= 0 or expires_in > 86400:  # Maximum 24 hours
                expires_in = 3600
        except (ValueError, TypeError):
            expires_in = 3600
        
        try:
            from .services.storage import StorageService, extract_storage_key_from_url
            
            # Extract storage key from file_url
            storage_key = extract_storage_key_from_url(asset.file_url)
            
            if not storage_key:
                return Response(
                    {"detail": "Cannot determine storage key from file URL"}, 
                    status=400
                )
            
            # Generate URL (returns regular URL for local storage)
            storage = StorageService()
            signed_url = storage.generate_signed_url(storage_key, expires_in=expires_in)
            
            return Response({
                "signed_url": signed_url,
                "expires_in": expires_in,
                "asset_id": asset.id,
                "file_type": asset.file_type
            })
            
        except Exception as e:
            return Response(
                {"detail": f"URL generation failed: {str(e)}"}, 
                status=500
            )


class JobViewSet(ReadOnlyModelViewSet):
    """
    OAS:
      - GET /jobs/{jid}/ (single resource only; no collection listing in OAS)
    """
    queryset = Job.objects.all().order_by("-created_at")
    serializer_class = JobSerializer

    def get_permissions(self):
        return [IsReportViewer()]

    def list(self, request, *args, **kwargs):
        """
        Disallow listing to align with OAS (only detail is defined).
        """
        return Response({"detail": "Method Not Allowed"}, status=405)
