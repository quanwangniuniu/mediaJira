from rest_framework import serializers

from core.models import ProjectMember
from report.models import ReportTask, ReportTaskKeyAction
from task.models import Task


class ReportTaskKeyActionSerializer(serializers.ModelSerializer):
    report_task = serializers.IntegerField(source="report_task_id", read_only=True, required=False)

    class Meta:
        model = ReportTaskKeyAction
        fields = ["id", "report_task", "order_index", "action_text", "created_at", "updated_at"]
        read_only_fields = ["id", "report_task", "created_at", "updated_at"]


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


class ReportCreateSerializer(serializers.ModelSerializer):
    """Create report (no key_actions); key actions are created via nested key-actions endpoints."""

    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all())

    class Meta:
        model = ReportTask
        fields = [
            "task",
            "audience_type",
            "audience_details",
            "context",
            "outcome_summary",
            "narrative_explanation",
        ]

    def validate_task(self, task: Task) -> Task:
        if task.type != "report":
            raise serializers.ValidationError(
                'ReportTask details can only be created for tasks of type "report".'
            )
        return task

    def validate(self, attrs):
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
        task = validated_data.get("task")
        self._ensure_user_can_access_task(task)
        if hasattr(task, "report_task"):
            raise serializers.ValidationError({"task": "ReportTask details already exist for this task."})
        return super().create(validated_data)


class ReportUpdateSerializer(serializers.ModelSerializer):
    """Partial update; no task, no key_actions."""

    class Meta:
        model = ReportTask
        fields = [
            "audience_type",
            "audience_details",
            "context",
            "outcome_summary",
            "narrative_explanation",
        ]

    def validate(self, attrs):
        audience_type = attrs.get("audience_type", getattr(self.instance, "audience_type", None))
        if audience_type == ReportTask.AudienceType.OTHER:
            audience_details = (attrs.get("audience_details") or "").strip()
            existing = (getattr(self.instance, "audience_details", None) or "").strip() if self.instance else ""
            if not audience_details and not existing:
                raise serializers.ValidationError(
                    {"audience_details": "Audience details are required when audience type is 'other'."}
                )
        return attrs


class ReportKeyActionCreateSerializer(serializers.ModelSerializer):
    """Create key action; order_index 1-6, unique per report; max 6 per report."""

    class Meta:
        model = ReportTaskKeyAction
        fields = ["order_index", "action_text"]

    def validate_order_index(self, value):
        if value is None or not (1 <= value <= 6):
            raise serializers.ValidationError("order_index must be between 1 and 6.")
        return value

    def validate_action_text(self, value):
        if not value or not (value and value.strip()):
            raise serializers.ValidationError("action_text cannot be blank.")
        if len(value) > 280:
            raise serializers.ValidationError("action_text must be at most 280 characters.")
        return value.strip()

    def validate(self, attrs):
        report_task = self.context.get("report_task")
        if not report_task:
            return attrs
        order_index = attrs.get("order_index")
        if ReportTaskKeyAction.objects.filter(report_task=report_task, order_index=order_index).exists():
            raise serializers.ValidationError(
                {"order_index": "A key action with this order_index already exists for this report."}
            )
        if ReportTaskKeyAction.objects.filter(report_task=report_task).count() >= 6:
            raise serializers.ValidationError(
                "This report already has 6 key actions. Delete one before adding another."
            )
        return attrs


class ReportKeyActionUpdateSerializer(serializers.ModelSerializer):
    """Partial update for key action."""

    class Meta:
        model = ReportTaskKeyAction
        fields = ["order_index", "action_text"]

    def validate_order_index(self, value):
        if value is not None and not (1 <= value <= 6):
            raise serializers.ValidationError("order_index must be between 1 and 6.")
        return value

    def validate_action_text(self, value):
        if value is not None:
            if not value.strip():
                raise serializers.ValidationError("action_text cannot be blank.")
            if len(value) > 280:
                raise serializers.ValidationError("action_text must be at most 280 characters.")
            return value.strip()
        return value

    def validate(self, attrs):
        report_task = self.context.get("report_task")
        if not report_task or "order_index" not in attrs:
            return attrs
        order_index = attrs["order_index"]
        qs = ReportTaskKeyAction.objects.filter(report_task=report_task, order_index=order_index)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                {"order_index": "A key action with this order_index already exists for this report."}
            )
        return attrs


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
