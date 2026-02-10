from rest_framework import serializers

from core.models import ProjectMember
from report.models import ReportTask, ReportTaskKeyAction
from task.models import Task


class ReportTaskKeyActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTaskKeyAction
        fields = ["id", "order_index", "action_text", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReportTaskSerializer(serializers.ModelSerializer):
    is_complete = serializers.BooleanField(read_only=True)
    prompt_template = serializers.SerializerMethodField(read_only=True)

    # Expose key actions as ordered objects.
    key_actions = ReportTaskKeyActionSerializer(many=True, read_only=True)

    class Meta:
        model = ReportTask
        fields = [
            "id",
            "task",
            "audience_type",
            "audience_details",
            "audience_prompt_version",
            "prompt_template",
            "context",
            "outcome_summary",
            "narrative_explanation",
            "key_actions",
            "is_complete",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "audience_prompt_version",
            "prompt_template",
            "is_complete",
            "created_at",
            "updated_at",
        ]

    def get_prompt_template(self, obj: ReportTask) -> dict:
        return obj.resolved_prompt_template


class ReportTaskCreateUpdateSerializer(ReportTaskSerializer):
    """Create/update serializer that accepts `key_actions` as a list of strings."""

    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all())
    key_actions = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        help_text="List of key action strings in order (max 6)",
        write_only=True,
    )

    class Meta(ReportTaskSerializer.Meta):
        fields = ReportTaskSerializer.Meta.fields

    def validate_task(self, task: Task) -> Task:
        if task.type != "report":
            raise serializers.ValidationError(
                'ReportTask details can only be created for tasks of type "report".'
            )
        return task

    def validate_key_actions(self, value: list[str]) -> list[str]:
        if len(value) > 6:
            raise serializers.ValidationError("At most 6 key actions are allowed.")
        cleaned = [v.strip() for v in value]
        if any(not v for v in cleaned):
            raise serializers.ValidationError("Key actions cannot be blank.")
        return cleaned

    def validate(self, attrs):
        if self.instance and "task" in attrs and attrs["task"].id != self.instance.task_id:
            raise serializers.ValidationError({
                "task": "Task cannot be modified after report details are created."
            })

        audience_type = attrs.get("audience_type")
        audience_details = (attrs.get("audience_details") or "").strip()
        if audience_type == ReportTask.AudienceType.OTHER and not audience_details:
            raise serializers.ValidationError(
                {"audience_details": "Audience details are required when audience type is 'other'."}
            )
        return attrs

    def _ensure_user_can_access_task(self, task: Task):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not getattr(user, "is_authenticated", False):
            raise serializers.ValidationError({"task": "Authentication required."})

        has_membership = ProjectMember.objects.filter(
            user=user,
            project=task.project,
            is_active=True,
        ).exists()
        if not has_membership:
            raise serializers.ValidationError({"task": "You do not have access to this task."})

    def create(self, validated_data):
        key_actions = validated_data.pop("key_actions", [])
        task = validated_data.get("task")
        self._ensure_user_can_access_task(task)

        if hasattr(task, "report_task"):
            raise serializers.ValidationError({"task": "ReportTask details already exist for this task."})

        report_task = super().create(validated_data)

        for idx, action_text in enumerate(key_actions, start=1):
            ReportTaskKeyAction.objects.create(
                report_task=report_task,
                order_index=idx,
                action_text=action_text,
            )

        return report_task

    def update(self, instance: ReportTask, validated_data):
        key_actions = validated_data.pop("key_actions", None)

        report_task = super().update(instance, validated_data)

        # If key_actions provided, replace the set (soft validation: allow empty).
        if key_actions is not None:
            ReportTaskKeyAction.objects.filter(report_task=report_task).delete()
            for idx, action_text in enumerate(key_actions, start=1):
                ReportTaskKeyAction.objects.create(
                    report_task=report_task,
                    order_index=idx,
                    action_text=action_text,
                )

        return report_task
