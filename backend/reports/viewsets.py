# viewsets.py — ORM-backed ViewSets + workflow actions (English comments)

from __future__ import annotations

from typing import Any, Dict
import time
import secrets

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
from .services.assembler import assemble

# Prefer Celery tasks; fall back to synchronous helpers when Celery is not available (dev convenience)
try:
    from .tasks.generate_report import export_report_task, publish_confluence_task  # Celery tasks
    _CELERY_AVAILABLE = True
except Exception:
    _CELERY_AVAILABLE = False




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

class ReportViewSet(ModelViewSet):
    """
    Simplified Reports ViewSet: Basic CRUD + Re-approval Mode + One-click Export
    Retains core functionality: /submit, /approve, /export, /publish/confluence
    """
    queryset = Report.objects.all().order_by("-created_at")
    serializer_class = ReportSerializer

    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_fields = {
        "owner_id": ["exact"],
        "status": ["exact"],
        "report_template": ["exact"],
        "created_at": ["gte", "lte"],
    }
    search_fields = ["title"]
    ordering_fields = ["created_at", "updated_at", "title", "status"]
    ordering = ["-updated_at"]

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
        


    def _handle_reapproval_mode(self, obj, request, response):
        """Unified re-approval mode handling for approved reports"""
        if obj.status == "approved":
            modification_reason = request.data.get('modification_reason', 'Modified after approval')
            obj = self.get_object()
            obj.status = 'draft'
            obj.save()
            ReportAnnotation.objects.create(
                id=f"mod_{obj.id}_{secrets.token_hex(8)}",
                report=obj,
                author_id=getattr(request.user, 'id', 'unknown'),
                body_md=f"**Modification Reason**: {modification_reason}",
                status='resolved'
            )
            self._send_modification_webhook(obj, getattr(request.user, 'id', 'unknown'), modification_reason)
            if hasattr(response, 'data') and response.data:
                response.data['status'] = 'draft'
        return response

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        was_approved = obj.status == "approved"
        response = super().update(request, *args, **kwargs)
        if was_approved:
            response = self._handle_reapproval_mode(obj, request, response)
        return response

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        was_approved = obj.status == "approved"
        response = super().partial_update(request, *args, **kwargs)
        if was_approved:
            response = self._handle_reapproval_mode(obj, request, response)
        return response

    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass

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

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status == "approved":
            obj.status = "draft"
            obj.save()
            ReportAnnotation.objects.create(
                id=f"del_{obj.id}_{secrets.token_hex(8)}",
                report=obj,
                author_id=getattr(request.user, 'id', 'unknown'),
                body_md=f"**Deletion Reason**: Report deleted after approval",
                status='resolved'
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        rpt = self.get_object()
        # Note: Status check removed - reports can be submitted regardless of status
        rpt.status = "in_review"
        rpt.save(update_fields=["status", "updated_at"])
        self._send_webhook('report.submitted', {
            'report_id': rpt.id,
            'triggered_by': str(getattr(request.user, "id", ""))
        })
        return Response(self.get_serializer(rpt).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        payload = request.data or {}
        action_ = payload.get("action")
        comment = payload.get("comment")
        rpt = self.get_object()

        # Note: Status check removed - reports can be approved regardless of status
        if action_ not in ("approve", "reject"):
            raise ValidationError({"action": "Expected 'approve' or 'reject'."})

        with transaction.atomic():
            if action_ == "approve":
                rpt.status = "approved"
            else:
                rpt.status = "draft"
            rpt.save(update_fields=["status", "updated_at"])
            
            ReportAnnotation.objects.create(
                id=f"appr_{rpt.id}_{int(time.time())}_{secrets.token_hex(4)}",
                report=rpt,
                author_id=str(getattr(request.user, "id", "")),
                body_md=f"**Approval Result**: {action_}\n\n**Comment**: {comment}" if comment else f"**Approval Result**: {action_}",
                status='resolved'
            )

        if action_ == "approve":
            self._send_webhook('report.approved', {
                'report_id': rpt.id,
                'approver_id': str(getattr(request.user, "id", ""))
            })
        return Response(self.get_serializer(rpt).data)
    
    @action(detail=True, methods=["post"])
    def export(self, request, pk=None):
        rpt = self.get_object()
        # Note: Status check removed - reports can be exported regardless of status
        # If a report was modified after approval, it becomes draft but can still be exported

        fmt = (request.data or {}).get("format", "pdf")
        include_csv = bool((request.data or {}).get("include_raw_csv", False))

        short_report_id = rpt.id[:20] if len(rpt.id) > 20 else rpt.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"exp_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"

        job = Job.objects.create(
            id=job_id,
            report=rpt,
            type="export",
            status="queued",
        )
        
        try:
            self._export_sync_simple(job.id, rpt.id, fmt, include_csv)
        except Exception:
            job.status = "failed"
            job.save()
        
        return Response(JobSerializer(job).data, status=202)

    @action(detail=True, methods=["post"], url_path="publish/confluence")
    def publish_confluence(self, request, pk=None):
        rpt = self.get_object()
        # Note: Status check removed - reports can be published regardless of status
        # If a report was modified after approval, it becomes draft but can still be published

        opts: Dict[str, Any] = request.data or {}
        short_report_id = rpt.id[:20] if len(rpt.id) > 20 else rpt.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"pub_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"
        
        job = Job.objects.create(
            id=job_id,
            report=rpt,
            type="publish",
            status="queued",
        )
        
        try:
            self._publish_sync_simple(job.id, rpt.id, opts)
        except Exception:
            job.status = "failed"
            job.save()
        
        return Response(JobSerializer(job).data, status=202)

    def _publish_sync_simple(self, job_id: str, report_id: str, opts: Dict[str, Any]):
        """Simplified synchronous publish logic (mock mode)"""
        try:
            job = Job.objects.get(id=job_id)
            report = Report.objects.get(id=report_id)
            
            mock_page_url = f"https://company.atlassian.net/wiki/spaces/REPORTS/pages/{int(time.time())}/{report.title.replace(' ', '-')}"
            
            asset = ReportAsset.objects.create(
                id=f"confluence_{report.id}_{int(time.time())}",
                report=report,
                file_type='confluence',
                file_url=mock_page_url
            )
            
            job.status = "succeeded"
            job.result_asset_id = asset.id
            job.save()
            
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
    
    def _export_sync_simple(self, job_id: str, report_id: str, fmt: str, include_csv: bool = False):
        """Simplified synchronous export logic"""
        try:
            job = Job.objects.get(id=job_id)
            report = Report.objects.get(id=report_id)
            
            data = self._get_upstream_data(report)
            html_content = self._render_template(report, data)
            
            if fmt == "pdf":
                file_path = self._export_pdf(html_content, report.title)
            else:
                raise ValueError(f"Unsupported format: {fmt}")
            
            asset = ReportAsset.objects.create(
                id=f"asset_{report.id}_{fmt}_{int(time.time())}",
                report=report,
                file_type=fmt,
                file_url=file_path
            )
            
            job.status = "succeeded"
            job.result_asset_id = asset.id
            job.save()
            
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
                return {
                    'error': f'API call failed: {str(e)}',
                    'mock_data': [
                        {'Campaign': 'Facebook Ads', 'Cost': 50000, 'Revenue': 125000},
                        {'Campaign': 'Google Ads', 'Cost': 40000, 'Revenue': 100000}
                    ]
                }
        elif 'inline_data' in slice_config:
            return slice_config['inline_data']
        
        return {
            'campaigns': [
                {'name': 'Sample Campaign', 'cost': 10000, 'revenue': 25000}
            ],
            'total_cost': 10000,
            'total_revenue': 25000
        }
    
    def _render_template(self, report, data):
        """Simple template rendering"""
        if not report.report_template:
            return f"<h1>{report.title}</h1><p>No template available</p>"
        
        from jinja2 import Template, Undefined
        
        class SafeUndefined(Undefined):
            def __format__(self, format_spec):
                return "N/A"
            
            def __str__(self):
                return "N/A"
            
            def __int__(self):
                return 0
            
            def __float__(self):
                return 0.0
            
            def __getattr__(self, name):
                return SafeUndefined(name=f"{self._undefined_name}.{name}")
            
            def __getitem__(self, key):
                return SafeUndefined(name=f"{self._undefined_name}[{key}]")
            
            def __call__(self, *args, **kwargs):
                return SafeUndefined(name=f"{self._undefined_name}()")
            
            def __bool__(self):
                return False
            
            def __len__(self):
                return 0
            
            def __iter__(self):
                return iter([])
        
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
            template = Template(report.report_template.blocks, undefined=SafeUndefined)
            
            campaigns = data.get('campaigns', []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            
            context = {
                'table': make_table,
                'make_table': make_table,
                'tables': type('Tables', (), {
                    'campaigns': campaigns,
                    'default': campaigns
                })(),
                'has_chart': lambda chart_name, data=None: self._has_chart(chart_name, data if data is not None else campaigns),
                'chart': lambda chart_name, chart_type='bar', title='Chart', x_field='x', y_field='y', data=None: self._chart(chart_name, chart_type, title, x_field, y_field, data or campaigns),
                'total_records': len(data) if isinstance(data, list) else 0,
                'date_range': 'Test Period',
                'total_cost': 0,
                'total_revenue': 0,
                'net_profit': 0,
                'roi_percentage': 0,
                'roas': 0,
                'total_leads': 0,
                'active_campaigns': 0,
                'paused_campaigns': 0,
                'other_campaigns': 0
            }
            
            if isinstance(data, dict):
                context.update(data)
            
            return template.render(**context)
        except Exception as e:
            return f"<h1>{report.title}</h1><p>Template rendering error: {str(e)}</p>"
    
    def _export_pdf(self, html_content, title):
        """Use existing PDF export (MediaJira branding)"""
        import os
        from .services.export_pdf import export_pdf
        
        assembled = {
            'html': html_content,
            'report': type('SimpleReport', (), {
                'title': title,
                'id': f'simple_{int(time.time())}',
                'time_range_start': None,
                'time_range_end': None
            })()
        }
        
        pdf_path = export_pdf(assembled, theme='light')
        
        try:
            with open(pdf_path, 'rb') as f:
                pdf_content = f.read()
            return pdf_content
        finally:
            if os.path.exists(pdf_path):
                os.unlink(pdf_path)
    
    def _has_chart(self, chart_name, data=None):
        """Check if chart can be generated for given data"""
        if not data:
            return False
        if isinstance(data, list) and len(data) > 0:
            return True
        return False
    
    def _chart(self, chart_name, chart_type, title, x_field, y_field, data=None):
        """Generate chart and return base64 encoded image"""
        try:
            from .services.assembler import _generate_bar_chart, _generate_scatter_chart, _generate_pie_chart, _generate_line_chart
            import base64
            import os
            
            if not data or not isinstance(data, list) or len(data) == 0:
                return f'<p>No data available for chart: {title}</p>'
            
            chart_path = None
            if chart_type == 'bar':
                chart_path = _generate_bar_chart(data, x_field, y_field, title)
            elif chart_type == 'scatter':
                chart_path = _generate_scatter_chart(data, x_field, y_field, title)
            elif chart_type == 'pie':
                chart_path = _generate_pie_chart(data, x_field, y_field, title)
            elif chart_type == 'line':
                chart_path = _generate_line_chart(data, x_field, [y_field], title)
            else:
                return f'<p>Unsupported chart type: {chart_type}</p>'
            
            if not chart_path or not os.path.exists(chart_path):
                return f'<p>Failed to generate chart: {title}</p>'
            
            try:
                with open(chart_path, 'rb') as f:
                    img_data = f.read()
                
                base64_data = base64.b64encode(img_data).decode('utf-8')
                return f'<img src="data:image/png;base64,{base64_data}" alt="{title}" style="max-width: 100%; height: auto;" />'
                
            finally:
                if os.path.exists(chart_path):
                    os.unlink(chart_path)
                
        except Exception as e:
            return f'<p>Error generating chart {title}: {str(e)}</p>'
    
class ReportSectionViewSet(ModelViewSet):
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
            parent.status = "draft"
            parent.save()
        serializer.save(report_id=report_id)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            obj.report.status = "draft"
            obj.report.save()
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            obj.report.status = "draft"
            obj.report.save()
        return super().partial_update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.report.status == "approved":
            obj.report.status = "draft"
            obj.report.save()
        return super().destroy(request, *args, **kwargs)



class ReportAnnotationViewSet(ModelViewSet):
    """
    OAS:
      - GET/POST   /reports/{id}/annotations/
      - GET/PATCH  /reports/{id}/annotations/{aid}/   (PATCH only allows status=resolved)
    """
    serializer_class = ReportAnnotationSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsReportViewer()]
        return [IsAuthorApproverOrAdmin()]

    def get_queryset(self):
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
            parent.status = "draft"
            parent.save()
        author = str(getattr(self.request.user, "id", ""))
        serializer.save(report_id=report_id, author_id=author)

    def partial_update(self, request, *args, **kwargs):
        ann = self.get_object()
        if ann.report.status == "approved":
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
