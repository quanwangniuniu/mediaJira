from rest_framework import serializers
from .models import SlackWorkspaceConnection, NotificationPreference

class SlackOAuthInitSerializer(serializers.Serializer):
    """
    Serializer for the OAuth initialization URL response.
    """
    url = serializers.URLField(help_text="The Slack OAuth authorization URL.")

class SlackOAuthCallbackSerializer(serializers.Serializer):
    """
    Serializer for the OAuth callback.
    """
    code = serializers.CharField(required=True, help_text="The temporary authorization code from Slack.")

class SlackConnectionStatusSerializer(serializers.ModelSerializer):
    """
    Serializer for exposing the current connection status.
    """
    is_connected = serializers.SerializerMethodField()
    
    class Meta:
        model = SlackWorkspaceConnection
        fields = [
            'is_connected',
            'slack_team_id', 
            'slack_team_name', 
            'default_channel_id', 
            'default_channel_name', 
            'is_active'
        ]
        read_only_fields = fields

    def get_is_connected(self, obj):
        return obj.is_active

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Serializer for managing notification preferences.
    """
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 
            'project', 
            'event_type', 
            'event_type_display',
            'task_status', 
            'slack_channel_id', 
            'slack_channel_name', 
            'is_active'
        ]
        read_only_fields = ['id', 'event_type_display']
    
    def validate(self, data):
        """
        Ensure valid combination of fields (e.g., status only if event_type is STATUS_CHANGE).
        """
        # Additional validation logic can be added here if needed
        return data

class SlackTestNotificationSerializer(serializers.Serializer):
    """
    Serializer for triggering a test notification.
    """
    channel_id = serializers.CharField(required=True, help_text="Slack channel ID to send to.")
    message = serializers.CharField(required=True, help_text="Message content to send.")
