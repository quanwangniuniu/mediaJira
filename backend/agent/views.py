import json
import logging

from django.http import StreamingHttpResponse
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Project
from spreadsheet.models import Spreadsheet
from .models import AgentSession, AgentMessage
from .serializers import (
    AgentSessionListSerializer,
    AgentSessionDetailSerializer,
    ChatInputSerializer,
)
from .services import AgentOrchestrator

logger = logging.getLogger(__name__)


def _get_user_project(request):
    """Get the active project for the current user."""
    project_id = request.headers.get('X-Project-Id') or request.query_params.get('project_id')
    if project_id:
        try:
            return Project.objects.get(id=project_id, is_deleted=False)
        except Project.DoesNotExist:
            return None
    return getattr(request.user, 'active_project', None)


class AgentSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

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


class ChatView(APIView):
    permission_classes = [IsAuthenticated]

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
                action=action,
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


class SpreadsheetListView(APIView):
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
        return Response(list(spreadsheets))
