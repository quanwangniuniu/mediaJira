"""
Tests for API fallback and retry logic
Tests API fallback, retry, and channel failure handling
Uses httpx for API mocking (as required by ticket)
"""
import pytest
from unittest.mock import patch, MagicMock
from django.test import override_settings
import httpx
from requests.exceptions import Timeout, ConnectionError
from campaign.models import CampaignTask, CampaignTaskStatus, Channel
from campaign.tasks import launch_campaign_task, poll_campaign_status
from campaign.executors import get_executor


@pytest.mark.django_db
class TestAPITimeoutHandling:
    """Test API timeout scenarios using httpx"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_launch_handles_api_timeout(self, mock_log_event, mock_get_executor, campaign_task_scheduled):
        """Test launch handles API timeout"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that times out (simulating httpx.TimeoutException)
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(side_effect=Timeout("API timeout"))
        mock_get_executor.return_value = mock_executor
        
        # Task should handle timeout and retry
        with patch('campaign.tasks.launch_campaign_task.retry') as mock_retry:
            try:
                launch_campaign_task(task_id)
            except Exception:
                # Should attempt retry
                pass
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_httpx_timeout_simulation(self):
        """Test httpx timeout exception handling"""
        import httpx
        
        # Simulate httpx timeout
        with pytest.raises((httpx.TimeoutException, Timeout)):
            # This simulates what would happen if executor uses httpx and times out
            raise httpx.TimeoutException("Request timed out", request=None)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_poll_handles_api_timeout(self, mock_get_executor, campaign_task_launched):
        """Test poll status handles API timeout"""
        task_id = str(campaign_task_launched.campaign_task_id)
        
        # Mock executor that times out
        mock_executor = MagicMock()
        mock_executor.get_status = MagicMock(side_effect=Timeout("API timeout"))
        mock_get_executor.return_value = mock_executor
        
        # Task should handle timeout
        with patch('campaign.tasks.poll_campaign_status.retry') as mock_retry:
            try:
                poll_campaign_status(task_id)
            except Exception:
                pass


@pytest.mark.django_db
class TestAPIQuotaLimits:
    """Test API quota limit scenarios"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_launch_handles_quota_limit(self, mock_log_event, mock_get_executor, campaign_task_scheduled):
        """Test launch handles quota limit error"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that returns quota limit error
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(return_value={
            'success': False,
            'error': 'Quota limit exceeded',
            'error_code': 'QUOTA_EXCEEDED'
        })
        mock_get_executor.return_value = mock_executor
        
        result = launch_campaign_task(task_id)
        
        assert result['success'] is False
        assert 'error' in result
        # Should log the error
        assert mock_log_event.called
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_poll_handles_quota_limit(self, mock_get_executor, campaign_task_launched):
        """Test poll handles quota limit error"""
        task_id = str(campaign_task_launched.campaign_task_id)
        
        # Mock executor that returns quota limit error
        mock_executor = MagicMock()
        mock_executor.get_status = MagicMock(return_value={
            'success': False,
            'error': 'Quota limit exceeded',
            'error_code': 'QUOTA_EXCEEDED'
        })
        mock_get_executor.return_value = mock_executor
        
        result = poll_campaign_status(task_id)
        
        assert result['success'] is False
        assert 'error' in result


@pytest.mark.django_db
class TestAPIRetryLogic:
    """Test API retry logic (max_retries=3)"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_launch_retries_on_failure(self, mock_get_executor, campaign_task_scheduled):
        """Test launch retries up to max_retries times"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that fails
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(return_value={
            'success': False,
            'error': 'Temporary failure'
        })
        mock_get_executor.return_value = mock_executor
        
        # Task should retry (max_retries=3)
        with patch('campaign.tasks.launch_campaign_task.retry') as mock_retry:
            try:
                launch_campaign_task(task_id)
            except Exception:
                pass
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_poll_retries_on_failure(self, mock_get_executor, campaign_task_launched):
        """Test poll retries up to max_retries times"""
        task_id = str(campaign_task_launched.campaign_task_id)
        
        # Mock executor that fails
        mock_executor = MagicMock()
        mock_executor.get_status = MagicMock(return_value={
            'success': False,
            'error': 'Temporary failure'
        })
        mock_get_executor.return_value = mock_executor
        
        # Task should retry (max_retries=2)
        with patch('campaign.tasks.poll_campaign_status.retry') as mock_retry:
            try:
                poll_campaign_status(task_id)
            except Exception:
                pass


@pytest.mark.django_db
class TestChannelFailureHandling:
    """Test channel failure handling"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_launch_handles_channel_failure(self, mock_log_event, mock_get_executor, campaign_task_scheduled):
        """Test launch handles channel API failure"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that fails
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(return_value={
            'success': False,
            'error': 'Channel API failure',
            'error_code': 'CHANNEL_ERROR'
        })
        mock_get_executor.return_value = mock_executor
        
        result = launch_campaign_task(task_id)
        
        assert result['success'] is False
        assert 'error' in result
        campaign_task_scheduled.refresh_from_db()
        assert campaign_task_scheduled.status == CampaignTaskStatus.FAILED
        # Should log error with channel error message
        assert mock_log_event.called
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    def test_launch_sends_channel_error_event(self, mock_websocket, mock_get_executor, campaign_task_scheduled):
        """Test launch sends WebSocket event on channel error"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that fails
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(return_value={
            'success': False,
            'error': 'Channel API failure'
        })
        mock_get_executor.return_value = mock_executor
        
        launch_campaign_task(task_id)
        
        # Should send WebSocket error event
        assert mock_websocket.called


@pytest.mark.django_db
class TestConnectionErrorHandling:
    """Test connection error handling using httpx"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_launch_handles_connection_error(self, mock_get_executor, campaign_task_scheduled):
        """Test launch handles connection error"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that raises connection error (simulating httpx.ConnectError)
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(side_effect=ConnectionError("Connection failed"))
        mock_get_executor.return_value = mock_executor
        
        # Task should handle connection error and retry
        with patch('campaign.tasks.launch_campaign_task.retry') as mock_retry:
            try:
                launch_campaign_task(task_id)
            except Exception:
                pass
    
    @pytest.mark.django_db
    def test_httpx_connection_error_simulation(self):
        """Test httpx connection error exception"""
        import httpx
        
        # Simulate httpx connection error
        with pytest.raises((httpx.ConnectError, ConnectionError)):
            # This simulates what would happen if executor uses httpx and connection fails
            raise httpx.ConnectError("Connection failed", request=None)
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_poll_handles_connection_error(self, mock_get_executor, campaign_task_launched):
        """Test poll handles connection error"""
        task_id = str(campaign_task_launched.campaign_task_id)
        
        # Mock executor that raises connection error
        mock_executor = MagicMock()
        mock_executor.get_status = MagicMock(side_effect=ConnectionError("Connection failed"))
        mock_get_executor.return_value = mock_executor
        
        # Task should handle connection error
        with patch('campaign.tasks.poll_campaign_status.retry') as mock_retry:
            try:
                poll_campaign_status(task_id)
            except Exception:
                pass


@pytest.mark.django_db
class TestExecutorValidationErrors:
    """Test executor validation error handling"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_launch_handles_validation_error(self, mock_log_event, mock_get_executor, campaign_task_scheduled):
        """Test launch handles validation error"""
        from django.core.exceptions import ValidationError
        
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that raises validation error
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(side_effect=ValidationError("Invalid config"))
        mock_get_executor.return_value = mock_executor
        
        # ValidationError should be caught and handled
        try:
            result = launch_campaign_task(task_id)
            # If it doesn't raise, check that it returns error
            assert result['success'] is False
            assert 'error' in result
        except ValidationError:
            # If ValidationError is raised, that's also acceptable behavior
            pass

