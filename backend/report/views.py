from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError, NotFound
from rest_framework.response import Response
from rest_framework import status

from core.models import ProjectMember
from report.models import ReportTask, ReportTaskKeyAction
from report.serializers import (
    ReportTaskSerializer,
    ReportCreateSerializer,
    ReportUpdateSerializer,
    ReportTaskCreateUpdateSerializer,
    ReportTaskKeyActionSerializer,
    ReportKeyActionCreateSerializer,
    ReportKeyActionUpdateSerializer,
)


def _get_accessible_report_queryset(user):
    if not user.is_authenticated:
        return ReportTask.objects.none()
    accessible_project_ids = ProjectMember.objects.filter(
        user=user,
        is_active=True,
    ).values_list("project_id", flat=True)
    return ReportTask.objects.select_related("task", "task__project").filter(
        task__project_id__in=accessible_project_ids
    )


def _get_report_or_404(user, report_id):
    qs = _get_accessible_report_queryset(user)
    try:
        return qs.get(id=report_id)
    except ReportTask.DoesNotExist:
        raise NotFound("Report not found.")


class ReportListCreateView(generics.ListCreateAPIView):
    """
    GET /api/report/reports/
    POST /api/report/reports/
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_serializer_class(self):
        if self.request.method == "POST":
            # Use ReportTaskCreateUpdateSerializer if key_actions is present
            if "key_actions" in self.request.data:
                return ReportTaskCreateUpdateSerializer
            return ReportCreateSerializer
        return ReportTaskSerializer

    def get_queryset(self):
        return _get_accessible_report_queryset(self.request.user)

    def perform_create(self, serializer):
        task = serializer.validated_data.get("task")
        if task is None:
            raise DRFValidationError({"task": "Task is required for report details."})
        if task.type != "report":
            raise DRFValidationError(
                {"task": 'Report details can only be created for tasks of type "report".'}
            )
        user = self.request.user
        has_membership = ProjectMember.objects.filter(
            user=user,
            project=task.project,
            is_active=True,
        ).exists()
        if not has_membership:
            raise PermissionDenied("You do not have access to this task.")
        if hasattr(task, "report_task"):
            raise DRFValidationError({"task": "Report details already exist for this task."})

        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        report_task = serializer.instance
        output = ReportTaskSerializer(report_task, context={"request": request}).data
        return Response(output, status=status.HTTP_201_CREATED)


class ReportRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """
    GET /api/report/reports/{id}/
    PATCH /api/report/reports/{id}/
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            # Use ReportTaskCreateUpdateSerializer if key_actions is present
            if "key_actions" in self.request.data:
                return ReportTaskCreateUpdateSerializer
            return ReportUpdateSerializer
        return ReportTaskSerializer

    def get_queryset(self):
        return _get_accessible_report_queryset(self.request.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        output = ReportTaskSerializer(instance, context={"request": request}).data
        return Response(output)


class ReportKeyActionListCreateView(generics.ListCreateAPIView):
    """
    GET /api/report/reports/{id}/key-actions/
    POST /api/report/reports/{id}/key-actions/
    """

    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ReportKeyActionCreateSerializer
        return ReportTaskKeyActionSerializer

    def get_queryset(self):
        report_id = self.kwargs.get("id")
        _get_report_or_404(self.request.user, report_id)
        return ReportTaskKeyAction.objects.filter(report_task_id=report_id).order_by(
            "order_index", "id"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        report_id = self.kwargs.get("id")
        context["report_task"] = _get_report_or_404(self.request.user, report_id)
        return context

    def perform_create(self, serializer):
        report_task = self.get_serializer_context()["report_task"]
        serializer.save(report_task=report_task)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        key_action = serializer.instance
        output = ReportTaskKeyActionSerializer(key_action).data
        return Response(output, status=status.HTTP_201_CREATED)


class ReportKeyActionRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET /api/report/reports/{id}/key-actions/{action_id}/
    PATCH /api/report/reports/{id}/key-actions/{action_id}/
    DELETE /api/report/reports/{id}/key-actions/{action_id}/
    """

    permission_classes = [IsAuthenticated]
    lookup_url_kwarg = "action_id"
    lookup_field = "id"

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            return ReportKeyActionUpdateSerializer
        return ReportTaskKeyActionSerializer

    def get_queryset(self):
        report_id = self.kwargs.get("id")
        report = _get_report_or_404(self.request.user, report_id)
        return ReportTaskKeyAction.objects.filter(report_task=report).order_by(
            "order_index", "id"
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        report_id = self.kwargs.get("id")
        context["report_task"] = _get_report_or_404(self.request.user, report_id)
        return context

    def perform_update(self, serializer):
        serializer.save()
