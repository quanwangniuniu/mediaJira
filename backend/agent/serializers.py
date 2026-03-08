from rest_framework import serializers
from .models import AgentSession, AgentMessage, AgentWorkflowRun


class AgentMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentMessage
        fields = ['id', 'role', 'content', 'message_type', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']


class AgentSessionListSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = AgentSession
        fields = ['id', 'title', 'status', 'created_at', 'message_count']
        read_only_fields = ['id', 'created_at']

    def get_message_count(self, obj):
        return obj.messages.count()


class AgentSessionDetailSerializer(serializers.ModelSerializer):
    messages = AgentMessageSerializer(many=True, read_only=True)

    class Meta:
        model = AgentSession
        fields = ['id', 'title', 'status', 'created_at', 'updated_at', 'messages']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AgentWorkflowRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentWorkflowRun
        fields = [
            'id', 'session', 'spreadsheet', 'decision', 'status',
            'analysis_result', 'created_tasks', 'error_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ChatInputSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)
    spreadsheet_id = serializers.IntegerField(required=False, allow_null=True)
    action = serializers.ChoiceField(
        choices=['analyze', 'confirm_decision', 'create_tasks'],
        required=False,
        allow_null=True,
    )
