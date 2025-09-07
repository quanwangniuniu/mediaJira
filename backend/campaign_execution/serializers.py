from rest_framework import serializers
from .models import (
    CampaignTask, ChannelConfig, ExecutionLog, ROIAlertTrigger,
    ChannelChoices, CampaignStatus, ExecutionEvent, ExecutionResult,
    MetricKey, ComparatorOperator, AlertAction
)


class CampaignTaskSerializer(serializers.ModelSerializer):
    """Serializer for CampaignTask model."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = CampaignTask
        fields = [
            'campaign_task_id', 'title', 'scheduled_date', 'end_date', 'channel',
            'channel_display', 'creative_asset_ids', 'audience_config', 'status',
            'status_display', 'platform_status', 'roi_threshold', 'external_ids_json',
            'created_by', 'created_by_name', 'paused_reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['campaign_task_id', 'created_at', 'updated_at', 'external_ids_json']
    
    def validate_scheduled_date(self, value):
        """Validate that scheduled_date is in the future."""
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError("Scheduled date must be in the future.")
        return value
    
    def validate(self, data):
        """Validate the entire object."""
        if data.get('end_date') and data.get('scheduled_date'):
            if data['end_date'] <= data['scheduled_date']:
                raise serializers.ValidationError("End date must be after scheduled date.")
        return data


class ChannelConfigSerializer(serializers.ModelSerializer):
    """Serializer for ChannelConfig model."""
    
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = ChannelConfig
        fields = [
            'channel_config_id', 'team', 'team_name', 'channel', 'channel_display',
            'auth_token', 'settings_json', 'last_refreshed', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['channel_config_id', 'created_at', 'updated_at']
    
    def validate_channel(self, value):
        """Validate channel choice."""
        if value not in [choice[0] for choice in ChannelChoices.choices]:
            raise serializers.ValidationError(f"Invalid channel: {value}")
        return value


class ExecutionLogSerializer(serializers.ModelSerializer):
    """Serializer for ExecutionLog model."""
    
    event_display = serializers.CharField(source='get_event_display', read_only=True)
    result_display = serializers.CharField(source='get_result_display', read_only=True)
    actor_name = serializers.CharField(source='actor_user.get_full_name', read_only=True)
    campaign_title = serializers.CharField(source='campaign_task.title', read_only=True)
    
    class Meta:
        model = ExecutionLog
        fields = [
            'execution_log_id', 'campaign_task', 'campaign_title', 'event',
            'event_display', 'actor_user', 'actor_name', 'timestamp', 'result',
            'result_display', 'message', 'details', 'channel_response'
        ]
        read_only_fields = ['execution_log_id', 'timestamp']


class ROIAlertTriggerSerializer(serializers.ModelSerializer):
    """Serializer for ROIAlertTrigger model."""
    
    metric_key_display = serializers.CharField(source='get_metric_key_display', read_only=True)
    comparator_display = serializers.CharField(source='get_comparator_display', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    campaign_title = serializers.CharField(source='campaign_task.title', read_only=True)
    
    class Meta:
        model = ROIAlertTrigger
        fields = [
            'roi_alert_trigger_id', 'campaign_task', 'campaign_title', 'metric_key',
            'metric_key_display', 'comparator', 'comparator_display', 'threshold',
            'lookback_minutes', 'action', 'action_display', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['roi_alert_trigger_id', 'created_at', 'updated_at']
    
    def validate_metric_key(self, value):
        """Validate metric key choice."""
        if value not in [choice[0] for choice in MetricKey.choices]:
            raise serializers.ValidationError(f"Invalid metric key: {value}")
        return value
    
    def validate_comparator(self, value):
        """Validate comparator operator."""
        if value not in [choice[0] for choice in ComparatorOperator.choices]:
            raise serializers.ValidationError(f"Invalid comparator: {value}")
        return value
    
    def validate_action(self, value):
        """Validate alert action."""
        if value not in [choice[0] for choice in AlertAction.choices]:
            raise serializers.ValidationError(f"Invalid action: {value}")
        return value


class CampaignLaunchSerializer(serializers.Serializer):
    """Serializer for campaign launch requests."""
    
    def validate(self, data):
        """Validate launch request."""
        # Additional validation can be added here
        return data


class CampaignPauseSerializer(serializers.Serializer):
    """Serializer for campaign pause requests."""
    
    reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    
    def validate_reason(self, value):
        """Validate pause reason."""
        if value and len(value.strip()) == 0:
            return None
        return value


class CampaignStatusSerializer(serializers.Serializer):
    """Serializer for campaign status responses."""
    
    campaign_id = serializers.IntegerField()
    status = serializers.CharField()
    platform_status = serializers.CharField(allow_null=True)
    metrics = serializers.DictField()
    last_updated = serializers.DateTimeField()
