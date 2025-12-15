"""
Tests for execution logging
Tests logging and traceability by task ID
"""
import pytest
from django.utils import timezone
from campaign.models import (
    CampaignTask, ExecutionLog, OperationEvent, OperationResult
)
from campaign.services import CampaignService


@pytest.mark.django_db
class TestExecutionLogCreation:
    """Test ExecutionLog creation"""
    
    def test_create_execution_log(self, campaign_task_scheduled, user):
        """Test creating an execution log"""
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user,
            message='Test launch'
        )
        
        assert log.event == OperationEvent.LAUNCH
        assert log.result == OperationResult.SUCCESS
        assert log.message == 'Test launch'
        assert log.actor_user_id == user
        assert log.campaign_task == campaign_task_scheduled
        assert log.timestamp is not None
    
    def test_create_execution_log_with_details(self, campaign_task_scheduled, user):
        """Test creating execution log with details"""
        details = {
            'external_ids': {'campaignId': 'test_123'},
            'metrics': {'impressions': 1000}
        }
        
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.METRIC_INGEST,
            result=OperationResult.SUCCESS,
            actor_user_id=user,
            details=details
        )
        
        assert log.details == details
        assert log.event == OperationEvent.METRIC_INGEST
    
    def test_create_execution_log_with_channel_response(self, campaign_task_scheduled, user):
        """Test creating execution log with channel response"""
        channel_response = {
            'campaignId': 'fb_123',
            'adSetIds': ['adset_1', 'adset_2']
        }
        
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user,
            channel_response=channel_response
        )
        
        assert log.channel_response == channel_response


@pytest.mark.django_db
class TestLogTraceability:
    """Test log traceability by campaign_task_id"""
    
    def test_logs_traceable_by_task_id(self, campaign_task_scheduled, user):
        """Test logs are traceable by campaign_task_id"""
        # Create multiple logs
        CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user,
            message='Launch 1'
        )
        
        CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.METRIC_INGEST,
            result=OperationResult.SUCCESS,
            actor_user_id=user,
            message='Metric ingest'
        )
        
        # Query logs by campaign_task_id
        logs = ExecutionLog.objects.filter(
            campaign_task=campaign_task_scheduled
        ).order_by('timestamp')
        
        assert logs.count() == 2
        assert logs[0].event == OperationEvent.LAUNCH
        assert logs[1].event == OperationEvent.METRIC_INGEST
    
    def test_logs_separated_by_task(self, campaign_task_scheduled, campaign_task_launched, user):
        """Test logs are separated by different campaign tasks"""
        # Create logs for first task
        CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        # Create logs for second task
        CampaignService.log_execution_event(
            campaign_task=campaign_task_launched,
            event=OperationEvent.PAUSE,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        # Query logs for first task
        logs_task1 = ExecutionLog.objects.filter(
            campaign_task=campaign_task_scheduled
        )
        assert logs_task1.count() == 1
        assert logs_task1.first().event == OperationEvent.LAUNCH
        
        # Query logs for second task
        logs_task2 = ExecutionLog.objects.filter(
            campaign_task=campaign_task_launched
        )
        assert logs_task2.count() == 1
        assert logs_task2.first().event == OperationEvent.PAUSE


@pytest.mark.django_db
class TestLogChannelErrorMessages:
    """Test logs contain channel error messages"""
    
    def test_log_contains_channel_error(self, campaign_task_scheduled, user):
        """Test log contains channel error message"""
        error_message = 'Channel API error: Quota exceeded'
        channel_response = {
            'error': 'QUOTA_EXCEEDED',
            'message': error_message
        }
        
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.ERROR,
            actor_user_id=user,
            message=error_message,
            channel_response=channel_response
        )
        
        assert log.result == OperationResult.ERROR
        assert error_message in log.message
        assert log.channel_response == channel_response
    
    def test_log_contains_channel_timeout(self, campaign_task_scheduled, user):
        """Test log contains channel timeout error"""
        error_message = 'Channel API timeout after 30s'
        
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.ERROR,
            actor_user_id=user,
            message=error_message
        )
        
        assert log.result == OperationResult.ERROR
        assert 'timeout' in log.message.lower()


@pytest.mark.django_db
class TestLogActorInformation:
    """Test logs contain actor information"""
    
    def test_log_contains_actor_user(self, campaign_task_scheduled, user):
        """Test log contains actor user information"""
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        assert log.actor_user_id == user
        assert log.actor_user_id.id == user.id
    
    def test_log_without_actor_user(self, campaign_task_scheduled):
        """Test log can be created without actor user (system action)"""
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.ALERT_TRIGGER,
            result=OperationResult.SUCCESS,
            actor_user_id=None,
            message='System-triggered alert'
        )
        
        assert log.actor_user_id is None
        assert log.message == 'System-triggered alert'


@pytest.mark.django_db
class TestLogTimestamps:
    """Test log timestamps"""
    
    def test_log_has_timestamp(self, campaign_task_scheduled, user):
        """Test log has timestamp"""
        before = timezone.now()
        
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        after = timezone.now()
        
        assert log.timestamp is not None
        assert before <= log.timestamp <= after
    
    def test_logs_ordered_by_timestamp(self, campaign_task_scheduled, user):
        """Test logs are ordered by timestamp"""
        # Create logs with slight delay
        log1 = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        import time
        time.sleep(0.01)  # Small delay
        
        log2 = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.METRIC_INGEST,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        # Query logs ordered by timestamp
        logs = ExecutionLog.objects.filter(
            campaign_task=campaign_task_scheduled
        ).order_by('timestamp')
        
        assert logs.count() == 2
        assert logs[0].timestamp <= logs[1].timestamp


@pytest.mark.django_db
class TestLogEventTypes:
    """Test different event types are logged"""
    
    def test_log_launch_event(self, campaign_task_scheduled, user):
        """Test launch event is logged"""
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_scheduled,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        assert log.event == OperationEvent.LAUNCH
    
    def test_log_pause_event(self, campaign_task_launched, user):
        """Test pause event is logged"""
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_launched,
            event=OperationEvent.PAUSE,
            result=OperationResult.SUCCESS,
            actor_user_id=user
        )
        
        assert log.event == OperationEvent.PAUSE
    
    def test_log_alert_trigger_event(self, campaign_task_launched, user):
        """Test alert trigger event is logged"""
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_launched,
            event=OperationEvent.ALERT_TRIGGER,
            result=OperationResult.SUCCESS,
            actor_user_id=user,
            details={'metric_key': 'roas', 'value': 1.5}
        )
        
        assert log.event == OperationEvent.ALERT_TRIGGER
        assert 'metric_key' in log.details
    
    def test_log_fail_event(self, campaign_task_launched, user):
        """Test fail event is logged"""
        log = CampaignService.log_execution_event(
            campaign_task=campaign_task_launched,
            event=OperationEvent.FAIL,
            result=OperationResult.ERROR,
            actor_user_id=user,
            message='Campaign failed'
        )
        
        assert log.event == OperationEvent.FAIL
        assert log.result == OperationResult.ERROR

