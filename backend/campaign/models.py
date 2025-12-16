from django.db import models
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid

User = get_user_model()


class CampaignTaskStatus(models.TextChoices):
    """Status choices for CampaignTask"""
    SCHEDULED = 'Scheduled', 'Scheduled'
    LAUNCHED = 'Launched', 'Launched'
    PAUSED = 'Paused', 'Paused'
    COMPLETED = 'Completed', 'Completed'
    FAILED = 'Failed', 'Failed'
    ARCHIVED = 'Archived', 'Archived'


class OperationEvent(models.TextChoices):
    """Event types for ExecutionLog"""
    LAUNCH = 'Launch', 'Launch'
    PAUSE = 'Pause', 'Pause'
    RESUME = 'Resume', 'Resume'
    ADJUST = 'Adjust', 'Adjust'
    ALERT_TRIGGER = 'AlertTrigger', 'Alert Trigger'
    METRIC_INGEST = 'MetricIngest', 'Metric Ingest'
    COMPLETE = 'Complete', 'Complete'
    FAIL = 'Fail', 'Fail'


class OperationResult(models.TextChoices):
    """Result types for ExecutionLog"""
    SUCCESS = 'Success', 'Success'
    ERROR = 'Error', 'Error'


class Channel(models.TextChoices):
    """Supported ad channels"""
    GOOGLE_ADS = 'GoogleAds', 'Google Ads'
    FACEBOOK_ADS = 'FacebookAds', 'Facebook Ads'
    TIKTOK_ADS = 'TikTokAds', 'TikTok Ads'


class CampaignTask(models.Model):
    """
    Campaign Task Model - Manages campaign execution tasks across ad channels
    Uses FSM for status transitions
    """
    campaign_task_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Link to generic Task model
    task = models.ForeignKey(
        'task.Task',
        on_delete=models.CASCADE,
        related_name='campaign_tasks',
        null=True,
        blank=True,
        help_text="Reference to generic Task model"
    )
    
    # Basic fields
    title = models.CharField(max_length=255, help_text="Campaign task title")
    scheduled_date = models.DateTimeField(help_text="Scheduled start date/time")
    end_date = models.DateTimeField(null=True, blank=True, help_text="Optional end date/time")
    channel = models.CharField(max_length=20, choices=Channel.choices, help_text="Ad channel")
    
    # JSON fields
    creative_asset_ids = models.JSONField(
        default=list,
        help_text="Array of asset IDs or asset objects"
    )
    audience_config = models.JSONField(
        default=dict,
        help_text="Audience configuration (type-specific)"
    )
    external_ids_json = models.JSONField(
        default=dict,
        null=True,
        blank=True,
        help_text="External platform IDs (campaignId, adSetIds, etc.)"
    )
    
    # Status management
    status = FSMField(
        max_length=20,
        choices=CampaignTaskStatus.choices,
        default=CampaignTaskStatus.SCHEDULED,
        protected=False,
        help_text="Current status of the campaign task"
    )
    platform_status = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Native status from external platform"
    )
    
    # ROI and pause management
    roi_threshold = models.FloatField(null=True, blank=True, help_text="ROI threshold for alerts")
    paused_reason = models.TextField(null=True, blank=True, help_text="Reason for pausing")
    
    # User and team
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_campaign_tasks',
        help_text="User who created the campaign task"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'campaign_task'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['channel']),
            models.Index(fields=['created_by']),
            models.Index(fields=['scheduled_date']),
        ]
    
    def __str__(self):
        return f"CampaignTask {self.campaign_task_id} - {self.title} ({self.status})"
    
    # FSM Transitions
    @transition(field=status, source=CampaignTaskStatus.SCHEDULED, target=CampaignTaskStatus.LAUNCHED)
    def launch(self):
        """Transition from Scheduled to Launched"""
        pass
    
    @transition(field=status, source=CampaignTaskStatus.LAUNCHED, target=CampaignTaskStatus.PAUSED)
    def pause(self, reason=None):
        """Transition from Launched to Paused"""
        if reason:
            self.paused_reason = reason
    
    @transition(field=status, source=CampaignTaskStatus.PAUSED, target=CampaignTaskStatus.COMPLETED)
    def complete(self):
        """Transition from Paused to Completed"""
        if not self.end_date:
            self.end_date = timezone.now()
    
    @transition(
        field=status,
        source=[CampaignTaskStatus.PAUSED, CampaignTaskStatus.SCHEDULED],
        target=CampaignTaskStatus.FAILED
    )
    def fail(self):
        """Transition from Paused or Scheduled to Failed"""
        pass
    
    @transition(
        field=status,
        source=[CampaignTaskStatus.COMPLETED, CampaignTaskStatus.FAILED],
        target=CampaignTaskStatus.ARCHIVED
    )
    def archive(self):
        """Transition to Archived"""
        pass


class ExecutionLog(models.Model):
    """
    Execution Log Model - Audit log for all campaign operations
    """
    execution_log_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    campaign_task = models.ForeignKey(
        CampaignTask,
        on_delete=models.CASCADE,
        related_name='execution_logs',
        help_text="Reference to CampaignTask"
    )
    
    event = models.CharField(
        max_length=20,
        choices=OperationEvent.choices,
        help_text="Type of operation event"
    )
    actor_user_id = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='campaign_actions',
        help_text="User who triggered the action (if applicable)"
    )
    timestamp = models.DateTimeField(default=timezone.now, help_text="Event timestamp")
    result = models.CharField(
        max_length=10,
        choices=OperationResult.choices,
        help_text="Result of the operation"
    )
    message = models.TextField(null=True, blank=True, help_text="Human-readable message")
    details = models.JSONField(
        default=dict,
        null=True,
        blank=True,
        help_text="Normalized metrics snapshot"
    )
    channel_response = models.JSONField(
        default=dict,
        null=True,
        blank=True,
        help_text="Raw platform response payload"
    )
    
    class Meta:
        db_table = 'execution_log'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['campaign_task', '-timestamp']),
            models.Index(fields=['event']),
        ]
    
    def __str__(self):
        return f"ExecutionLog {self.execution_log_id} - {self.event} ({self.result})"


class ChannelConfig(models.Model):
    """
    Channel Configuration Model - Per-team configuration for ad channels
    """
    channel_config_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    team = models.ForeignKey(
        'core.Team',
        on_delete=models.CASCADE,
        related_name='channel_configs',
        help_text="Team this configuration belongs to"
    )
    channel = models.CharField(max_length=20, choices=Channel.choices, help_text="Ad channel")
    
    # Auth and settings (placeholder for OAuth - managed elsewhere)
    auth_token = models.CharField(
        max_length=500,
        blank=True,
        help_text="Placeholder; OAuth managed elsewhere"
    )
    settings_json = models.JSONField(
        default=dict,
        help_text="Channel-specific settings (account_id, timezone, currency, etc.)"
    )
    
    last_refreshed = models.DateTimeField(null=True, blank=True, help_text="Last token refresh time")
    is_active = models.BooleanField(default=True, help_text="Whether this config is active")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'channel_config'
        unique_together = [['team', 'channel']]
        indexes = [
            models.Index(fields=['team', 'channel']),
        ]
    
    def __str__(self):
        return f"ChannelConfig {self.channel_config_id} - {self.team.name} / {self.channel}"


class MetricKey(models.TextChoices):
    """Metric keys for ROI alerts"""
    ROAS = 'roas', 'ROAS'
    ROI = 'roi', 'ROI'
    CPA = 'cpa', 'CPA'
    CTR = 'ctr', 'CTR'
    CPC = 'cpc', 'CPC'


class Comparator(models.TextChoices):
    """Comparators for ROI alerts"""
    LT = '<', '<'
    LTE = '<=', '<='
    GT = '>', '>'
    GTE = '>=', '>='
    EQ = '=', '='


class AlertAction(models.TextChoices):
    """Actions for ROI alerts"""
    NOTIFY_ONLY = 'NotifyOnly', 'Notify Only'
    AUTO_PAUSE = 'AutoPause', 'Auto Pause'


class ROIAlertTrigger(models.Model):
    """
    ROI Alert Trigger Model - Defines conditions for ROI-based alerts
    """
    roi_alert_trigger_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    campaign_task = models.ForeignKey(
        CampaignTask,
        on_delete=models.CASCADE,
        related_name='roi_alerts',
        help_text="Reference to CampaignTask"
    )
    
    metric_key = models.CharField(max_length=10, choices=MetricKey.choices, help_text="Metric to monitor")
    comparator = models.CharField(max_length=2, choices=Comparator.choices, help_text="Comparison operator")
    threshold = models.FloatField(help_text="Threshold value")
    lookback_minutes = models.IntegerField(help_text="Lookback window in minutes", default=60)
    action = models.CharField(max_length=15, choices=AlertAction.choices, help_text="Action to take")
    is_active = models.BooleanField(default=True, help_text="Whether this alert is active")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'roi_alert_trigger'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['campaign_task', 'is_active']),
        ]
    
    def __str__(self):
        return f"ROIAlertTrigger {self.roi_alert_trigger_id} - {self.metric_key} {self.comparator} {self.threshold}"
