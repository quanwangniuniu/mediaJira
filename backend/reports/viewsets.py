# viewsets.py — ORM-backed ViewSets + workflow actions (English comments)

from __future__ import annotations  # allow forward references in type hints (must be first)

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
# from .exceptions import ReportLocked  # No longer used - re-approval mode allows all operations
# from .utils_versioning import fork_report_to_draft  # DELETED - Simplified version control

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
# from .etag import ETagMixin  # DELETED - Remove complex ETag caching
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
        # Keep existing behavior: PPTX optionally includes raw CSV (if export_pptx supports it)
        from .services import export_pptx
        out_path = export_pptx.export_pptx(
            assembled,
            title=assembled["report"].title,
            include_raw_csv=include_csv,  # ← Keep for PPTX
        )
        ext = "pptx"
        with open(out_path, "rb") as f:
            content = f.read()
    else:
        # PDF no longer includes CSV; new signature has no include_raw_csv
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

    # Filter options
    filterset_fields = ["is_default"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "updated_at"]
    ordering = ["-updated_at"]

class ReportViewSet(ModelViewSet):  # Simplified: removed ETagMixin
    """
    Simplified Reports ViewSet: Basic CRUD + Re-approval Mode + One-click Export
    Retains core functionality: /submit, /approve, /export, /publish/confluence
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
        """Choose permission classes by action"""
        action_permissions = {
            'list': [IsReportViewer()],
            'retrieve': [IsReportViewer()],
            'create': [IsReportEditor()],
            'update': [IsReportEditor()],
            'partial_update': [IsReportEditor()],
            'destroy': [IsReportEditor()],
            'submit': [IsReportEditor()],
            'approve': [IsApprover()],
            'export': [IsReportEditor()],
            'publish_confluence': [IsReportEditor()],
        }
        return action_permissions.get(self.action, [])
        

    # GET /reports/{id}/ — Simplified version, removed ETag logic
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def _handle_reapproval_mode(self, obj, request, response):
        """Unified re-approval mode handling for approved reports"""
        if obj.status == "approved":
            modification_reason = request.data.get('modification_reason', 'Modified after approval')
            # Re-get the object after update to ensure we have the latest version
            obj = self.get_object()
            obj.status = 'draft'
            obj.save()  # Save the status change
            # Record modification reason
            from .models import ReportAnnotation
            import uuid
            ReportAnnotation.objects.create(
                id=f"mod_{obj.id}_{uuid.uuid4().hex[:8]}",
                report=obj,
                author_id=getattr(request.user, 'id', 'unknown'),
                body_md=f"**Modification Reason**: {modification_reason}",
                status='resolved'
            )
            self._send_modification_webhook(obj, getattr(request.user, 'id', 'unknown'), modification_reason)
            # Update the response data to reflect the new status
            if hasattr(response, 'data') and response.data:
                response.data['status'] = 'draft'
        return response

    # PATCH/PUT — Keep original API, only simplify internal logic + re-approval mode
    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        was_approved = obj.status == "approved"
        
        # Execute original update logic (simplified ETag part)
        response = super().update(request, *args, **kwargs)
        
        # Re-approval mode: Allow modification of approved reports, automatically reset to draft
        if was_approved:
            response = self._handle_reapproval_mode(obj, request, response)
        
        return response

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        was_approved = obj.status == "approved"
        
        # Execute original update logic (simplified ETag part)
        response = super().partial_update(request, *args, **kwargs)
        
        # Re-approval mode: Allow modification of approved reports, automatically reset to draft
        if was_approved:
            response = self._handle_reapproval_mode(obj, request, response)
        
        return response

    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass  # Ignore webhook failures

    def _send_modification_webhook(self, report, user_id, reason):
        """Send modification notification webhook"""
        self._send_webhook('report.modified_after_approval', {
            'report_id': report.id,
            'report_title': report.title,
            'modified_by': user_id,
            'modification_reason': reason,
            'requires_reapproval': True,
            'timestamp': timezone.now().isoformat()
        })

    # DELETE /reports/{id}/ — Simplified version, only check status
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        # Re-approval mode: Allow deletion of approved reports, reset status to draft
        if obj.status == "approved":
            obj.status = "draft"
            obj.save()
            # Record deletion reason
            from .models import ReportAnnotation
            import uuid
            ReportAnnotation.objects.create(
                id=f"del_{obj.id}_{uuid.uuid4().hex[:8]}",
                report=obj,
                author_id=getattr(request.user, 'id', 'unknown'),
                body_md=f"**Deletion Reason**: Report deleted after approval",
                status='resolved'
            )
        return super().destroy(request, *args, **kwargs)

    # POST /reports/{id}/submit/ — Keep original API: draft → in_review
    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        rpt = self.get_object()
        if rpt.status != "draft":
            return Response({"detail": "Report must be in 'draft' status."}, status=409)
        rpt.status = "in_review"
        rpt.save(update_fields=["status", "updated_at"])
        # Simplified webhook call
        self._send_webhook('report.submitted', {
            'report_id': rpt.id,
            'triggered_by': str(getattr(request.user, "id", ""))
        })
        return Response(self.get_serializer(rpt).data)

    # POST /reports/{id}/approve/ — Keep original API: in_review → approved/draft
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

        # Simplified: directly update status, no ReportApproval record creation
        with transaction.atomic():
            if action_ == "approve":
                rpt.status = "approved"
            else:
                rpt.status = "draft"
            rpt.save(update_fields=["status", "updated_at"])
            
            # Use ReportAnnotation to record approval (reuse existing model)
            from .models import ReportAnnotation
            ReportAnnotation.objects.create(
                id=f"appr_{rpt.id}_{int(time.time())}_{secrets.token_hex(4)}",
                report=rpt,
                author_id=str(getattr(request.user, "id", "")),
                body_md=f"**Approval Result**: {action_}\n\n**Comment**: {comment}" if comment else f"**Approval Result**: {action_}",
                status='resolved'
            )

        if action_ == "approve":
            # Simplified webhook call
            self._send_webhook('report.approved', {
                'report_id': rpt.id,
                'approver_id': str(getattr(request.user, "id", ""))
            })
        return Response(self.get_serializer(rpt).data)
    
    # Removed fork method - use re-approval mode instead
    
    # POST /reports/{id}/export/ — Keep original API: return Job (but simplify internal logic)
    @action(detail=True, methods=["post"])
    def export(self, request, pk=None):
        rpt = self.get_object()
        if rpt.status != "approved":
            return Response({"detail": "Report must be in 'approved' status."}, status=409)

        fmt = (request.data or {}).get("format", "pdf")
        include_csv = bool((request.data or {}).get("include_raw_csv", False))

        # Keep original job_id generation logic
        short_report_id = rpt.id[:20] if len(rpt.id) > 20 else rpt.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"exp_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"
        
        # Create Job record (keep original API)
        from .models import Job
        job = Job.objects.create(
            id=job_id,
            report=rpt,
            type="export",
            status="queued",
        )
        
        # Simplified: direct synchronous export, no Celery (but API remains the same)
        try:
            self._export_sync_simple(job.id, rpt.id, fmt, include_csv)
        except Exception:
            job.status = "failed"
            job.save()
        
        from .serializers import JobSerializer
        return Response(JobSerializer(job).data, status=202)

    # POST /reports/{id}/publish/confluence/ — Keep original API: return Job (mock publish)
    @action(detail=True, methods=["post"], url_path="publish/confluence")
    def publish_confluence(self, request, pk=None):
        rpt = self.get_object()
        if rpt.status != "approved":
            return Response({"detail": "Report must be in 'approved' status."}, status=409)

        opts: Dict[str, Any] = request.data or {}
        # Keep original job_id generation logic
        short_report_id = rpt.id[:20] if len(rpt.id) > 20 else rpt.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"pub_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"
        
        # Create Job record (keep original API)
        from .models import Job
        job = Job.objects.create(
            id=job_id,
            report=rpt,
            type="publish",
            status="queued",
        )
        
        # Simplified: direct mock publish
        try:
            self._publish_sync_simple(job.id, rpt.id, opts)
        except Exception:
            job.status = "failed"
            job.save()
        
        from .serializers import JobSerializer
        return Response(JobSerializer(job).data, status=202)
    
    def _publish_sync_simple(self, job_id: str, report_id: str, opts: Dict[str, Any]):
        """Simplified synchronous publish logic (mock mode)"""
        from .models import Job, Report, ReportAsset
        
        try:
            job = Job.objects.get(id=job_id)
            report = Report.objects.get(id=report_id)
            
            # Mock publish to Confluence
            mock_page_url = f"https://company.atlassian.net/wiki/spaces/REPORTS/pages/{int(time.time())}/{report.title.replace(' ', '-')}"
            
            # Create Confluence asset record
            asset = ReportAsset.objects.create(
                id=f"confluence_{report.id}_{int(time.time())}",
                report=report,
                file_type='confluence',
                file_url=mock_page_url
            )
            
            # Update Job status
            job.status = "succeeded"
            job.result_asset_id = asset.id
            job.save()
            
            # Send webhook
            try:
                from .webhooks import send_webhook
                send_webhook('report.published', {
                    'report_id': report.id,
                    'job_id': job_id,
                    'page_url': mock_page_url,
                    'asset_id': asset.id
                })
            except Exception:
                pass
                
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            job.save()
            raise
    
    # Simplified synchronous export method (replaces complex Celery tasks)
    def _export_sync_simple(self, job_id: str, report_id: str, fmt: str, include_csv: bool = False):
        """Simplified synchronous export logic"""
        from .models import Job, Report, ReportAsset
        
        try:
            job = Job.objects.get(id=job_id)
            report = Report.objects.get(id=report_id)
            
            # 1. Get data
            data = self._get_upstream_data(report)
            
            # 2. Render template
            html_content = self._render_template(report, data)
            
            # 3. Export file
            if fmt == "pdf":
                file_path = self._export_pdf(html_content, report.title)
            else:
                file_path = self._export_pptx(html_content, report.title)
            
            # 4. Create asset record
            asset = ReportAsset.objects.create(
                id=f"asset_{report.id}_{fmt}_{int(time.time())}",
                report=report,
                file_type=fmt,
                file_url=file_path
            )
            
            # 5. Update Job status
            job.status = "succeeded"
            job.result_asset_id = asset.id
            job.save()
            
            # 6. Send webhook
            try:
                from .webhooks import send_webhook
                send_webhook('export.completed', {
                    'report_id': report.id,
                    'job_id': job_id,
                    'asset_id': asset.id
                })
            except Exception:
                pass
                
        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            job.save()
            raise
    
    # Helper method: get upstream data
    def _get_upstream_data(self, report):
        """Call upstream API to get data"""
        slice_config = report.slice_config or {}
        
        if 'api_url' in slice_config:
            import requests
            try:
                response = requests.post(
                    slice_config['api_url'],
                    json=slice_config.get('params', {}),
                    headers=slice_config.get('headers', {}),
                    timeout=30
                )
                response.raise_for_status()
                return response.json()
            except Exception as e:
                # If API call fails, return mock data
                return {
                    'error': f'API call failed: {str(e)}',
                    'mock_data': [
                        {'Campaign': 'Facebook Ads', 'Cost': 50000, 'Revenue': 125000},
                        {'Campaign': 'Google Ads', 'Cost': 40000, 'Revenue': 100000}
                    ]
                }
        elif 'inline_data' in slice_config:
            return slice_config['inline_data']
        
        # Default return sample data
        return {
            'campaigns': [
                {'name': 'Sample Campaign', 'cost': 10000, 'revenue': 25000}
            ],
            'total_cost': 10000,
            'total_revenue': 25000
        }
    
    def _render_template(self, report, data):
        """Simple template rendering"""
        # Get first section's content_md as template
        sections = report.sections.all()
        if not sections:
            return f"<h1>{report.title}</h1><p>No content available</p>"
        
        from jinja2 import Template
        
        def make_table(rows):
            """Generate HTML table"""
            if not rows:
                return "<p>No data available</p>"
            
            if isinstance(rows, list) and rows and isinstance(rows[0], dict):
                headers = list(rows[0].keys())
                html = "<table border='1' style='border-collapse: collapse;'><thead><tr>"
                for h in headers:
                    html += f"<th style='padding: 8px; background: #f0f0f0;'>{h}</th>"
                html += "</tr></thead><tbody>"
                for row in rows:
                    html += "<tr>"
                    for h in headers:
                        html += f"<td style='padding: 8px;'>{row.get(h, '')}</td>"
                    html += "</tr>"
                html += "</tbody></table>"
                return html
            
            return "<p>Invalid table data format</p>"
        
        try:
            template = Template(sections[0].content_md)
            return template.render(**data, table=make_table)
        except Exception as e:
            return f"<h1>{report.title}</h1><p>Template rendering error: {str(e)}</p>"
    
    def _export_pdf(self, html_content, title):
        """Use existing PDF export (MediaJira branding)"""
        from .services.export_pdf import export_pdf
        
        # Construct assembled object
        assembled = {
            'html': html_content,
            'report': type('SimpleReport', (), {
                'title': title,
                'id': f'simple_{int(time.time())}',
                'time_range_start': None,
                'time_range_end': None
            })()
        }
        
        return export_pdf(assembled, theme='light')
    
    def _export_pptx(self, html_content, title):
        """Use existing PPTX export (MediaJira branding)"""
        from .services.export_pptx import export_pptx
        
        # Construct assembled object
        assembled = {
            'html': html_content,
            'report': type('SimpleReport', (), {
                'title': title,
                'id': f'simple_{int(time.time())}',
                'time_range_start': None,
                'time_range_end': None
            })()
        }
        
        return export_pptx(assembled, title=title, theme='light')


# ---------------------------------------
# Nested resources (expected nested router param: report_pk)
# ---------------------------------------
class ReportSectionViewSet(ModelViewSet):  # Simplified: removed ETagMixin
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
            # Re-approval mode: allow creation, reset report status to draft
            parent.status = "draft"
            parent.save()
        serializer.save(report_id=report_id)

    # GET /reports/{id}/sections/{sid}/ — Simplified version
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    # PATCH — Simplified version, keep re-approval mode
    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            # Re-approval mode: allow modification, reset report status
            obj.report.status = "draft"
            obj.report.save()
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            # Re-approval mode: allow modification, reset report status
            obj.report.status = "draft"
            obj.report.save()
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            # Re-approval mode: allow deletion, reset report status to draft
            obj.report.status = "draft"
            obj.report.save()
        return super().destroy(request, *args, **kwargs)



class ReportAnnotationViewSet(ModelViewSet):  # Simplified: removed ETagMixin
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
            # Re-approval mode: allow creation, reset report status to draft
            parent.status = "draft"
            parent.save()
        author = str(getattr(self.request.user, "id", ""))
        serializer.save(report_id=report_id, author_id=author)


    # GET /reports/{id}/annotations/{aid}/ — Simplified version
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    # PATCH — Simplified version, keep re-approval mode
    def partial_update(self, request, *args, **kwargs):
        ann = self.get_object()
        if ann.report.status == "approved":
            # Re-approval mode: allow modification, reset report status
            ann.report.status = "draft"
            ann.report.save()
        new_status = (request.data or {}).get("status")
        if new_status != "resolved":
            return Response({"detail": "status must be 'resolved'."}, status=400)
        ann.mark_resolved(str(getattr(request.user, "id", "")))
        ann.save(update_fields=["status", "resolved_at", "resolved_by", "updated_at"])
        return Response(self.get_serializer(ann).data)
    
    def destroy(self, request, *args, **kwargs):
        ann = self.get_object()
        if ann.report.status == "approved":
            # Re-approval mode: allow deletion, reset report status to draft
            ann.report.status = "draft"
            ann.report.save()
        return super().destroy(request, *args, **kwargs)


class ReportAssetViewSet(ReadOnlyModelViewSet):
    """
    OAS:
      - GET /reports/{id}/assets/
      - GET /reports/{id}/assets/{aid}/
      - POST /reports/{id}/assets/{aid}/signed_url/  
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
