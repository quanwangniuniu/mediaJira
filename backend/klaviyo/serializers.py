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
        read_only_fields = ["id", "email_draft"]


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
    blocks = ContentBlockSerializer(many=True, required=False)

    class Meta:
        model = EmailDraft
        fields = [
            "name",
            "subject",
            "status",
            "blocks",
        ]

    def validate(self, attrs):
        """Validate the entire serializer data"""
        return super().validate(attrs)

    def to_internal_value(self, data):
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        blocks_data = validated_data.pop("blocks", None)
        
        # Update the draft fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update blocks if provided
        # Note: blocks_data can be None (not provided) or [] (empty list, meaning delete all blocks)
        if blocks_data is not None:
            # Delete existing blocks
            instance.blocks.all().delete()
            
            # Create new blocks
            for block_data in blocks_data:
                # Explicitly exclude id and email_draft, even though they should already be filtered in validated_data
                block_data.pop('id', None)
                block_data.pop('email_draft', None)
                
                ContentBlock.objects.create(email_draft=instance, **block_data)

        return instance


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
