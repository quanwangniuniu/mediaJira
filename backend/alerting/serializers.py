from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

from alerting.models import AlertTask
from task.models import Task
from core.models import ProjectMember


User = get_user_model()


class AlertTaskSerializer(serializers.ModelSerializer):
    """Serializer for AlertTask model."""

    class Meta:
        model = AlertTask
        fields = [
            "id",
            "task",
            "alert_type",
            "severity",
            "affected_entities",
            "initial_metrics",
            "acknowledged_by",
            "acknowledged_at",
            "assigned_to",
            "status",
            "investigation_notes",
            "resolution_steps",
            "related_references",
            "postmortem_root_cause",
            "postmortem_prevention",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_task(self, task: Task) -> Task:
        if task.type != "alert":
            raise serializers.ValidationError(
                'Alert details can only be created for tasks of type "alert".'
            )
        return task

    def _get_task_for_validation(self) -> Task | None:
        if isinstance(self.instance, AlertTask):
            return self.instance.task
        task_id = self.initial_data.get("task")
        if task_id:
            try:
                return Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                return None
        return None

    def validate_assigned_to(self, user: User | None) -> User | None:
        if user is None:
            return user
        task_obj = self._get_task_for_validation()
        if task_obj is None:
            return user
        has_membership = ProjectMember.objects.filter(
            user=user, project=task_obj.project, is_active=True
        ).exists()
        if not has_membership:
            raise serializers.ValidationError("Assignee must be a member of the task project.")
        return user

    def validate_acknowledged_by(self, user: User | None) -> User | None:
        if user is None:
            return user
        task_obj = self._get_task_for_validation()
        if task_obj is None:
            return user
        has_membership = ProjectMember.objects.filter(
            user=user, project=task_obj.project, is_active=True
        ).exists()
        if not has_membership:
            raise serializers.ValidationError("Acknowledging user must be a member of the task project.")
        return user

    def validate(self, attrs):
        status = attrs.get("status")
        resolved_at = attrs.get("resolved_at")
        if status in {"resolved", "closed"} and resolved_at is None:
            attrs["resolved_at"] = timezone.now()
        return attrs
