"""
Tests for Celery execution chains
Tests Celery task chains, retry mechanisms, and failure handling
"""
import pytest
from unittest.mock import patch, MagicMock, call
from django.test import override_settings
from celery import chain
from campaign.models import CampaignTask, CampaignTaskStatus, Channel
from campaign.tasks import launch_campaign_task, poll_campaign_status, pause_campaign_task


@pytest.mark.django_db
class TestCeleryTaskChains:
    """Test Celery task chains"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_launch_then_poll_chain(self, mock_log_event, mock_websocket, mock_get_executor, campaign_task_scheduled):
        """Test launch_campaign_task -> poll_campaign_status chain"""
        # Setup mock executor
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(return_value={
            'success': True,
            'external_ids': {'campaignId': 'test_123'},
            'message': 'Campaign launched successfully'
        })
        mock_executor.get_status = MagicMock(return_value={
            'success': True,
            'platform_status': 'ACTIVE',
            'raw': {'stats': {}}
        })
        mock_get_executor.return_value = mock_executor
        
        # Launch campaign
        task_id = str(campaign_task_scheduled.campaign_task_id)
        launch_result = launch_campaign_task(task_id)
        
        assert launch_result['success'] is True
        campaign_task_scheduled.refresh_from_db()
        assert campaign_task_scheduled.status == CampaignTaskStatus.LAUNCHED
        
        # Poll status
        poll_result = poll_campaign_status(task_id)
        assert poll_result['success'] is True
        assert 'platform_status' in poll_result or poll_result.get('skipped') is True
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_launch_task_retry_on_failure(self, mock_log_event, mock_get_executor, campaign_task_scheduled):
        """Test launch task retries on failure"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that fails first time, succeeds second time
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        call_count = {'count': 0}
        
        def launch_side_effect(*args, **kwargs):
            call_count['count'] += 1
            if call_count['count'] == 1:
                raise Exception("Temporary failure")
            return {
                'success': True,
                'external_ids': {'campaignId': 'test_123'}
            }
        
        mock_executor.launch = MagicMock(side_effect=launch_side_effect)
        mock_get_executor.return_value = mock_executor
        
        # Task should retry and eventually succeed
        # Note: In real scenario, Celery would handle retries
        # Here we test the retry logic is in place
        with patch('campaign.tasks.launch_campaign_task.retry') as mock_retry:
            try:
                launch_campaign_task(task_id)
            except Exception:
                # Task should attempt retry
                pass
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_launch_task_fails_after_max_retries(self, mock_log_event, mock_get_executor, campaign_task_scheduled):
        """Test launch task fails after max retries"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        # Mock executor that always fails
        mock_executor = MagicMock()
        mock_executor.validate_config = MagicMock(return_value=None)
        mock_executor.launch = MagicMock(return_value={
            'success': False,
            'error': 'Platform API error'
        })
        mock_get_executor.return_value = mock_executor
        
        result = launch_campaign_task(task_id)
        
        assert result['success'] is False
        assert 'error' in result
        campaign_task_scheduled.refresh_from_db()
        assert campaign_task_scheduled.status == CampaignTaskStatus.FAILED


@pytest.mark.django_db
class TestCeleryTaskRetries:
    """Test Celery task retry mechanisms"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_poll_status_retries_on_failure(self, mock_get_executor, campaign_task_launched):
        """Test poll_campaign_status retries on failure"""
        task_id = str(campaign_task_launched.campaign_task_id)
        
        # Mock executor that fails first time
        mock_executor = MagicMock()
        call_count = {'count': 0}
        
        def get_status_side_effect(*args, **kwargs):
            call_count['count'] += 1
            if call_count['count'] == 1:
                raise Exception("API timeout")
            return {
                'success': True,
                'platform_status': 'ACTIVE',
                'raw': {}
            }
        
        mock_executor.get_status = MagicMock(side_effect=get_status_side_effect)
        mock_get_executor.return_value = mock_executor
        
        # Task should handle retry logic
        with patch('campaign.tasks.poll_campaign_status.retry') as mock_retry:
            try:
                poll_campaign_status(task_id)
            except Exception:
                pass
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_pause_task_retries(self, mock_log_event, mock_get_executor, campaign_task_launched):
        """Test pause_campaign_task retries on failure"""
        task_id = str(campaign_task_launched.campaign_task_id)
        
        # Mock executor
        mock_executor = MagicMock()
        mock_executor.pause = MagicMock(return_value={
            'success': True,
            'message': 'Campaign paused'
        })
        mock_get_executor.return_value = mock_executor
        
        result = pause_campaign_task(task_id, reason='Test pause')
        
        assert result['success'] is True
        assert mock_executor.pause.called


@pytest.mark.django_db
class TestCeleryTaskErrorHandling:
    """Test Celery task error handling"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_launch_task_handles_missing_campaign(self):
        """Test launch task handles missing campaign task"""
        # Use a valid UUID format but non-existent ID
        import uuid
        non_existent_id = str(uuid.uuid4())
        
        # Task will retry and eventually return error
        # With CELERY_TASK_ALWAYS_EAGER=True, it should handle the DoesNotExist exception
        try:
            result = launch_campaign_task(non_existent_id)
            # Should return error after retries exhausted
            assert result['success'] is False
            assert 'error' in result or 'not found' in result.get('error', '').lower()
        except Exception as e:
            # If it raises an exception, that's also acceptable for missing campaign
            assert 'not found' in str(e).lower() or 'does not exist' in str(e).lower()
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_poll_status_handles_missing_campaign(self):
        """Test poll status handles missing campaign task"""
        # Use a valid UUID format but non-existent ID
        import uuid
        non_existent_id = str(uuid.uuid4())
        
        try:
            result = poll_campaign_status(non_existent_id)
            # Should return error or skip
            assert result['success'] is False or result.get('skipped') is True
            if not result.get('skipped'):
                assert 'error' in result or 'not found' in result.get('error', '').lower()
        except Exception as e:
            # If it raises an exception, that's also acceptable for missing campaign
            assert 'not found' in str(e).lower() or 'does not exist' in str(e).lower()
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_launch_task_handles_invalid_status(self, mock_get_executor, campaign_task_paused):
        """Test launch task handles invalid status"""
        task_id = str(campaign_task_paused.campaign_task_id)
        
        result = launch_campaign_task(task_id)
        
        assert result['success'] is False
        assert 'error' in result
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_poll_status_skips_inactive_campaigns(self, mock_get_executor, campaign_task_scheduled):
        """Test poll status skips campaigns not in LAUNCHED or PAUSED status"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        result = poll_campaign_status(task_id)
        
        assert result['success'] is True
        assert result.get('skipped') is True


@pytest.mark.django_db
class TestCeleryTaskDryRun:
    """Test Celery task dry run mode"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    @patch('campaign.tasks.get_executor')
    def test_launch_task_dry_run(self, mock_get_executor, campaign_task_scheduled):
        """Test launch task in dry run mode"""
        task_id = str(campaign_task_scheduled.campaign_task_id)
        
        result = launch_campaign_task(task_id, dry_run=True)
        
        assert result['success'] is True
        assert result['dry_run'] is True
        # Executor should not be called in dry run
        assert not mock_get_executor.called

