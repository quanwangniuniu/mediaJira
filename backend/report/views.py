from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError

from core.models import ProjectMember
from report.models import ReportTask
from report.serializers import ReportTaskSerializer, ReportTaskCreateUpdateSerializer
from task.models import Task


class ReportTaskListCreateView(generics.ListCreateAPIView):
    """
    GET /api/report/report-tasks/
    POST /api/report/report-tasks/
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in {"POST"}:
            return ReportTaskCreateUpdateSerializer
        return ReportTaskSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ReportTask.objects.none()

        accessible_project_ids = ProjectMember.objects.filter(
            user=user,
            is_active=True,
        ).values_list("project_id", flat=True)

        queryset = ReportTask.objects.select_related("task", "task__project").filter(
            task__project_id__in=accessible_project_ids
        )

        task_id = self.request.query_params.get("task_id")
        if task_id:
            queryset = queryset.filter(task_id=task_id)

        audience_type = self.request.query_params.get("audience_type")
        if audience_type:
            queryset = queryset.filter(audience_type=audience_type)

        return queryset

    def perform_create(self, serializer):
        task: Task | None = serializer.validated_data.get("task")
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


class ReportTaskRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """
    GET /api/report/report-tasks/{id}/
    PATCH /api/report/report-tasks/{id}/
    """

    permission_classes = [IsAuthenticated]
    lookup_field = "id"

    def get_serializer_class(self):
        if self.request.method in {"PATCH", "PUT"}:
            return ReportTaskCreateUpdateSerializer
        return ReportTaskSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ReportTask.objects.none()

        accessible_project_ids = ProjectMember.objects.filter(
            user=user,
            is_active=True,
        ).values_list("project_id", flat=True)

        return ReportTask.objects.select_related("task", "task__project").filter(
            task__project_id__in=accessible_project_ids
        )
