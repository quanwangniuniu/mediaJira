import json

from django.shortcuts import get_object_or_404
from rest_framework import serializers

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
from meetings.action_item_conversion import action_item_has_task


class MeetingSerializer(serializers.ModelSerializer):
    """
    Optional write-only participant_user_ids on create — see MeetingViewSet.perform_create.
    """

    participant_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Meeting
        fields = [
            "id",
            "project",
            "title",
            "meeting_type",
            "objective",
            "scheduled_date",
            "scheduled_time",
            "external_reference",
            "layout_config",
            "status",
            "participant_user_ids",
        ]
        read_only_fields = ["id", "project"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        lc = data.get("layout_config")
        if lc is None:
            data["layout_config"] = []
        elif isinstance(lc, (list, dict)):
            pass
        else:
            data["layout_config"] = []
        return data

    def validate_layout_config(self, value):
        if value is None:
            return []
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            blocks = value.get("blocks")
            if not isinstance(blocks, list):
                raise serializers.ValidationError(
                    "layout_config.blocks must be a list when layout_config is an object."
                )
            nested = value.get("nestedSections")
            if nested is not None and not isinstance(nested, list):
                raise serializers.ValidationError(
                    "layout_config.nestedSections must be a list or omitted."
                )
            try:
                json.dumps(value)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError(
                    "layout_config must be JSON-serializable."
                ) from exc
            return value
        raise serializers.ValidationError(
            "layout_config must be a list of blocks or an object with a blocks list."
        )

    def update(self, instance, validated_data):
        # Participants are managed via the participants sub-resource
        validated_data.pop("participant_user_ids", None)
        return super().update(instance, validated_data)


class AgendaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgendaItem
        fields = ["id", "meeting", "content", "order_index", "is_priority"]
        read_only_fields = ["id", "meeting"]


class ParticipantLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipantLink
        fields = ["id", "meeting", "user", "role"]
        read_only_fields = ["id", "meeting"]

    def validate(self, attrs):
        """
        Enforce unique (meeting, user) at the serializer level so the API
        returns a 400 ValidationError instead of a database IntegrityError.
        """

        meeting = self.context.get("meeting")
        user = attrs.get("user")

        if meeting and user:
            exists_qs = ParticipantLink.objects.filter(meeting=meeting, user=user)
            if self.instance is not None:
                exists_qs = exists_qs.exclude(pk=self.instance.pk)

            if exists_qs.exists():
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            "Participant with this user already exists for this meeting."
                        ]
                    }
                )

        return attrs


class ArtifactLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtifactLink
        fields = ["id", "meeting", "artifact_type", "artifact_id"]
        read_only_fields = ["id", "meeting"]


class MeetingTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingTemplate
        fields = ["id", "name", "layout_config", "created_at", "updated_at", "user"]
        read_only_fields = ["id", "created_at", "updated_at", "user"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        lc = data.get("layout_config")
        if lc is None:
            data["layout_config"] = {}
        return data

    def validate_layout_config(self, value):
        if value is None:
            return {}
        if isinstance(value, list):
            return {"blocks": value}
        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "layout_config must be a JSON object (e.g. {blocks, nestedSections}) or null."
            )
        try:
            json.dumps(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                "layout_config must be JSON-serializable (no functions or circular references)."
            )
        return value


class MeetingDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = MeetingDocument
        fields = [
            "id",
            "meeting",
            "content",
            "yjs_state",
            "last_edited_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "meeting", "last_edited_by", "created_at", "updated_at"]


class MeetingActionItemSerializer(serializers.ModelSerializer):
    """Action items for a meeting; `has_task` indicates conversion already occurred."""

    has_task = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MeetingActionItem
        fields = ["id", "meeting", "title", "description", "order_index", "has_task"]
        read_only_fields = ["id", "meeting", "has_task"]

    def get_has_task(self, obj: MeetingActionItem) -> bool:
        return action_item_has_task(obj.id)


class ConvertActionItemToTaskSerializer(serializers.Serializer):
    """Payload for POST .../action-items/{id}/convert-to-task/."""

    type = serializers.CharField(required=True)
    priority = serializers.CharField(required=True)
    owner_id = serializers.IntegerField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    summary = serializers.CharField(required=False, allow_blank=True, default="")
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    create_as_draft = serializers.BooleanField(required=False, default=True)


class BulkConvertActionItemsSerializer(serializers.Serializer):
    """Payload for POST .../action-items/bulk-convert-to-tasks/."""

    action_item_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )
    type = serializers.CharField(required=True)
    priority = serializers.CharField(required=True)
    owner_id = serializers.IntegerField(required=False, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    create_as_draft = serializers.BooleanField(required=False, default=True)

