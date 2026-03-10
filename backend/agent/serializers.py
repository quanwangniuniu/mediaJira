from rest_framework import serializers
from .models import AgentSession, AgentMessage, AgentWorkflowRun, ImportedCSVFile


class AgentMessageSerializer(serializers.ModelSerializer):
    data = serializers.JSONField(source='metadata', read_only=True)

    class Meta:
        model = AgentMessage
        fields = ['id', 'role', 'content', 'message_type', 'data', 'created_at']
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
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class AgentWorkflowRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentWorkflowRun
        fields = [
            'id', 'session', 'spreadsheet', 'decision', 'status',
            'analysis_result', 'created_tasks', 'error_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ImportedCSVFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportedCSVFile
        fields = [
            'id', 'filename', 'original_filename',
            'row_count', 'column_count', 'file_size',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ChatInputSerializer(serializers.Serializer):
    message = serializers.CharField(required=True)
    spreadsheet_id = serializers.IntegerField(required=False, allow_null=True)
    csv_filename = serializers.RegexField(
        r'^[\w\-. ()]+\.(csv|xlsx|xls)$', required=False, allow_null=True,
        error_messages={'invalid': 'Invalid filename format.'}
    )
    file_id = serializers.UUIDField(required=False, allow_null=True)
    action = serializers.ChoiceField(
        choices=['analyze', 'confirm_decision', 'create_tasks'],
        required=False,
        allow_null=True,
    )
