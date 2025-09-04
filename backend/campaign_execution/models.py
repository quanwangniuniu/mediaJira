# apps/campaign_execution/models.py
from django.db import models
from django.db import settings
from django_fsm import FSMField, transition



class ChannelChoices(models.TextChoices):
    GOOGLE = 'google', 'Google Ads'
    FACEBOOK = 'facebook', 'Facebook Ads'
    TIKTOK = 'tiktok', 'TikTok Ads'
    INSTAGRAM = 'instagram', 'Instagram Ads'
    YOUTUBE = 'youtube', 'YouTube Ads'
    TWITTER = 'twitter', 'Twitter Ads'

class CampaignStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Scheduled'
    LAUNCHED = 'launched', 'Launched'
    PAUSED = 'paused', 'Paused'
    COMPLETED = 'completed', 'Completed'
    FAILED = 'failed', 'Failed'
    ARCHIVED = 'archived', 'Archived'

class ExecutionEvent(models.TextChoices):
    LAUNCH = 'launch', 'Launch'
    PAUSE = 'pause', 'Pause'
    RESUME = 'resume', 'Resume'
    ADJUST = 'adjust', 'Adjust'
    ALERT_TRIGGER = 'alert_trigger', 'AlertTrigger'
    METRIC_INGEST = 'metric_ingest', 'MetricIngest'
    COMPLETE = 'complete', 'Complete'
    FAIL = 'fail', 'Fail'
 
class ExecutionResult(models.TextChoices):
    SUCCESS = 'success', 'Success'
    ERROR = 'error', 'Error'
    
class MetricKey(models.TextChoices):
    ROI = 'roi', 'ROI'
    CTR = 'ctr', 'CTR'
    CPC = 'cpc', 'CPC'
    CLICKS = 'clicks', 'Clicks'

class ComparatorOperator(models.TextChoices):
        LT = '<', '<'
        LTE = '<=', '<='
        GT = '>', '>'
        GTE = '>=', '>='
        EQ = '=', '='

class AlertAction(models.TextChoices):
    NOTIFY_ONLY = 'notify_only', 'NotifyOnly'
    AUTO_PAUSE = 'auto_pause', 'AutoPause'



# ---- CampaignTask ----
class CampaignTask(models.Model):

    campaign_task_id = models.BigAutoField(primary_key=True)

    title = models.CharField(max_length=255)
    scheduled_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    channel = models.CharField(max_length=32, choices=ChannelChoices.choices)

    creative_asset_ids = models.JSONField(default=list, blank=True)
    audience_config = models.JSONField(default=dict, blank=True)

    status = FSMField(default=CampaignStatus.SCHEDULED, choices=CampaignStatus.choices, protected=True)
    platform_status = models.CharField(max_length=64, null=True, blank=True)  

    roi_threshold = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)

    # {accountId, campaignId, adSetIds/adGroupIds, adIds, assetIds}
    external_ids_json = models.JSONField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_campaign_tasks'
    )
    paused_reason = models.CharField(max_length=255, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['channel']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
        db_table = 'campaign_task'

    # ---- FSM transitions aligned to your enum names ----
    @transition(field=status, source=CampaignStatus.SCHEDULED, target=CampaignStatus.IN_PROGRESS)
    def mark_launched(self): pass

    @transition(field=status, source=CampaignStatus.IN_PROGRESS, target=CampaignStatus.PAUSED)
    def mark_paused(self): pass

    @transition(field=status, source=CampaignStatus.PAUSED, target=CampaignStatus.IN_PROGRESS)
    def mark_resumed(self): pass

    @transition(field=status, source=CampaignStatus.IN_PROGRESS, target=CampaignStatus.COMPLETED)
    def mark_completed(self): pass

    @transition(field=status, source=CampaignStatus.IN_PROGRESS, target=CampaignStatus.FAILED)
    def mark_failed(self): pass

    @transition(field=status, source='*', target=CampaignStatus.ARCHIVED)
    def mark_archived(self): pass


# ---- ChannelConfig ----
class ChannelConfig(models.Model):
    channel_config_id = models.BigAutoField(primary_key=True)

    team = models.ForeignKey('org.Team', on_delete=models.CASCADE, related_name='channel_configs')  # adjust app label
    channel = models.CharField(max_length=32, choices=ChannelChoices.choices)

    auth_token = models.TextField(null=True, blank=True)  # placeholder, real OAuth lives elsewhere
    settings_json = models.JSONField(default=dict, blank=True)  # include account identifier, timezone/currency

    last_refreshed = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['team', 'channel'], name='uniq_team_channel')
        ]
        indexes = [models.Index(fields=['team', 'channel'])]
        db_table = 'channel_config'


# ---- ExecutionLog (1:n to CampaignTask) ----
class ExecutionLog(models.Model):
    execution_log_id = models.BigAutoField(primary_key=True)

    campaign_task = models.ForeignKey(CampaignTask, on_delete=models.CASCADE, related_name='logs')

    event = models.CharField(max_length=32, choices=ExecutionEvent.choices)
    actor_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='campaign_execution_logs')

    timestamp = models.DateTimeField(auto_now_add=True)
    result = models.CharField(max_length=16, choices=ExecutionResult.choices, default=ExecutionResult.SUCCESS)

    message = models.CharField(max_length=512, null=True, blank=True)

    # normalized metrics (e.g., {"spend": 12.3, "roi": 1.4})
    details = models.JSONField(default=dict, blank=True)

    # raw platform payload for forensic/debugging
    channel_response = models.JSONField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['campaign_task', '-timestamp']),
            models.Index(fields=['event']),
        ]
        db_table = 'execution_log'


# ---- ROIAlertTrigger ----
class ROIAlertTrigger(models.Model):
    roi_alert_trigger_id = models.BigAutoField(primary_key=True)

    campaign_task = models.ForeignKey(CampaignTask, on_delete=models.CASCADE, related_name='roi_triggers')

    metric_key = models.CharField(max_length=16, choices=MetricKey.choices)
    comparator = models.CharField(max_length=2, choices=ComparatorOp.choices)
    threshold = models.DecimalField(max_digits=12, decimal_places=4)
    lookback_minutes = models.PositiveIntegerField(default=60)

    action = models.CharField(max_length=16, choices=AlertAction.choices, default=AlertAction.NOTIFY_ONLY)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['campaign_task', 'is_active']),
            models.Index(fields=['metric_key']),
        ]
        db_table = 'roi_alert_trigger'


# ---- TaskDependency ----
class TaskDependency(models.Model):
    task_dependency_id = models.BigAutoField(primary_key=True)

    # If BudgetRequest has a "task_id" field 

    predecessor_task_id = models.BigIntegerField() 
    successor_task = models.ForeignKey(CampaignTask, to_field='campaign_task_id',
                                       db_column='successor_task_id', on_delete=models.CASCADE,
                                       related_name='blocked_by')

    relation = models.CharField(max_length=16, default='blocks')  
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['predecessor_task_id', 'successor_task'])]
        db_table = 'task_dependency'