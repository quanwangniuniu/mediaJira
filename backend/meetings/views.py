import logging
import traceback

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import DatabaseError, IntegrityError, transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Project, ProjectMember
from meetings.models import (
    Meeting,
    AgendaItem,
    ParticipantLink,
    ArtifactLink,
    MeetingActionItem,
    MeetingTemplate,
    MeetingDocument,
)
from meetings.serializers import (
    MeetingSerializer,
    AgendaItemSerializer,
    ParticipantLinkSerializer,
    ArtifactLinkSerializer,
    MeetingTemplateSerializer,
    MeetingDocumentSerializer,
    MeetingActionItemSerializer,
    ConvertActionItemToTaskSerializer,
    BulkConvertActionItemsSerializer,
)
from meetings.services import (
    reorder_agenda_items,
    get_or_create_meeting_document,
    update_meeting_document_content,
    user_has_meeting_document_access,
)
from meetings.action_item_conversion import (
    bulk_convert_meeting_action_items_to_tasks,
    convert_meeting_action_item_to_task,
)
from task.models import Task
from task.serializers import TaskListSerializer, TaskSerializer

logger = logging.getLogger(__name__)

# Default workspace module order (matches frontend initial blocks).
DEFAULT_MEETING_LAYOUT = [
    {"id": "header", "type": "header"},
    {"id": "agenda", "type": "agenda"},
    {"id": "participants", "type": "participants"},
    {"id": "artifacts", "type": "artifacts"},
]


def _ensure_project_membership(user, project: Project) -> None:
    if not ProjectMember.objects.filter(
        user=user,
        project=project,
        is_active=True,
    ).exists():
        raise PermissionDenied("You do not have access to this project.")


def _ensure_meeting_document_access(user, meeting: Meeting) -> None:
    if user_has_meeting_document_access(user.id, meeting):
        return
    raise PermissionDenied("You do not have access to this meeting document.")


class MeetingViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except (Http404, NotFound, PermissionDenied):
            raise
        except DatabaseError:
            logger.exception("Meeting list failed (database)")
            return Response(
                {
                    "detail": "Could not load meetings. If this persists, ensure database migrations are applied for the meetings app.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except (Http404, NotFound, PermissionDenied):
            raise
        except DatabaseError:
            logger.exception("Meeting retrieve failed (database)")
            return Response(
                {
                    "detail": "Could not load meeting. If this persists, ensure database migrations are applied for the meetings app.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        instance = self._normalize_meeting_layout(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def _normalize_meeting_layout(self, meeting: Meeting) -> Meeting:
        lc = meeting.layout_config

        def persist(next_lc):
            meeting.layout_config = next_lc
            try:
                meeting.save(update_fields=["layout_config"])
            except DatabaseError:
                logger.exception("Could not persist default layout_config for meeting %s", meeting.pk)

        if lc is None:
            persist(list(DEFAULT_MEETING_LAYOUT))
            return meeting

        if isinstance(lc, list):
            if len(lc) == 0:
                persist(list(DEFAULT_MEETING_LAYOUT))
            return meeting

        if isinstance(lc, dict):
            blocks = lc.get("blocks")
            if not isinstance(blocks, list) or len(blocks) == 0:
                persist({**lc, "blocks": list(DEFAULT_MEETING_LAYOUT)})
            return meeting

        persist(list(DEFAULT_MEETING_LAYOUT))
        return meeting

    def get_project(self) -> Project:
        project_id = self.kwargs.get("project_id")
        project = get_object_or_404(Project, id=project_id)
        _ensure_project_membership(self.request.user, project)
        return project

    def get_queryset(self):
        project = self.get_project()
        return Meeting.objects.filter(project=project).order_by("-id")

    @action(detail=True, methods=["get"], url_path="tasks")
    def meeting_tasks(self, request, project_id=None, pk=None):
        """
        List tasks that originated from this meeting (immutable lineage: origin_meeting_id).
        """
        meeting = self.get_object()
        qs = (
            Task.objects.filter(
                project_id=meeting.project_id,
                origin_meeting_id=meeting.id,
            )
            .select_related("project", "owner", "current_approver")
            .order_by("-id")
        )
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = TaskListSerializer(
                page, many=True, context={"request": request}
            )
            return self.get_paginated_response(serializer.data)
        serializer = TaskListSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)

    def perform_create(self, serializer):
        project = self.get_project()
        # If the client doesn't provide a layout_config, initialize it to the default
        # workspace module order so the editor always has a predictable starting state.
        lc = serializer.validated_data.get("layout_config")
        if lc is None:
            serializer.validated_data["layout_config"] = list(DEFAULT_MEETING_LAYOUT)
        elif isinstance(lc, list) and len(lc) == 0:
            serializer.validated_data["layout_config"] = list(DEFAULT_MEETING_LAYOUT)
        elif isinstance(lc, dict):
            blocks = lc.get("blocks")
            if not isinstance(blocks, list) or len(blocks) == 0:
                serializer.validated_data["layout_config"] = {
                    **lc,
                    "blocks": list(DEFAULT_MEETING_LAYOUT),
                }
        raw_ids = serializer.validated_data.pop("participant_user_ids", None)
        if raw_ids is None:
            participant_user_ids: list[int] = []
        else:
            participant_user_ids = list(dict.fromkeys(int(x) for x in raw_ids))

        # Strict mode used to require the client to send ids; create flow no longer asks
        # for participants on the form — default to the creator so the meeting always has
        # at least one participant when the setting is enabled.
        if getattr(settings, "MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE", False):
            if len(participant_user_ids) < 1:
                participant_user_ids = [self.request.user.id]

        User = get_user_model()

        with transaction.atomic():
            meeting = serializer.save(project=project)

            if not participant_user_ids:
                return

            for uid in participant_user_ids:
                if not User.objects.filter(pk=uid).exists():
                    raise ValidationError(
                        {"participant_user_ids": [f"Unknown user id: {uid}."]}
                    )
                if not ProjectMember.objects.filter(
                    user_id=uid,
                    project=project,
                    is_active=True,
                ).exists():
                    raise ValidationError(
                        {
                            "participant_user_ids": [
                                f"User {uid} is not an active member of this project."
                            ]
                        }
                    )

            for uid in participant_user_ids:
                try:
                    ParticipantLink.objects.get_or_create(
                        meeting=meeting,
                        user_id=uid,
                        defaults={"role": None},
                    )
                except IntegrityError as exc:
                    raise ValidationError(
                        {
                            "participant_user_ids": [
                                "Could not attach participants; please retry."
                            ]
                        }
                    ) from exc



class AgendaItemViewSet(viewsets.ModelViewSet):
    serializer_class = AgendaItemSerializer
    permission_classes = [IsAuthenticated]

    def get_meeting(self) -> Meeting:
        project_id = self.kwargs.get("project_id")
        meeting_id = self.kwargs.get("meeting_id")
        meeting = get_object_or_404(
            Meeting.objects.select_related("project"),
            id=meeting_id,
            project_id=project_id,
        )
        _ensure_project_membership(self.request.user, meeting.project)
        return meeting

    def get_queryset(self):
        meeting = self.get_meeting()
        return meeting.agenda_items.all().order_by("order_index", "id")

    def perform_create(self, serializer):
        meeting = self.get_meeting()
        try:
            serializer.save(meeting=meeting)
        except IntegrityError:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                {"order_index": ["This order_index is already used for this meeting."]}
            )

    @action(detail=False, methods=["patch"], url_path="reorder")
    def reorder(self, request, project_id=None, meeting_id=None):
        meeting = self.get_meeting()
        items = request.data.get("items", [])
        if not isinstance(items, list):
            return Response(
                {"items": ["This field must be a list of objects."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized = []
        for item in items:
            try:
                normalized.append(
                    {
                        "id": int(item["id"]),
                        "order_index": int(item["order_index"]),
                    }
                )
            except (KeyError, TypeError, ValueError):
                return Response(
                    {
                        "items": [
                            "Each item must contain integer 'id' and 'order_index'."
                        ]
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        updated_items = reorder_agenda_items(meeting.id, normalized)
        serializer = self.get_serializer(updated_items, many=True)
        return Response(serializer.data)


class ParticipantLinkViewSet(viewsets.ModelViewSet):
    serializer_class = ParticipantLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_meeting(self) -> Meeting:
        project_id = self.kwargs.get("project_id")
        meeting_id = self.kwargs.get("meeting_id")
        meeting = get_object_or_404(
            Meeting.objects.select_related("project"),
            id=meeting_id,
            project_id=project_id,
        )
        _ensure_project_membership(self.request.user, meeting.project)
        return meeting

    def get_queryset(self):
        meeting = self.get_meeting()
        return meeting.participant_links.all()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action in {"create", "update", "partial_update"}:
            context["meeting"] = self.get_meeting()
        return context

    def perform_create(self, serializer):
        meeting = self.get_meeting()
        serializer.save(meeting=meeting)


class ArtifactLinkViewSet(viewsets.ModelViewSet):
    serializer_class = ArtifactLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_meeting(self) -> Meeting:
        project_id = self.kwargs.get("project_id")
        meeting_id = self.kwargs.get("meeting_id")
        meeting = get_object_or_404(
            Meeting.objects.select_related("project"),
            id=meeting_id,
            project_id=project_id,
        )
        _ensure_project_membership(self.request.user, meeting.project)
        return meeting

    def get_queryset(self):
        meeting = self.get_meeting()
        return meeting.artifact_links.all()

    def perform_create(self, serializer):
        meeting = self.get_meeting()
        serializer.save(meeting=meeting)


class MeetingTemplateViewSet(viewsets.ModelViewSet):
    """
    Reusable workspace templates for the Meeting editor.
    """

    queryset = MeetingTemplate.objects.all()
    serializer_class = MeetingTemplateSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except APIException:
            raise
        except Exception as e:
            logger.error(traceback.format_exc())
            body = {"error": str(e)}
            if settings.DEBUG:
                body["traceback"] = traceback.format_exc()
            return Response(body, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def perform_create(self, serializer):
        # id is generated by the model; keep name + layout_config from request.
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        """
        Upsert style PATCH support.

        The frontend previously saved built-in templates keyed by `meetingType` (string),
        so this view allows updating/creating by pk if it doesn't exist yet.
        """
        template_id = kwargs.get("pk")
        if not template_id:
            return super().partial_update(request, *args, **kwargs)

        template, _ = MeetingTemplate.objects.get_or_create(
            id=str(template_id),
            defaults={"name": str(template_id)},
        )

        serializer = self.get_serializer(template, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class MeetingDocumentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_meeting(self, project_id: int, meeting_id: int) -> Meeting:
        meeting = get_object_or_404(
            Meeting.objects.select_related("project"),
            id=meeting_id,
            project_id=project_id,
        )
        _ensure_meeting_document_access(self.request.user, meeting)
        return meeting

    def get(self, request, project_id: int, meeting_id: int):
        meeting = self._get_meeting(project_id, meeting_id)
        document = get_or_create_meeting_document(meeting.id)
        serializer = MeetingDocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, project_id: int, meeting_id: int):
        meeting = self._get_meeting(project_id, meeting_id)
        content = request.data.get("content")
        if not isinstance(content, str):
            raise ValidationError({"content": ["This field is required and must be a string."]})
        yjs_state = request.data.get("yjs_state")
        if yjs_state is not None and not isinstance(yjs_state, str):
            raise ValidationError({"yjs_state": ["This field must be a string."]})
        document = update_meeting_document_content(
            meeting_id=meeting.id,
            content=content,
            yjs_state=yjs_state,
            user_id=request.user.id,
        )
        serializer = MeetingDocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MeetingActionItemViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingActionItemSerializer
    permission_classes = [IsAuthenticated]

    def get_meeting(self) -> Meeting:
        project_id = self.kwargs.get("project_id")
        meeting_id = self.kwargs.get("meeting_id")
        meeting = get_object_or_404(
            Meeting.objects.select_related("project"),
            id=meeting_id,
            project_id=project_id,
        )
        _ensure_project_membership(self.request.user, meeting.project)
        return meeting

    def get_queryset(self):
        meeting = self.get_meeting()
        return meeting.action_items.all().order_by("order_index", "id")

    def perform_create(self, serializer):
        meeting = self.get_meeting()
        try:
            serializer.save(meeting=meeting)
        except IntegrityError:
            raise ValidationError(
                {"order_index": ["This order_index is already used for this meeting."]}
            )

    @action(detail=True, methods=["post"], url_path="convert-to-task")
    def convert_to_task(self, request, project_id=None, meeting_id=None, pk=None):
        meeting = self.get_meeting()
        action_item = get_object_or_404(
            MeetingActionItem.objects.filter(meeting=meeting),
            pk=pk,
        )
        input_serializer = ConvertActionItemToTaskSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data
        task = convert_meeting_action_item_to_task(
            action_item=action_item,
            acting_user=request.user,
            owner_id=data.get("owner_id"),
            due_date=data.get("due_date"),
            priority=data["priority"],
            task_type=data["type"],
            summary=(data.get("summary") or "").strip() or None,
            description=data.get("description"),
            create_as_draft=data.get("create_as_draft", True),
        )
        out = TaskSerializer(task, context={"request": request})
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="bulk-convert-to-tasks")
    def bulk_convert_to_tasks(self, request, project_id=None, meeting_id=None):
        """
        Convert multiple action items. Already-converted or unknown ids are reported in ``skipped``;
        others are created and listed under ``created`` (HTTP 200).
        """
        meeting = self.get_meeting()
        input_serializer = BulkConvertActionItemsSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data
        created_rows, skipped = bulk_convert_meeting_action_items_to_tasks(
            meeting=meeting,
            acting_user=request.user,
            action_item_ids=data["action_item_ids"],
            owner_id=data.get("owner_id"),
            due_date=data.get("due_date"),
            priority=data["priority"],
            task_type=data["type"],
            create_as_draft=data.get("create_as_draft", True),
        )
        created_payload = [
            {
                "action_item_id": row["action_item_id"],
                "task": TaskSerializer(row["task"], context={"request": request}).data,
            }
            for row in created_rows
        ]
        return Response(
            {"created": created_payload, "skipped": skipped},
            status=status.HTTP_200_OK,
        )

