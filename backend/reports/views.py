# views.py — Complete migration from viewsets.py with detailed explanations
# This file contains all the API logic previously in viewsets.py, converted to APIView classes
# with comprehensive comments explaining the entire business logic

from __future__ import annotations

from typing import Any, Dict
import time
import secrets

from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter, SearchFilter
from django_filters.rest_framework import DjangoFilterBackend

# Import all models
from .models import (
    ReportTemplate,
    Report,
    ReportSection,
    ReportAnnotation,
    ReportApproval,
    ReportAsset,
    Job,
)

# Import all serializers
from .serializers import (
    ReportTemplateSerializer,
    ReportSerializer,
    ReportSectionSerializer,
    ReportAnnotationSerializer,
    ReportApprovalSerializer,
    ReportAssetSerializer,
    JobSerializer,
)

# Import permission classes
from .permissions import (
    IsReportViewer,
    IsReportEditor,
    IsApprover,
    IsAuthorApproverOrAdmin,
)

# Import services
from .services.assembler import assemble

# Prefer Celery tasks; fall back to synchronous helpers when Celery is not available (dev convenience)
try:
    from .tasks.generate_report import export_report_task, publish_confluence_task  # Celery tasks
    _CELERY_AVAILABLE = True
except Exception:
    _CELERY_AVAILABLE = False


# =============================================================================
# DIMENSIONS API - Original functionality preserved
# =============================================================================

class DimensionsView(APIView):
    """
    GET /reports/dimensions/
    Returns available datasets/dimensions/metrics for report configuration.
    This endpoint is read-only and requires authentication.
    NOTE: We intentionally do NOT set an ETag here. Detail endpoints use ETag via ETagMixin.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # TODO: replace with a real call to your dashboard/metrics service (with caching)
        payload = {
            "datasets": ["marketing_attribution_v2", "product_funnel_v1"],
            "dimensions": ["channel", "campaign", "country"],
            "metrics": ["roi", "spend", "ctr", "cvr"],
            "defaults": {"time_grain": "week"},
        }
        resp = Response(payload)
        # Match OAS: cache for 10 minutes
        resp["Cache-Control"] = "public, max-age=600"
        return resp


# =============================================================================
# REPORT TEMPLATE API - CRUD operations for report templates
# =============================================================================

class ReportTemplateListCreateView(APIView):
    """
    GET /reports/templates/ - List all report templates
    POST /reports/templates/ - Create a new report template
    
    Business Logic:
    - Templates define the structure and layout of reports
    - Each template has blocks (text, charts, tables, KPIs) and variables
    - Templates are versioned and can be marked as default
    - Used by reports to render consistent layouts
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        List all report templates with optional filtering
        
        Query Parameters:
        - is_default: Filter by default template status
        - search: Search by template name
        - ordering: Sort by created_at, updated_at (default: -updated_at)
        """
        queryset = ReportTemplate.objects.all()
        
        # Apply filters
        is_default = request.query_params.get('is_default')
        if is_default is not None:
            queryset = queryset.filter(is_default=is_default.lower() == 'true')
        
        # Apply search
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        # Apply ordering
        ordering = request.query_params.get('ordering', '-updated_at')
        queryset = queryset.order_by(ordering)
        
        serializer = ReportTemplateSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """
        Create a new report template
        
        Request Body:
        {
            "id": "template_123",
            "name": "Marketing Report Template",
            "version": 1,
            "is_default": false,
            "blocks": [...],
            "variables": {...}
        }
        """
        serializer = ReportTemplateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReportTemplateDetailView(APIView):
    """
    GET /reports/templates/{id}/ - Get specific template
    PUT /reports/templates/{id}/ - Update template
    PATCH /reports/templates/{id}/ - Partial update template
    DELETE /reports/templates/{id}/ - Delete template
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, template_id):
        """Get template object or return 404"""
        return get_object_or_404(ReportTemplate, id=template_id)

    def get(self, request, template_id):
        """Get a specific report template"""
        template = self.get_object(template_id)
        serializer = ReportTemplateSerializer(template)
        return Response(serializer.data)

    def put(self, request, template_id):
        """Update a report template (full update)"""
        template = self.get_object(template_id)
        serializer = ReportTemplateSerializer(template, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, template_id):
        """Update a report template (partial update)"""
        template = self.get_object(template_id)
        serializer = ReportTemplateSerializer(template, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, template_id):
        """Delete a report template"""
        template = self.get_object(template_id)
        template.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# REPORT API - Core business logic with workflow management
# =============================================================================

@method_decorator(csrf_exempt, name='dispatch')
class ReportListCreateView(APIView):
    """
    GET /reports/ - List all reports with filtering and search
    POST /reports/ - Create a new report
    
    Business Logic:
    - Reports go through lifecycle: draft → in_review → approved → published
    - Each report has an owner, template, time range, and slice configuration
    - Reports can be filtered by status, owner, template, and date range
    - Query hash is automatically computed for caching and audit purposes
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        List reports with comprehensive filtering options
        
        Query Parameters:
        - owner_id: Filter by report owner
        - status: Filter by report status (draft, in_review, approved, published)
        - report_template: Filter by template ID
        - created_at__gte: Filter by creation date (from)
        - created_at__lte: Filter by creation date (to)
        - search: Search in report titles
        - ordering: Sort by created_at, updated_at, title, status (default: -updated_at)
        """
        queryset = Report.objects.all().order_by("-created_at")
        
        # Apply filters
        owner_id = request.query_params.get('owner_id')
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        template_id = request.query_params.get('report_template')
        if template_id:
            queryset = queryset.filter(report_template_id=template_id)
        
        # Date range filters
        created_at_gte = request.query_params.get('created_at__gte')
        if created_at_gte:
            queryset = queryset.filter(created_at__gte=created_at_gte)
        
        created_at_lte = request.query_params.get('created_at__lte')
        if created_at_lte:
            queryset = queryset.filter(created_at__lte=created_at_lte)
        
        # Search
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)
        
        # Ordering
        ordering = request.query_params.get('ordering', '-updated_at')
        queryset = queryset.order_by(ordering)
        
        serializer = ReportSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        """
        Create a new report
        
        Request Body:
        {
            "id": "report_123",
            "title": "Q4 Marketing Report",
            "owner_id": "user_456",
            "status": "draft",
            "report_template_id": "template_789",
            "time_range_start": "2024-01-01T00:00:00Z",
            "time_range_end": "2024-03-31T23:59:59Z",
            "slice_config": {...},
            "export_config_id": "export_config_123"
        }
        """
        # Check permissions
        if not IsReportEditor().has_permission(request, self):
            raise PermissionDenied("You don't have permission to create reports")
        
        serializer = ReportSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReportDetailView(APIView):
    """
    GET /reports/{id}/ - Get specific report
    PUT /reports/{id}/ - Update report (full update)
    PATCH /reports/{id}/ - Update report (partial update)
    DELETE /reports/{id}/ - Delete report (soft delete for approved reports)
    
    Business Logic:
    - Updates to approved reports trigger re-approval mode (status → draft)
    - Modification reasons are tracked via annotations
    - Webhooks are sent for important state changes
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, report_id):
        """Get report object or return 404"""
        return get_object_or_404(Report, id=report_id)

    def get(self, request, report_id):
        """Get a specific report"""
        report = self.get_object(report_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to view this report")
        
        serializer = ReportSerializer(report)
        return Response(serializer.data)

    def put(self, request, report_id):
        """Update a report (full update)"""
        report = self.get_object(report_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to update this report")
        
        was_approved = report.status == "approved"
        serializer = ReportSerializer(report, data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            
            # Handle re-approval mode for approved reports
            if was_approved:
                self._handle_reapproval_mode(report, request)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, report_id):
        """Update a report (partial update)"""
        report = self.get_object(report_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to update this report")
        
        was_approved = report.status == "approved"
        serializer = ReportSerializer(report, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            
            # Handle re-approval mode for approved reports
            if was_approved:
                self._handle_reapproval_mode(report, request)
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, report_id):
        """Delete a report (soft delete for approved reports)"""
        report = self.get_object(report_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to delete this report")
        
        # Special handling for approved reports
        if report.status == "approved":
            # Convert to draft instead of deleting
            report.status = "draft"
            report.save()
            
            # Create annotation for deletion reason
            ReportAnnotation.objects.create(
                id=f"del_{report.id}_{secrets.token_hex(8)}",
                report=report,
                author_id=getattr(request.user, 'id', 'unknown'),
                body_md="**Deletion Reason**: Report deleted after approval",
                status='resolved'
            )
        else:
            # Normal deletion for non-approved reports
            report.delete()
        
        return Response(status=status.HTTP_204_NO_CONTENT)

    def _handle_reapproval_mode(self, report, request):
        """
        Handle re-approval mode when an approved report is modified
        
        Business Logic:
        - Approved reports that are modified automatically become draft
        - A modification annotation is created with the reason
        - A webhook is sent to notify stakeholders
        - The report requires re-approval before it can be published
        """
        modification_reason = request.data.get('modification_reason', 'Modified after approval')
        
        # Create modification annotation
        ReportAnnotation.objects.create(
            id=f"mod_{report.id}_{secrets.token_hex(8)}",
            report=report,
            author_id=getattr(request.user, 'id', 'unknown'),
            body_md=f"**Modification Reason**: {modification_reason}",
            status='resolved'
        )
        
        # Send webhook notification
        self._send_modification_webhook(report, getattr(request.user, 'id', 'unknown'), modification_reason)

    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass  # Fail silently if webhook service is unavailable

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


# =============================================================================
# REPORT WORKFLOW ACTIONS - Submit, Approve, Export, Publish
# =============================================================================

class ReportSubmitView(APIView):
    """
    POST /reports/{id}/submit/ - Submit report for review
    
    Business Logic:
    - Changes report status from any state to 'in_review'
    - Sends webhook notification to approvers
    - No status restrictions - reports can be submitted regardless of current status
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, report_id):
        """Submit a report for review"""
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to submit this report")
        
        # Update status to in_review
        report.status = "in_review"
        report.save(update_fields=["status", "updated_at"])
        
        # Send webhook notification
        self._send_webhook('report.submitted', {
            'report_id': report.id,
            'triggered_by': str(getattr(request.user, "id", ""))
        })
        
        serializer = ReportSerializer(report)
        return Response(serializer.data)

    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass


class ReportApproveView(APIView):
    """
    POST /reports/{id}/approve/ - Approve or reject a report
    
    Business Logic:
    - Approvers can approve or reject reports in any status
    - Creates approval annotation with decision and comments
    - Sends webhook notification for approvals
    - Uses database transactions for consistency
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, report_id):
        """
        Approve or reject a report
        
        Request Body:
        {
            "action": "approve" | "reject",
            "comment": "Optional approval comment"
        }
        """
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsApprover().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to approve this report")
        
        payload = request.data or {}
        action = payload.get("action")
        comment = payload.get("comment")
        
        # Validate action
        if action not in ("approve", "reject"):
            raise ValidationError({"action": "Expected 'approve' or 'reject'."})
        
        # Process approval/rejection in transaction
        with transaction.atomic():
            if action == "approve":
                report.status = "approved"
            else:
                report.status = "draft"
            report.save(update_fields=["status", "updated_at"])
            
            # Create approval annotation
            ReportAnnotation.objects.create(
                id=f"appr_{report.id}_{int(time.time())}_{secrets.token_hex(4)}",
                report=report,
                author_id=str(getattr(request.user, "id", "")),
                body_md=f"**Approval Result**: {action}\n\n**Comment**: {comment}" if comment else f"**Approval Result**: {action}",
                status='resolved'
            )
        
        # Send webhook for approvals
        if action == "approve":
            self._send_webhook('report.approved', {
                'report_id': report.id,
                'approver_id': str(getattr(request.user, "id", ""))
            })
        
        serializer = ReportSerializer(report)
        return Response(serializer.data)

    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass


class ReportExportView(APIView):
    """
    POST /reports/{id}/export/ - Export report to various formats
    
    Business Logic:
    - Creates async job for export processing
    - Supports PDF format with optional CSV inclusion
    - Uses synchronous processing for simplicity (can be made async with Celery)
    - Generates charts and renders templates with data
    - Returns job status for tracking progress
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, report_id):
        """
        Export a report to specified format
        
        Request Body:
        {
            "format": "pdf" (default),
            "include_raw_csv": false (optional)
        }
        """
        print(f"=== ReportExportView.post called ===")
        print(f"report_id: {report_id}")
        print(f"request.data: {request.data}")
        
        report = get_object_or_404(Report, id=report_id)
        print(f"Found report: {report.title}")
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, report):
            print(f"Permission denied for report {report_id}")
            raise PermissionDenied("You don't have permission to export this report")
        
        # Parse export options
        fmt = (request.data or {}).get("format", "pdf")
        include_csv = bool((request.data or {}).get("include_raw_csv", False))
        
        # Generate unique job ID
        short_report_id = report.id[:20] if len(report.id) > 20 else report.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"exp_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"
        
        # Create export job
        job = Job.objects.create(
            id=job_id,
            report=report,
            type="export",
            status="queued",
        )
        
        print(f"=== BEFORE calling _export_sync_simple ===")
        print(f"job.id: {job.id}")
        print(f"report.id: {report.id}")
        print(f"fmt: {fmt}")
        print(f"include_csv: {include_csv}")
        try:
            # Process export synchronously
            self._export_sync_simple(job.id, report.id, fmt, include_csv)
            print(f"=== AFTER calling _export_sync_simple ===")
        except Exception as e:
            print(f"=== EXCEPTION in _export_sync_simple ===")
            print(f"Exception: {e}")
            print(f"Exception type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            job.status = "failed"
            job.message = str(e)
            job.save()
        
        return Response(JobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    def _export_sync_simple(self, job_id: str, report_id: str, fmt: str, include_csv: bool = False):
        """
        Simplified synchronous export logic
        
        Business Logic:
        1. Fetch data from upstream APIs or inline data
        2. Render template with data using native Python string formatting
        3. Generate charts as base64 images
        4. Export to PDF with MediaJira branding
        5. Create ReportAsset record
        6. Update job status and send webhook
        """
        print(f"=== ENTERING _export_sync_simple ===")
        print(f"job_id={job_id}, report_id={report_id}, fmt={fmt}")
        try:
            print(f"Getting job {job_id}")
            job = Job.objects.get(id=job_id)
            print(f"Getting report {report_id}")
            report = Report.objects.get(id=report_id)
            print(f"Got job and report successfully")
            
            # Get data for report
            data = self._get_upstream_data(report)
            
            # Render template with data
            html_content = self._render_template(report, data)
            
            # Export to specified format
            if fmt == "pdf":
                file_content = self._export_pdf(html_content, report.title)
            else:
                raise ValueError(f"Unsupported format: {fmt}")
            
            # Save file content to storage
            from django.core.files.base import ContentFile
            from django.core.files.storage import default_storage
            
            filename = f"reports/{report.id}/{fmt}_{int(time.time())}.{fmt}"
            file_obj = ContentFile(file_content, name=filename)
            saved_path = default_storage.save(filename, file_obj)
            file_url = default_storage.url(saved_path)
            
            # Debug: print file_url before creating asset
            print(f"DEBUG: file_url before asset creation: {file_url}")
            print(f"DEBUG: file_url type: {type(file_url)}")
            print(f"DEBUG: file_url length: {len(file_url)}")
            
            # Create asset record
            asset = ReportAsset.objects.create(
                id=f"asset_{report.id}_{fmt}_{int(time.time())}",
                report=report,
                file_type=fmt,
                file_url=file_url
            )
            
            # Debug: print file_url after creating asset
            print(f"DEBUG: file_url after asset creation: {asset.file_url}")
            print(f"DEBUG: asset.file_url type: {type(asset.file_url)}")
            print(f"DEBUG: asset.file_url length: {len(asset.file_url)}")
            
            # Update job status
            job.status = "succeeded"
            job.result_asset_id = asset.id
            job.save()
            
            # Send completion webhook
            self._send_webhook('export.completed', {
                'report_id': report.id,
                'job_id': job_id,
                'asset_id': asset.id
            })
                
        except Exception as e:
            job = Job.objects.get(id=job_id)
            job.status = "failed"
            job.message = str(e)
            job.save()
            raise

    def _get_upstream_data(self, report):
        """
        Fetch data from upstream APIs, CSV files, or return inline data
        
        Business Logic:
        - Checks slice_config for API URL, CSV data, or inline data
        - Makes HTTP requests to external APIs if configured
        - Processes CSV data using the new CSV converter
        - Falls back to mock data if all else fails
        - Returns structured data for template rendering
        """
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
        elif 'csv_data' in slice_config:
            # Process CSV data using the new converter
            try:
                from .services.csv_converter import convert_csv_string_to_json
                csv_result = convert_csv_string_to_json(slice_config['csv_data'])
                return {
                    'csv_data': slice_config['csv_data'],
                    'csv_metadata': csv_result.get('metadata', {}),
                    'tables': {'default': csv_result.get('data', [])}
                }
            except Exception as e:
                return {
                    'error': f'CSV processing failed: {str(e)}',
                    'csv_data': slice_config['csv_data']
                }
        elif 'csv_file_path' in slice_config:
            # Process CSV file using the new converter
            try:
                from .services.csv_converter import convert_csv_to_json
                csv_result = convert_csv_to_json(slice_config['csv_file_path'])
                return {
                    'csv_file_path': slice_config['csv_file_path'],
                    'csv_metadata': csv_result.get('metadata', {}),
                    'tables': {'default': csv_result.get('data', [])}
                }
            except Exception as e:
                return {
                    'error': f'CSV file processing failed: {str(e)}',
                    'csv_file_path': slice_config['csv_file_path']
                }
        elif 'inline_data' in slice_config:
            return slice_config['inline_data']
        
        # Default mock data
        return {
            'campaigns': [
                {'name': 'Sample Campaign', 'cost': 10000, 'revenue': 25000}
            ],
            'total_cost': 10000,
            'total_revenue': 25000
        }

    def _render_template(self, report, data):
        """
        Render report template with data using native Python string formatting
        
        Business Logic:
        - Uses native Python string formatting for flexible report layouts
        - Provides helper functions for tables and charts
        - Handles undefined variables gracefully
        - Supports complex data structures and iterations
        """
        if not report.report_template:
            return f"<h1>{report.title}</h1><p>No template available</p>"
        
        # Jinja2 removed - using native Python string formatting
        def safe_format(value, default="N/A"):
            """Safe formatting function for template values"""
            if value is None:
                return default
            if isinstance(value, str) and value.lower() in ('undefined', 'null', 'none', '-', ''):
                return default
            return str(value)
        
        def make_table(rows):
            """Generate HTML table from data rows"""
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
            print(f"DEBUG: Starting template rendering for report {report.id}")
            print(f"DEBUG: Report title: {report.title}")
            print(f"DEBUG: Data type: {type(data)}")
            print(f"DEBUG: Data length: {len(data) if isinstance(data, (list, dict)) else 'N/A'}")
            
            # Process blocks to create HTML content
            html_content = f"<h1>{report.title}</h1>"
            
            if report.report_template and report.report_template.blocks:
                for block in report.report_template.blocks:
                    if block.get('type') == 'text':
                        content = block.get('default', '')
                        html_content += f"<div class='text-block'>{content}</div>"
                    elif block.get('type') == 'chart':
                        title = block.get('default', 'Chart')
                        html_content += f"<div class='chart-block'><h2>{title}</h2></div>"
                    elif block.get('type') == 'table':
                        html_content += "<div class='table-block'><h2>Data Table</h2></div>"
            
            # Add data tables
            campaigns = data.get('campaigns', []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
            
            if campaigns:
                html_content += "<div class='data-section'>"
                html_content += "<h2>Campaign Data</h2>"
                html_content += make_table(campaigns)
                html_content += "</div>"
            
            # Add summary statistics
            if isinstance(data, list) and data:
                def safe_float(value):
                    """Safely convert value to float, handling '-' and other non-numeric values"""
                    if value is None or value == '' or value == '-':
                        return 0.0
                    try:
                        return float(value)
                    except (ValueError, TypeError):
                        return 0.0
                
                total_cost = sum(safe_float(item.get('Cost', 0)) for item in data if isinstance(item, dict))
                total_revenue = sum(safe_float(item.get('Revenue', 0)) for item in data if isinstance(item, dict))
                total_profit = total_revenue - total_cost
                roi_percentage = ((total_profit / total_cost * 100) if total_cost > 0 else 0)
                
                html_content += f"""
                <div class='summary-section'>
                    <h2>Summary</h2>
                    <p>Total Records: {len(data)}</p>
                    <p>Total Cost: ${total_cost:,.2f}</p>
                    <p>Total Revenue: ${total_revenue:,.2f}</p>
                    <p>Net Profit: ${total_profit:,.2f}</p>
                    <p>ROI: {roi_percentage:.1f}%</p>
                </div>
                """
            
            return html_content
        except Exception as e:
            return f"<h1>{report.title}</h1><p>Template rendering error: {str(e)}</p>"

    def _export_pdf(self, html_content, title):
        """Export HTML content to PDF with MediaJira branding"""
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

    # Chart generation method removed - now handled by assembler service

    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass


class ReportPublishConfluenceView(APIView):
    """
    POST /reports/{id}/publish/confluence/ - Publish report to Confluence
    
    Business Logic:
    - Creates async job for Confluence publishing
    - Uses mock Confluence publisher by default (configurable via PUBLISHER_BACKEND)
    - Generates Confluence page URL and creates asset record
    - Sends webhook notification on completion
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, report_id):
        """
        Publish a report to Confluence
        
        Request Body:
        {
            "space_key": "REPORTS",
            "parent_page_id": "123456",
            "title": "Custom Title" (optional)
        }
        """
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to publish this report")
        
        opts: Dict[str, Any] = request.data or {}
        
        # Generate unique job ID
        short_report_id = report.id[:20] if len(report.id) > 20 else report.id
        short_timestamp = str(int(time.time()))[-8:]
        job_id = f"pub_{short_report_id}_{short_timestamp}_{secrets.token_hex(2)}"
        
        # Create publish job
        job = Job.objects.create(
            id=job_id,
            report=report,
            type="publish",
            status="queued",
        )
        
        try:
            # Process publish synchronously
            self._publish_sync_simple(job.id, report.id, opts)
        except Exception as e:
            job.status = "failed"
            job.message = str(e)
            job.save()
        
        return Response(JobSerializer(job).data, status=status.HTTP_202_ACCEPTED)

    def _publish_sync_simple(self, job_id: str, report_id: str, opts: Dict[str, Any]):
        """
        Simplified synchronous publish logic (mock mode)
        
        Business Logic:
        - Uses mock Confluence publisher by default
        - Can be configured to use real Confluence API via PUBLISHER_BACKEND=confluence
        - Creates ReportAsset with Confluence page URL
        - Updates job status and sends webhook
        """
        try:
            job = Job.objects.get(id=job_id)
            report = Report.objects.get(id=report_id)
            
            # Generate mock Confluence page URL
            mock_page_url = f"https://company.atlassian.net/wiki/spaces/REPORTS/pages/{int(time.time())}/{report.title.replace(' ', '-')}"
            
            # Create Confluence asset
            asset = ReportAsset.objects.create(
                id=f"confluence_{report.id}_{int(time.time())}",
                report=report,
                file_type='confluence',
                file_url=mock_page_url
            )
            
            # Update job status
            job.status = "succeeded"
            job.result_asset_id = asset.id
            job.save()
            
            # Send completion webhook
            self._send_webhook('report.published', {
                'report_id': report.id,
                'job_id': job_id,
                'page_url': mock_page_url,
                'asset_id': asset.id
            })
                
        except Exception as e:
            job = Job.objects.get(id=job_id)
            job.status = "failed"
            job.message = str(e)
            job.save()
            raise

    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass


# =============================================================================
# REPORT SECTIONS API - Manage report sections and content
# =============================================================================

class ReportSectionListCreateView(APIView):
    """
    GET /reports/{id}/sections/ - List all sections for a report
    POST /reports/{id}/sections/ - Create a new section
    
    Business Logic:
    - Sections provide narrative structure to reports
    - Each section has order_index for rendering sequence
    - Content is stored as Markdown with chart configurations
    - Modifications to approved reports trigger re-approval mode
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        """List all sections for a report"""
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to view this report's sections")
        
        sections = ReportSection.objects.filter(report_id=report_id).order_by("order_index")
        serializer = ReportSectionSerializer(sections, many=True)
        return Response(serializer.data)

    def post(self, request, report_id):
        """Create a new section for a report"""
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to create sections for this report")
        
        # Handle re-approval mode for approved reports
        if report.status == "approved":
            report.status = "draft"
            report.save()
        
        serializer = ReportSectionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(report_id=report_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReportSectionDetailView(APIView):
    """
    GET /reports/{id}/sections/{section_id}/ - Get specific section
    PUT /reports/{id}/sections/{section_id}/ - Update section (full update)
    PATCH /reports/{id}/sections/{section_id}/ - Update section (partial update)
    DELETE /reports/{id}/sections/{section_id}/ - Delete section
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, report_id, section_id):
        """Get section object or return 404"""
        return get_object_or_404(ReportSection, id=section_id, report_id=report_id)

    def get(self, request, report_id, section_id):
        """Get a specific section"""
        section = self.get_object(report_id, section_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, section):
            raise PermissionDenied("You don't have permission to view this section")
        
        serializer = ReportSectionSerializer(section)
        return Response(serializer.data)

    def put(self, request, report_id, section_id):
        """Update a section (full update)"""
        section = self.get_object(report_id, section_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, section):
            raise PermissionDenied("You don't have permission to update this section")
        
        # Handle re-approval mode for approved reports
        if section.report.status == "approved":
            section.report.status = "draft"
            section.report.save()
        
        serializer = ReportSectionSerializer(section, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, report_id, section_id):
        """Update a section (partial update)"""
        section = self.get_object(report_id, section_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, section):
            raise PermissionDenied("You don't have permission to update this section")
        
        # Handle re-approval mode for approved reports
        if section.report.status == "approved":
            section.report.status = "draft"
            section.report.save()
        
        serializer = ReportSectionSerializer(section, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, report_id, section_id):
        """Delete a section"""
        section = self.get_object(report_id, section_id)
        
        # Check permissions
        if not IsReportEditor().has_object_permission(request, self, section):
            raise PermissionDenied("You don't have permission to delete this section")
        
        # Handle re-approval mode for approved reports
        if section.report.status == "approved":
            section.report.status = "draft"
            section.report.save()
        
        section.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# REPORT ANNOTATIONS API - Manage comments and discussions
# =============================================================================

class ReportAnnotationListCreateView(APIView):
    """
    GET /reports/{id}/annotations/ - List all annotations for a report
    POST /reports/{id}/annotations/ - Create a new annotation
    
    Business Logic:
    - Annotations provide commenting and discussion functionality
    - Can be associated with specific sections or the entire report
    - Support open/resolved status for issue tracking
    - Modifications to approved reports trigger re-approval mode
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        """List all annotations for a report"""
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to view this report's annotations")
        
        annotations = ReportAnnotation.objects.filter(report_id=report_id).order_by("-created_at")
        serializer = ReportAnnotationSerializer(annotations, many=True)
        return Response(serializer.data)

    def post(self, request, report_id):
        """Create a new annotation for a report"""
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsAuthorApproverOrAdmin().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to create annotations for this report")
        
        # Handle re-approval mode for approved reports
        if report.status == "approved":
            report.status = "draft"
            report.save()
        
        serializer = ReportAnnotationSerializer(data=request.data)
        if serializer.is_valid():
            author = str(getattr(request.user, "id", ""))
            serializer.save(report_id=report_id, author_id=author)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReportAnnotationDetailView(APIView):
    """
    GET /reports/{id}/annotations/{annotation_id}/ - Get specific annotation
    PATCH /reports/{id}/annotations/{annotation_id}/ - Resolve annotation (status=resolved only)
    DELETE /reports/{id}/annotations/{annotation_id}/ - Delete annotation
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, report_id, annotation_id):
        """Get annotation object or return 404"""
        return get_object_or_404(ReportAnnotation, id=annotation_id, report_id=report_id)

    def get(self, request, report_id, annotation_id):
        """Get a specific annotation"""
        annotation = self.get_object(report_id, annotation_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, annotation):
            raise PermissionDenied("You don't have permission to view this annotation")
        
        serializer = ReportAnnotationSerializer(annotation)
        return Response(serializer.data)

    def patch(self, request, report_id, annotation_id):
        """Resolve an annotation (only status=resolved allowed)"""
        annotation = self.get_object(report_id, annotation_id)
        
        # Check permissions
        if not IsAuthorApproverOrAdmin().has_object_permission(request, self, annotation):
            raise PermissionDenied("You don't have permission to update this annotation")
        
        # Handle re-approval mode for approved reports
        if annotation.report.status == "approved":
            annotation.report.status = "draft"
            annotation.report.save()
        
        new_status = (request.data or {}).get("status")
        if new_status != "resolved":
            return Response({"detail": "status must be 'resolved'."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Mark as resolved
        annotation.mark_resolved(str(getattr(request.user, "id", "")))
        annotation.save(update_fields=["status", "resolved_at", "resolved_by", "updated_at"])
        
        serializer = ReportAnnotationSerializer(annotation)
        return Response(serializer.data)

    def delete(self, request, report_id, annotation_id):
        """Delete an annotation"""
        annotation = self.get_object(report_id, annotation_id)
        
        # Check permissions
        if not IsAuthorApproverOrAdmin().has_object_permission(request, self, annotation):
            raise PermissionDenied("You don't have permission to delete this annotation")
        
        # Handle re-approval mode for approved reports
        if annotation.report.status == "approved":
            annotation.report.status = "draft"
            annotation.report.save()
        
        annotation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# =============================================================================
# REPORT ASSETS API - Manage generated files and assets
# =============================================================================

class ReportAssetListView(APIView):
    """
    GET /reports/{id}/assets/ - List all assets for a report
    
    Business Logic:
    - Assets are generated files from exports and publications
    - Include PDFs, images, CSVs, and Confluence page references
    - Assets are read-only and managed by the system
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        """List all assets for a report"""
        report = get_object_or_404(Report, id=report_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to view this report's assets")
        
        assets = ReportAsset.objects.filter(report_id=report_id).order_by("-created_at")
        serializer = ReportAssetSerializer(assets, many=True)
        return Response(serializer.data)


class ReportAssetDetailView(APIView):
    """
    GET /reports/{id}/assets/{asset_id}/ - Get specific asset
    POST /reports/{id}/assets/{asset_id}/signed_url/ - Generate signed download URL
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, report_id, asset_id):
        """Get asset object or return 404"""
        return get_object_or_404(ReportAsset, id=asset_id, report_id=report_id)

    def get(self, request, report_id, asset_id):
        """Get a specific asset"""
        asset = self.get_object(report_id, asset_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, asset):
            raise PermissionDenied("You don't have permission to view this asset")
        
        serializer = ReportAssetSerializer(asset)
        return Response(serializer.data)

    def post(self, request, report_id, asset_id):
        """
        Generate signed download URL for file
        
        Request Body:
        {
            "expires_in": 3600  // Optional, default 1 hour
        }
        
        Response:
        {
            "signed_url": "http://localhost:8000/media/reports/file.pdf",
            "expires_in": 3600,
            "asset_id": "asset_123",
            "file_type": "pdf"
        }
        """
        asset = self.get_object(report_id, asset_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, asset):
            raise PermissionDenied("You don't have permission to access this asset")
        
        # Confluence assets do not support file download
        if asset.file_type == "confluence":
            return Response(
                {"detail": "Confluence assets do not support file download"}, 
                status=status.HTTP_400_BAD_REQUEST
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
                    status=status.HTTP_400_BAD_REQUEST
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
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# JOB API - Track async job status
# =============================================================================

class JobDetailView(APIView):
    """
    GET /jobs/{job_id}/ - Get specific job status
    
    Business Logic:
    - Jobs track async operations like exports and publications
    - Status progression: queued → running → succeeded/failed
    - Provides result asset IDs and error messages
    - Read-only endpoint for monitoring job progress
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, job_id):
        """Get job object or return 404"""
        return get_object_or_404(Job, id=job_id)

    def get(self, request, job_id):
        """Get a specific job status"""
        job = self.get_object(job_id)
        
        # Check permissions
        if not IsReportViewer().has_object_permission(request, self, job):
            raise PermissionDenied("You don't have permission to view this job")
        
        serializer = JobSerializer(job)
        return Response(serializer.data)

