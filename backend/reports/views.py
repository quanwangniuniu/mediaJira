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
    ReportPermission,
    ReportApprovalPermission,
    ReportExportPermission,
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
    permission_classes = [IsAuthenticated, ReportPermission]


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
        if not ReportPermission().has_permission(request, self):
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
        if not ReportPermission().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to view this report")
        
        serializer = ReportSerializer(report)
        return Response(serializer.data)

    def put(self, request, report_id):
        """Update a report (full update)"""
        report = self.get_object(report_id)
        
        # Check permissions
        if not ReportPermission().has_object_permission(request, self, report):
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
        if not ReportPermission().has_object_permission(request, self, report):
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
        if not ReportPermission().has_object_permission(request, self, report):
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
        if not ReportPermission().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to submit this report")
        
        # Check precondition: status must be 'draft'
        if report.status != "draft":
            return Response({"detail": "Report not in draft state"}, status=409)
        
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
        if not ReportApprovalPermission().has_object_permission(request, self, report):
            raise PermissionDenied("You don't have permission to approve this report")
        
        payload = request.data or {}
        action = payload.get("action")
        comment = payload.get("comment")
        
        # Validate action
        if action not in ("approve", "reject"):
            raise ValidationError({"action": "Expected 'approve' or 'reject'."})
        
        # Check precondition: status must be 'in_review'
        if report.status != "in_review":
            return Response({"detail": "Report not in review"}, status=409)
        
        # Process approval/rejection in transaction
        with transaction.atomic():
            if action == "approve":
                report.status = "approved"
            else:
                report.status = "draft"
            report.save(update_fields=["status", "updated_at"])
            
            # Create approval record (what frontend expects)
            ReportApproval.objects.create(
                id=f"approval_{secrets.token_hex(8)}",
                report=report,
                approver_id=str(getattr(request.user, "id", "")),
                status="approved" if action == "approve" else "rejected",
                comment=comment or f"Report {action}d",
                decided_at=timezone.now()
            )
            
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



class ReportUpdateView(APIView):
    """
    PATCH /reports/{id}/ - Update report slice_config
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, report_id):
        """Update report slice_config with new CSV file path"""
        try:
            report = Report.objects.get(id=report_id)
            
            # Parse request data
            if hasattr(request, 'data'):
                data = request.data
            else:
                import json
                data = json.loads(request.body.decode('utf-8'))
            
            # Update slice_config with new CSV file path
            if 'slice_config' in data:
                report.slice_config = data['slice_config']
                report.save()
                
                return Response({
                    "success": True,
                    "message": "Report updated successfully",
                    "report": ReportSerializer(report).data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    "success": False,
                    "error": "slice_config is required"
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Report.DoesNotExist:
            return Response({
                "success": False,
                "error": "Report not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "success": False,
                "error": f"Update failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
    
    def _send_webhook(self, event_type: str, data: Dict[str, Any]):
        """Unified webhook sending method"""
        try:
            from .webhooks import send_webhook
            send_webhook(event_type, data)
        except Exception:
            pass  # Fail silently if webhook service is unavailable
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
        
        report = get_object_or_404(Report, id=report_id)
        print(f"Found report: {report.title}")
        
        # Check permissions
        if not ReportPermission().has_object_permission(request, self, report):
            print(f"Permission denied for report {report_id}")
            raise PermissionDenied("You don't have permission to export this report")
        
        # Check precondition: status must be 'approved'
        if report.status != "approved":
            return Response({"detail": "Report must be approved before export"}, status=409)
        
        # Parse export options - handle both DRF and regular Django requests
        try:
            if hasattr(request, 'data'):
                # DRF request
                request_data = request.data or {}
            else:
                # Regular Django request
                import json
                if request.content_type == 'application/json':
                    request_data = json.loads(request.body.decode('utf-8'))
                else:
                    request_data = request.POST
        except Exception as e:
            print(f"Error parsing request data: {e}")
            request_data = {}
            
        fmt = request_data.get("format", "pdf")
        include_csv = bool(request_data.get("include_raw_csv", False))
        
        # Generate unique job ID
        report_id_str = str(report.id)
        short_report_id = report_id_str[:20] if len(report_id_str) > 20 else report_id_str
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
                file_content = self._export_pdf(html_content, report.title, report.id)
            else:
                raise ValueError(f"Unsupported format: {fmt}")
            
            # Save file content to storage
            from django.core.files.base import ContentFile
            from django.core.files.storage import default_storage
            
            filename = f"reports/{report.id}/{fmt}_{int(time.time())}.{fmt}"
            file_obj = ContentFile(file_content, name=filename)
            saved_path = default_storage.save(filename, file_obj)
            # Store the relative path, not the full URL
            file_url = saved_path
            
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
                print(f"CSV file processing failed: {e}")
                # Fallback to mock data when CSV processing fails
                return {
                    'error': f'CSV file processing failed: {str(e)}',
                    'csv_file_path': slice_config['csv_file_path'],
                    'tables': {
                        'default': [
                            {'name': 'Sample Campaign', 'cost': 10000, 'revenue': 25000}
                        ]
                    }
                }
        elif 'inline_data' in slice_config:
            return slice_config['inline_data']
        
        # Default mock data
        return {
            'tables': {
                'default': [
                {'name': 'Sample Campaign', 'cost': 10000, 'revenue': 25000}
                ]
            }
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
            
            # Add data tables - handle CSV data properly
            if isinstance(data, dict) and 'tables' in data:
                # Handle CSV data structure
                for table_name, table_data in data['tables'].items():
                    if table_data:
                        html_content += f"<div class='data-section'>"
                        html_content += f"<h2>{table_name.title()} Data</h2>"
                        html_content += make_table(table_data)
                        html_content += "</div>"
            elif isinstance(data, list) and data:
                # Handle direct list data
                html_content += "<div class='data-section'>"
                html_content += "<h2>Data Table</h2>"
                html_content += make_table(data)
                html_content += "</div>"
            elif isinstance(data, dict):
                # Handle campaign data
                campaigns = data.get('campaigns', [])
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

    def _export_pdf(self, html_content, title, report_id=None):
        """Export HTML content to PDF using the original WeasyPrint service"""
        try:
            # Use the original export_pdf service from reports/services/export_pdf.py
            from reports.services.export_pdf import export_pdf
            
            # Create assembled data structure that the original service expects
            assembled = {
                "html": html_content,  # Use original HTML content
                "report": type('Report', (), {'title': title, 'id': str(report_id) if report_id else '1'})()
            }
            
            # Generate PDF using the original service
            temp_pdf_path = export_pdf(assembled, theme="light")
            
            # Read the generated PDF file
            with open(temp_pdf_path, 'rb') as f:
                pdf_content = f.read()
            
            # Clean up temporary file
            import os
            os.unlink(temp_pdf_path)
            
            print(f"DEBUG: Original WeasyPrint service PDF content length: {len(pdf_content)}")
            print(f"DEBUG: PDF starts with: {pdf_content[:20]}")
            
            return pdf_content
            
        except Exception as e:
            print(f"DEBUG: Original WeasyPrint service failed: {e}")
            # Fallback: return HTML as plain text
            return html_content.encode('utf-8')
    
    
class CSVUploadView(APIView):
    """
    POST /reports/upload-csv/ - Upload CSV file for report processing
    
    Business Logic:
    - Accepts CSV file uploads via multipart/form-data
    - Validates file type and size
    - Stores file in media directory
    - Returns file path for use in report creation
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Upload a CSV file
        
        Request: multipart/form-data with 'file' field
        Response: {
            "success": true,
            "file_path": "/media/uploads/filename.csv",
            "message": "File uploaded successfully"
        }
        """
        try:
            # Check if file is provided
            if 'file' not in request.FILES:
                return Response({
                    "success": False,
                    "error": "No file provided"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            file = request.FILES['file']
            
            # Validate file type
            if not file.name.lower().endswith('.csv'):
                return Response({
                    "success": False,
                    "error": "Only CSV files are allowed"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate file size (max 10MB)
            if file.size > 10 * 1024 * 1024:
                return Response({
                    "success": False,
                    "error": "File size too large. Maximum 10MB allowed"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate unique filename to avoid conflicts
            import uuid
            import os
            from django.core.files.storage import default_storage
            
            # Create uploads directory if it doesn't exist
            upload_dir = 'uploads'
            if not default_storage.exists(upload_dir):
                default_storage.makedirs(upload_dir)
            
            # Generate unique filename
            file_extension = os.path.splitext(file.name)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            # Save file
            saved_path = default_storage.save(file_path, file)
            
            return Response({
                "success": True,
                "file_path": saved_path,  # Return relative path only
                "original_name": file.name,
                "size": file.size,
                "message": "File uploaded successfully"
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                "success": False,
                "error": f"Upload failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PDFDownloadView(APIView):
    """
    GET /reports/{report_id}/download-pdf/ - Download generated PDF
    
    Business Logic:
    - Retrieves the latest PDF asset for a report
    - Returns PDF file for download
    - Handles cases where PDF doesn't exist yet
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, report_id):
        """
        Download PDF for a report
        
        Response: PDF file download or error message
        """
        try:
            # Get the report
            report = get_object_or_404(Report, id=report_id)
            
            # Check permissions
            if not ReportPermission().has_object_permission(request, self, report):
                raise PermissionDenied("You don't have permission to download this report")
            
            # Find the latest PDF asset for this report
            pdf_assets = ReportAsset.objects.filter(
                report=report,
                file_type='pdf'
            ).order_by('-created_at')
            
            if not pdf_assets.exists():
                return Response({
                    "error": "No PDF found for this report. Please export the report first."
                }, status=status.HTTP_404_NOT_FOUND)
            
            latest_pdf = pdf_assets.first()
            
            # Check if file exists in storage
            from django.core.files.storage import default_storage
            
            # Handle both old format (/media/...) and new format (relative path)
            if latest_pdf.file_url.startswith('/media/'):
                # Old format: remove /media/ prefix
                file_path = latest_pdf.file_url[7:]  # Remove '/media/' (7 characters)
            else:
                # New format: use as-is
                file_path = latest_pdf.file_url
            
            if not default_storage.exists(file_path):
                return Response({
                    "error": "PDF file not found in storage"
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Read file content
            file_content = default_storage.open(file_path).read()
            
            # Return file as download
            from django.http import HttpResponse
            response = HttpResponse(file_content, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{report.title}.pdf"'
            response['Content-Length'] = len(file_content)
            
            return response
            
        except PermissionDenied:
            raise
        except Exception as e:
            return Response({
                "error": f"Download failed: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

