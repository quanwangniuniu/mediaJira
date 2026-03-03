from rest_framework import serializers
from django.contrib.auth import get_user_model

from task.models import Task
from policy.models import PlatformPolicyUpdate

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """Minimal user representation for nested display."""
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class TaskSummarySerializer(serializers.ModelSerializer):
    """Minimal task representation for nested display."""
    class Meta:
        model = Task
        fields = ['id', 'summary', 'status', 'type']


class PlatformPolicyUpdateSerializer(serializers.ModelSerializer):
    # --- Read-only nested representations ---
    task = TaskSummarySerializer(read_only=True)
    created_by = UserSummarySerializer(read_only=True)
    assigned_to = UserSummarySerializer(read_only=True)
    reviewed_by = UserSummarySerializer(read_only=True)

    # --- Write-only ID fields ---
    task_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    created_by_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    assigned_to_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )
    reviewed_by_id = serializers.IntegerField(
        write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = PlatformPolicyUpdate
        fields = [
            'id',
            # FK read
            'task', 'created_by', 'assigned_to', 'reviewed_by',
            # FK write
            'task_id', 'created_by_id', 'assigned_to_id', 'reviewed_by_id',
            # Platform & Policy Info
            'platform', 'policy_change_type', 'policy_description',
            'policy_reference_url', 'effective_date',
            # Affected Scope
            'affected_campaigns', 'affected_ad_sets', 'affected_assets',
            # Impact Assessment
            'performance_impact', 'budget_impact', 'compliance_risk',
            # Immediate Actions
            'immediate_actions_required', 'action_deadline',
            # Mitigation Tracking
            'mitigation_status', 'mitigation_plan', 'mitigation_steps',
            'mitigation_execution_notes', 'mitigation_completed_at',
            'mitigation_results',
            # Post-Mitigation Review
            'post_mitigation_review', 'review_completed_at',
            'all_impacts_addressed', 'lessons_learned',
            # Notes & References
            'notes', 'related_references',
            # Metadata
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    # --- Field-level validators ---

    def validate_task_id(self, value):
        if value is None:
            return value
        try:
            task = Task.objects.get(id=value)
        except Task.DoesNotExist:
            raise serializers.ValidationError("Task not found.")
        if task.type != "platform_policy_update":
            raise serializers.ValidationError(
                "Task.type must be 'platform_policy_update'."
            )
        return value

    def validate_mitigation_steps(self, value):
        if not value:
            return value
        if not isinstance(value, list):
            raise serializers.ValidationError("mitigation_steps must be a list.")
        for idx, step in enumerate(value):
            if not isinstance(step, dict):
                raise serializers.ValidationError(
                    f"Item {idx} must be a dictionary."
                )
            if "step" not in step or "status" not in step:
                raise serializers.ValidationError(
                    f"Item {idx} must include 'step' and 'status'."
                )
            if step.get("status") not in {"pending", "in_progress", "completed"}:
                raise serializers.ValidationError(
                    f"Item {idx} has invalid status ({step.get('status')})."
                )
        return value

    # --- Object-level validator ---

    def validate(self, attrs):
        if self.instance and 'task_id' in attrs:
            raise serializers.ValidationError(
                {"task_id": "task_id cannot be changed after creation."}
            )
        return attrs

    # --- FK resolution helpers ---

    def _resolve_user_field(self, validated_data, id_field, obj_field):
        """Pop an _id field and resolve it to a User object (or None)."""
        if id_field not in validated_data:
            return
        user_id = validated_data.pop(id_field)
        if user_id is None:
            validated_data[obj_field] = None
            return
        try:
            validated_data[obj_field] = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError({id_field: 'User not found.'})

    def _resolve_task_field(self, validated_data):
        """Pop task_id and resolve it to a Task object (or None)."""
        if 'task_id' not in validated_data:
            return
        task_id = validated_data.pop('task_id')
        if task_id is None:
            validated_data['task'] = None
            return
        try:
            validated_data['task'] = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            raise serializers.ValidationError({'task_id': 'Task not found.'})

    # --- Create / Update ---

    def create(self, validated_data):
        # Auto-set created_by from the authenticated user
        validated_data.pop('created_by_id', None)
        validated_data['created_by'] = self.context['request'].user

        # Resolve FK _id fields → model objects
        self._resolve_task_field(validated_data)
        self._resolve_user_field(validated_data, 'assigned_to_id', 'assigned_to')
        self._resolve_user_field(validated_data, 'reviewed_by_id', 'reviewed_by')

        return super().create(validated_data)

    def update(self, instance, validated_data):
        # task_id is already rejected by validate() — nothing to resolve
        # Resolve user FK _id fields → model objects
        self._resolve_user_field(validated_data, 'created_by_id', 'created_by')
        self._resolve_user_field(validated_data, 'assigned_to_id', 'assigned_to')
        self._resolve_user_field(validated_data, 'reviewed_by_id', 'reviewed_by')

        return super().update(instance, validated_data)
