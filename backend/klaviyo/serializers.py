from rest_framework import serializers

from .models import (
    EmailDraft, 
    ContentBlock, 
    Workflow,
    WorkflowExecutionLog, 
)


# ------------------------------------------------------------
#  ContentBlock Serializer
# ------------------------------------------------------------
class ContentBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentBlock
        fields = [
            "id",
            "email_draft",
            "block_type",
            "content",
            "order",
        ]


# ------------------------------------------------------------
# EmailDraft - Read Serializer (with nested blocks)
# ------------------------------------------------------------
class EmailDraftSerializer(serializers.ModelSerializer):
    blocks = ContentBlockSerializer(many=True, read_only=True)

    class Meta:
        model = EmailDraft
        fields = [
            "id",
            "user",
            "name",
            "subject",
            "status",
            "created_at",
            "updated_at",
            "is_deleted",
            "blocks",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
        ]


# ------------------------------------------------------------
# EmailDraft - Create Serializer (with optional nested blocks)
# ------------------------------------------------------------
class EmailDraftCreateSerializer(serializers.ModelSerializer):
    blocks = ContentBlockSerializer(many=True, required=False)

    class Meta:
        model = EmailDraft
        fields = [
            "user",
            "name",
            "subject",
            "status",
            "blocks",
        ]

    def create(self, validated_data):
        blocks_data = validated_data.pop("blocks", [])
        draft = EmailDraft.objects.create(**validated_data)

        for block in blocks_data:
            ContentBlock.objects.create(email_draft=draft, **block)

        return draft


# ------------------------------------------------------------
# EmailDraft - Update Serializer
# ------------------------------------------------------------
class EmailDraftUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailDraft
        fields = [
            "name",
            "subject",
            "status",
        ]


# ------------------------------------------------------------
# Workflow Serializer (read)
# ------------------------------------------------------------
class WorkflowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = [
            "id",
            "name",
            "is_active",
            "created_at",
            "updated_at",
            "is_deleted",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# ------------------------------------------------------------
# Workflow Create Serializer
# ------------------------------------------------------------
class WorkflowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workflow
        fields = [
            "name",
            "is_active",
        ]


# ------------------------------------------------------------
# Workflow Execution Logs
# ------------------------------------------------------------
class WorkflowExecutionLogSerializer(serializers.ModelSerializer):
    workflow = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = WorkflowExecutionLog
        fields = [
            "id",
            "workflow",
            "event",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
