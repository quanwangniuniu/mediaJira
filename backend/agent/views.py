import json
import logging

from django.db.models import Count
from django.http import StreamingHttpResponse
from django.utils.translation import activate as activate_language
from rest_framework import viewsets, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView


class EventStreamRenderer(BaseRenderer):
    """Renderer that accepts text/event-stream for SSE endpoints."""
    media_type = 'text/event-stream'
    format = 'event-stream'
    charset = 'utf-8'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # Error responses (DRF Response) fall through here; serialize as JSON.
        if data is None:
            return b''
        return json.dumps(data).encode('utf-8')

from django.db.models import Max
from core.models import Project, ProjectMember
from decision.models import Decision, Signal, Option
from spreadsheet.models import Spreadsheet
from .models import AgentSession, AgentMessage
from .serializers import (
    AgentSessionListSerializer,
    AgentSessionDetailSerializer,
    ChatInputSerializer,
)
from .services import AgentOrchestrator, _extract_spreadsheet_data, _run_analysis
from . import data_service

logger = logging.getLogger(__name__)


class EnglishResponseMixin:
    """Force English for DRF validation messages in all agent views."""
    def initial(self, request, *args, **kwargs):
        activate_language('en')
        super().initial(request, *args, **kwargs)


def _get_user_project(request):
    """Get the active project for the current user, with membership check."""
    project_id = request.headers.get('X-Project-Id') or request.query_params.get('project_id')
    if project_id:
        try:
            project = Project.objects.get(id=project_id, is_deleted=False)
            if not ProjectMember.objects.filter(project=project, user=request.user).exists():
                return None
            return project
        except Project.DoesNotExist:
            return None
    return getattr(request.user, 'active_project', None)


class AgentSessionViewSet(EnglishResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    pagination_class = None
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'list':
            return AgentSessionListSerializer
        return AgentSessionDetailSerializer

    def get_queryset(self):
        project = _get_user_project(self.request)
        qs = AgentSession.objects.filter(
            user=self.request.user,
            is_deleted=False,
        )
        if project:
            qs = qs.filter(project=project)
        qs = qs.order_by('-created_at')
        if self.action == 'list':
            return qs[:50]
        return qs

    def perform_create(self, serializer):
        project = _get_user_project(self.request)
        if not project:
            project_id = self.request.data.get('project_id')
            if project_id:
                project = Project.objects.get(id=project_id, is_deleted=False)
        serializer.save(user=self.request.user, project=project)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save()


class ChatView(EnglishResponseMixin, APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [EventStreamRenderer, JSONRenderer]

    def post(self, request, session_id):
        serializer = ChatInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session = AgentSession.objects.get(
                id=session_id,
                user=request.user,
                is_deleted=False,
            )
        except AgentSession.DoesNotExist:
            return Response(
                {"detail": "Session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        message_text = serializer.validated_data['message']
        spreadsheet_id = serializer.validated_data.get('spreadsheet_id')
        csv_filename = serializer.validated_data.get('csv_filename')
        file_id = serializer.validated_data.get('file_id')
        action = serializer.validated_data.get('action')

        # Auto-generate title from first message
        if not session.title and message_text:
            session.title = message_text[:100]
            session.save(update_fields=['title'])

        # Save user message
        AgentMessage.objects.create(
            session=session,
            role='user',
            content=message_text,
            metadata={
                'spreadsheet_id': spreadsheet_id,
                'action': action,
            },
        )

        project = session.project
        orchestrator = AgentOrchestrator(
            user=request.user,
            project=project,
            session=session,
        )

        def event_stream():
            assistant_content_parts = []
            assistant_metadata = {}
            last_message_type = 'text'

            for chunk in orchestrator.handle_message(
                message_text,
                spreadsheet_id=spreadsheet_id,
                csv_filename=csv_filename,
                action=action,
                file_id=file_id,
            ):
                chunk_type = chunk.get('type', 'text')
                content = chunk.get('content', '')
                data = chunk.get('data')

                if chunk_type != 'done':
                    assistant_content_parts.append(content)
                    last_message_type = chunk_type
                    if data:
                        assistant_metadata.update(data)

                sse_data = json.dumps(chunk, default=str)
                yield f"data: {sse_data}\n\n"

                # Save assistant message when done
                if chunk_type == 'done' and assistant_content_parts:
                    AgentMessage.objects.create(
                        session=session,
                        role='assistant',
                        content='\n'.join(assistant_content_parts),
                        message_type=last_message_type,
                        metadata=assistant_metadata,
                    )

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


class SpreadsheetListView(EnglishResponseMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        spreadsheets = Spreadsheet.objects.filter(
            project=project,
            is_deleted=False,
        ).values('id', 'name', 'created_at').order_by('-created_at')
        result = [
            {**s, 'project_id': project.id, 'updated_at': s['created_at']}
            for s in spreadsheets
        ]
        return Response(result)



class DataReportListView(EnglishResponseMixin, APIView):
    """GET /api/agent/data/reports/ — list imported CSV files."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reports = data_service.list_reports(project)
        return Response(reports)


class DataReportDetailView(EnglishResponseMixin, APIView):
    """GET/DELETE /api/agent/data/reports/<uuid:file_id>/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = data_service.get_report_data(file_id, project)
        if data is None:
            return Response(
                {"detail": "Report not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data)

    def delete(self, request, file_id):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted = data_service.delete_report(file_id, project)
        if not deleted:
            return Response(
                {"detail": "File not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class DataUploadView(EnglishResponseMixin, APIView):
    """POST /api/agent/data/upload/ — upload a CSV file."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = request.FILES.get('file')
        if not file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_exts = ('.csv', '.xlsx', '.xls')
        if not file.name.lower().endswith(allowed_exts):
            return Response(
                {"detail": "Only CSV and Excel files are accepted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 10 * 1024 * 1024  # 10MB
        if file.size > max_size:
            return Response(
                {"detail": "File too large (max 10MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = data_service.save_uploaded_file(file, request.user, project)
        if result is None:
            return Response(
                {"detail": "Failed to save file."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(result, status=status.HTTP_201_CREATED)


class FileUploadAnalyzeView(EnglishResponseMixin, APIView):
    """POST /api/agent/upload-analyze/ — upload a file and stream analysis."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    renderer_classes = [EventStreamRenderer, JSONRenderer]

    def post(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file = request.FILES.get('file')
        if not file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_exts = ('.csv', '.xlsx', '.xls')
        if not file.name.lower().endswith(allowed_exts):
            return Response(
                {"detail": "Only CSV and Excel files are accepted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_size = 10 * 1024 * 1024  # 10MB
        if file.size > max_size:
            return Response(
                {"detail": "File too large (max 10MB)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save file
        result = data_service.save_uploaded_file(file, request.user, project)
        if result is None:
            return Response(
                {"detail": "Failed to save file."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Create or reuse session
        session_id = request.data.get('session_id')
        if session_id:
            try:
                session = AgentSession.objects.get(
                    id=session_id, user=request.user, is_deleted=False,
                )
            except AgentSession.DoesNotExist:
                session = AgentSession.objects.create(
                    user=request.user, project=project,
                    title=f"Analysis: {result['original_filename']}",
                )
        else:
            session = AgentSession.objects.create(
                user=request.user, project=project,
                title=f"Analysis: {result['original_filename']}",
            )

        orchestrator = AgentOrchestrator(
            user=request.user, project=project, session=session,
        )

        def event_stream():
            # Immediately emit file_uploaded event
            file_event = {
                "type": "file_uploaded",
                "content": f"Uploaded \"{result['original_filename']}\" ({result['row_count']} rows, {result['column_count']} columns).",
                "data": {
                    "file_id": result['id'],
                    "filename": result['filename'],
                    "original_filename": result['original_filename'],
                    "row_count": result['row_count'],
                    "column_count": result['column_count'],
                },
            }
            yield f"data: {json.dumps(file_event)}\n\n"

            # Run analysis
            assistant_content_parts = []
            assistant_metadata = {"file_id": result['id']}
            last_message_type = 'text'

            for chunk in orchestrator.analyze_file(result['id']):
                chunk_type = chunk.get('type', 'text')
                content = chunk.get('content', '')
                data = chunk.get('data')

                assistant_content_parts.append(content)
                last_message_type = chunk_type
                if data:
                    assistant_metadata.update(data)

                yield f"data: {json.dumps(chunk, default=str)}\n\n"

            # Save assistant message
            if assistant_content_parts:
                AgentMessage.objects.create(
                    session=session,
                    role='assistant',
                    content='\n'.join(assistant_content_parts),
                    message_type=last_message_type,
                    metadata=assistant_metadata,
                )

            # Done event with session_id
            done_event = {
                "type": "done",
                "data": {"session_id": str(session.id)},
            }
            yield f"data: {json.dumps(done_event)}\n\n"

        response = StreamingHttpResponse(
            event_stream(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


class DataReportSummaryView(EnglishResponseMixin, APIView):
    """GET /api/agent/data/reports/summary/ — aggregated KPI data."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        summary = data_service.get_reports_summary(project)
        if summary is None:
            return Response({"detail": "No data available."}, status=status.HTTP_200_OK)
        return Response(summary)


class DecisionStatsView(EnglishResponseMixin, APIView):
    """GET /api/agent/decisions/stats/ — Decision status counts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = Decision.objects.filter(project=project, is_deleted=False)

        counts = qs.values('status').annotate(count=Count('id'))
        stats = {}
        for item in counts:
            stats[item['status'].lower()] = item['count']
        return Response(stats)


class DecisionRecentView(EnglishResponseMixin, APIView):
    """GET /api/agent/decisions/recent/ — latest 5 decisions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = Decision.objects.filter(project=project, is_deleted=False)

        decisions = qs.order_by('-created_at')[:5]
        result = []
        for d in decisions:
            result.append({
                'id': d.id,
                'title': d.title or f'Decision #{d.project_seq}',
                'status': d.status.lower(),
                'risk_level': (d.risk_level or '').lower(),
                'confidence': d.confidence,
                'author': d.author.get_full_name() if d.author else 'AI Agent',
                'created_at': d.created_at.isoformat(),
            })
        return Response(result)


class AnomalyLatestView(EnglishResponseMixin, APIView):
    """GET /api/agent/anomalies/latest/ — latest anomalies from most recent analysis."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Find the most recent assistant message that has anomalies in metadata
        msg = (
            AgentMessage.objects
            .filter(
                session__project=project,
                session__user=request.user,
                role='assistant',
            )
            .filter(metadata__has_key='anomalies')
            .order_by('-created_at')
            .first()
        )
        if not msg or not msg.metadata.get('anomalies'):
            return Response([])
        return Response(msg.metadata['anomalies'])


class GenerateDecisionView(APIView):
    """POST /api/agent/generate-decision/ — generate a decision directly from a spreadsheet."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        project = _get_user_project(request)
        if not project:
            return Response(
                {"detail": "No active project."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        spreadsheet_id = request.data.get('spreadsheet_id')
        if not spreadsheet_id:
            return Response(
                {"detail": "spreadsheet_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            spreadsheet = Spreadsheet.objects.get(
                id=spreadsheet_id, project=project, is_deleted=False
            )
        except Spreadsheet.DoesNotExist:
            return Response(
                {"detail": "Spreadsheet not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        spreadsheet_data = _extract_spreadsheet_data(spreadsheet)

        try:
            analysis = _run_analysis(spreadsheet_data, user_id=request.user.id)
        except RuntimeError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        suggested = analysis.get("suggested_decision", {})
        max_seq = (
            Decision.objects.filter(project=project)
            .aggregate(Max('project_seq'))['project_seq__max'] or 0
        )

        decision = Decision.objects.create(
            title=suggested.get("title", "AI Generated Decision"),
            context_summary=suggested.get("context_summary", ""),
            reasoning=suggested.get("reasoning", ""),
            risk_level=suggested.get("risk_level", "MEDIUM"),
            confidence=suggested.get("confidence", 3),
            project=project,
            project_seq=max_seq + 1,
            author=request.user,
            created_by_agent=True,
        )

        for anomaly in analysis.get("anomalies", []):
            Signal.objects.create(
                decision=decision,
                author=request.user,
                metric=anomaly.get("metric", ""),
                movement=anomaly.get("movement", ""),
                period=anomaly.get("period", ""),
                scope_type=anomaly.get("scope_type", ""),
                scope_value=anomaly.get("scope_value", ""),
                delta_value=anomaly.get("delta_value"),
                delta_unit=anomaly.get("delta_unit", ""),
                display_text=anomaly.get("description", ""),
            )

        for opt in suggested.get("options", []):
            Option.objects.create(
                decision=decision,
                text=opt.get("text", ""),
                order=opt.get("order", 0),
            )

        return Response(
            {
                "decision_id": decision.id,
                "title": decision.title,
                "project_seq": decision.project_seq,
                "status": decision.status,
            },
            status=status.HTTP_201_CREATED,
        )
