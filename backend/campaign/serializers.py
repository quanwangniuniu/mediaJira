from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    CampaignTask, ExecutionLog, ChannelConfig, ROIAlertTrigger,
    CampaignTaskStatus, OperationEvent, OperationResult, Channel,
    MetricKey, Comparator, AlertAction
)

User = get_user_model()


class CampaignTaskSerializer(serializers.ModelSerializer):
    """Campaign Task Serializer - Full representation"""
    campaign_task_id = serializers.UUIDField(read_only=True)
    created_by = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), write_only=True)
    created_by_display = serializers.SerializerMethodField(read_only=True)
    status = serializers.ChoiceField(choices=CampaignTaskStatus.choices, read_only=True)
    
    class Meta:
        model = CampaignTask
        fields = [
            'campaign_task_id', 'title', 'scheduled_date', 'end_date', 'channel',
            'creative_asset_ids', 'audience_config', 'status', 'platform_status',
            'roi_threshold', 'external_ids_json', 'created_by', 'created_by_display',
            'paused_reason', 'created_at', 'updated_at'
        ]
        read_only_fields = ['campaign_task_id', 'created_at', 'updated_at', 'status']
    
    def get_created_by_display(self, obj):
        """Return user display info"""
        if obj.created_by:
            return {
                'user_id': obj.created_by.id,
                'display_name': getattr(obj.created_by, 'display_name', obj.created_by.username)
            }
        return None


class CampaignTaskCreateSerializer(serializers.ModelSerializer):
    """Campaign Task Create Serializer"""
    created_by = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    
    class Meta:
        model = CampaignTask
        fields = [
            'title', 'scheduled_date', 'end_date', 'channel',
            'creative_asset_ids', 'audience_config', 'status',
            'roi_threshold', 'external_ids_json', 'created_by'
        ]
        extra_kwargs = {
            'status': {'required': False},
        }
    
    def create(self, validated_data):
        """Create campaign task with user from request context"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        elif 'created_by' not in validated_data:
            raise serializers.ValidationError("created_by is required")
        
        return super().create(validated_data)


class CampaignTaskUpdateSerializer(serializers.ModelSerializer):
    """Campaign Task Update Serializer"""
    
    class Meta:
        model = CampaignTask
        fields = [
            'title', 'scheduled_date', 'end_date', 'creative_asset_ids',
            'audience_config', 'roi_threshold', 'paused_reason', 'status'
        ]
    
    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        if instance and instance.status != value:
            # Allow status updates only if they're valid transitions
            # Full validation happens in service layer
            pass
        return value


class ExecutionLogSerializer(serializers.ModelSerializer):
    """Execution Log Serializer"""
    execution_log_id = serializers.UUIDField(read_only=True)
    campaign_task_id = serializers.UUIDField(source='campaign_task.campaign_task_id', read_only=True)
    actor_user_id = serializers.UUIDField(source='actor_user_id.id', read_only=True, allow_null=True)
    
    class Meta:
        model = ExecutionLog
        fields = [
            'execution_log_id', 'campaign_task_id', 'event', 'actor_user_id',
            'timestamp', 'result', 'message', 'details', 'channel_response'
        ]
        read_only_fields = ['execution_log_id', 'campaign_task_id', 'timestamp']


class LaunchRequestSerializer(serializers.Serializer):
    """Launch Request Serializer"""
    dry_run = serializers.BooleanField(default=False, required=False)
    override = serializers.DictField(required=False, allow_null=True)
    external_context = serializers.DictField(required=False, allow_null=True)


class PauseResumeRequestSerializer(serializers.Serializer):
    """Pause Request Serializer (kept name for backward compatibility)"""
    action = serializers.ChoiceField(choices=['pause'], default='pause')
    reason = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class ROIAlertTriggerSerializer(serializers.ModelSerializer):
    """ROI Alert Trigger Serializer - Full representation"""
    roi_alert_trigger_id = serializers.UUIDField(read_only=True)
    campaign_task_id = serializers.UUIDField(source='campaign_task.campaign_task_id', read_only=True)
    
    class Meta:
        model = ROIAlertTrigger
        fields = [
            'roi_alert_trigger_id', 'campaign_task_id', 'metric_key', 'comparator',
            'threshold', 'lookback_minutes', 'action', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['roi_alert_trigger_id', 'created_at', 'updated_at']


class ROIAlertTriggerUpsertSerializer(serializers.ModelSerializer):
    """ROI Alert Trigger Upsert Serializer - For create/update"""
    roi_alert_trigger_id = serializers.UUIDField(required=False, allow_null=True)
    campaign_task_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        model = ROIAlertTrigger
        fields = [
            'roi_alert_trigger_id', 'campaign_task_id', 'metric_key', 'comparator',
            'threshold', 'lookback_minutes', 'action', 'is_active'
        ]
    
    def create(self, validated_data):
        """Create or update ROI alert trigger"""
        campaign_task_id = validated_data.pop('campaign_task_id')
        
        try:
            campaign_task = CampaignTask.objects.get(campaign_task_id=campaign_task_id)
        except CampaignTask.DoesNotExist:
            raise serializers.ValidationError(f"Campaign task {campaign_task_id} not found")
        
        roi_alert_trigger_id = validated_data.pop('roi_alert_trigger_id', None)
        
        if roi_alert_trigger_id:
            # Update existing
            try:
                instance = ROIAlertTrigger.objects.get(roi_alert_trigger_id=roi_alert_trigger_id)
                for key, value in validated_data.items():
                    setattr(instance, key, value)
                instance.save()
                return instance
            except ROIAlertTrigger.DoesNotExist:
                raise serializers.ValidationError(f"ROI alert trigger {roi_alert_trigger_id} not found")
        else:
            # Create new
            validated_data['campaign_task'] = campaign_task
            return super().create(validated_data)


class ExternalStatusSerializer(serializers.Serializer):
    """External Status Serializer"""
    task_id = serializers.UUIDField()
    channel = serializers.ChoiceField(choices=Channel.choices)
    native_status = serializers.CharField(required=False, allow_null=True)
    platform_status = serializers.CharField(required=False, allow_null=True)
    synced_at = serializers.DateTimeField()
    raw = serializers.DictField(required=False, allow_null=True)


class ChannelConfigSerializer(serializers.ModelSerializer):
    """Channel Config Serializer"""
    channel_config_id = serializers.UUIDField(read_only=True)
    team_id = serializers.UUIDField(source='team.id', read_only=True)
    
    class Meta:
        model = ChannelConfig
        fields = [
            'channel_config_id', 'team_id', 'channel', 'auth_token',
            'settings_json', 'last_refreshed', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['channel_config_id', 'created_at', 'updated_at']

