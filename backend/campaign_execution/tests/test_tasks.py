import pytest
from unittest.mock import Mock, patch
from django.test import TestCase
from django.contrib.auth.models import User
from django.db import transaction
from ..models import CampaignTask, ChannelConfig, ROIAlertTrigger
from ..tasks import poll_campaign_status, execute_campaign, check_roi_alerts, _compare


class TasksTest(TestCase):
    """Test cases for campaign execution tasks."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Mock team object
        self.user.team = type('Team', (), {'id': 1, 'name': 'Test Team'})()
        
        self.campaign = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2024-12-31 10:00:00',
            channel='google',
            created_by=self.user
        )
        
        self.channel_config = ChannelConfig.objects.create(
            team=self.user.team,
            channel='google',
            auth_token='test_token',
            settings_json={'account_id': '12345'}
        )
    
    def test_compare_function(self):
        """Test the _compare function for ROI alerts."""
        # Test less than
        self.assertTrue(_compare(0.5, '<', 1.0))
        self.assertFalse(_compare(1.5, '<', 1.0))
        
        # Test less than or equal
        self.assertTrue(_compare(1.0, '<=', 1.0))
        self.assertTrue(_compare(0.5, '<=', 1.0))
        self.assertFalse(_compare(1.5, '<=', 1.0))
        
        # Test greater than
        self.assertTrue(_compare(1.5, '>', 1.0))
        self.assertFalse(_compare(0.5, '>', 1.0))
        
        # Test greater than or equal
        self.assertTrue(_compare(1.0, '>=', 1.0))
        self.assertTrue(_compare(1.5, '>=', 1.0))
        self.assertFalse(_compare(0.5, '>=', 1.0))
        
        # Test equal
        self.assertTrue(_compare(1.0, '=', 1.0))
        self.assertFalse(_compare(1.5, '=', 1.0))
        
        # Test invalid operator
        self.assertFalse(_compare(1.0, 'invalid', 1.0))
        
        # Test invalid values
        self.assertFalse(_compare('invalid', '<', 1.0))
        self.assertFalse(_compare(1.0, '<', 'invalid'))
    
    @patch('apps.campaign_execution.tasks.get_executor')
    @patch('apps.campaign_execution.tasks._log')
    @patch('apps.campaign_execution.tasks._ws')
    def test_poll_campaign_status_launched(self, mock_ws, mock_log, mock_get_executor):
        """Test polling campaign status for launched campaign."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.get_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 1.5
        }
        mock_executor.normalize_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 1.5
        }
        mock_get_executor.return_value = mock_executor
        
        # Poll campaign status
        poll_campaign_status(self.campaign.pk)
        
        # Verify campaign was updated
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.platform_status, 'RUNNING')
        
        # Verify executor was called
        mock_get_executor.assert_called_once()
        mock_executor.get_status.assert_called_once_with({'campaignId': 'camp_456'})
        
        # Verify logging and WebSocket notifications
        mock_log.assert_called()
        mock_ws.assert_called()
    
    @patch('apps.campaign_execution.tasks.get_executor')
    @patch('apps.campaign_execution.tasks._log')
    @patch('apps.campaign_execution.tasks._ws')
    def test_poll_campaign_status_completed(self, mock_ws, mock_log, mock_get_executor):
        """Test polling campaign status for completed campaign."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.get_status.return_value = {
            'state': 'COMPLETED',
            'spend': 1000.0,
            'roi': 2.0
        }
        mock_executor.normalize_status.return_value = {
            'state': 'COMPLETED',
            'spend': 1000.0,
            'roi': 2.0
        }
        mock_get_executor.return_value = mock_executor
        
        # Poll campaign status
        poll_campaign_status(self.campaign.pk)
        
        # Verify campaign was completed
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, 'completed')
        
        # Verify completion logging
        mock_log.assert_called()
    
    @patch('apps.campaign_execution.tasks.get_executor')
    @patch('apps.campaign_execution.tasks._log')
    @patch('apps.campaign_execution.tasks._ws')
    def test_poll_campaign_status_failed(self, mock_ws, mock_log, mock_get_executor):
        """Test polling campaign status for failed campaign."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.get_status.return_value = {
            'state': 'FAILED',
            'spend': 0.0,
            'roi': 0.0
        }
        mock_executor.normalize_status.return_value = {
            'state': 'FAILED',
            'spend': 0.0,
            'roi': 0.0
        }
        mock_get_executor.return_value = mock_executor
        
        # Poll campaign status
        poll_campaign_status(self.campaign.pk)
        
        # Verify campaign was marked as failed
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, 'failed')
        
        # Verify failure logging
        mock_log.assert_called()
    
    def test_poll_campaign_status_invalid_state(self):
        """Test polling campaign status for campaign in invalid state."""
        # Campaign is in scheduled state, should not poll
        with patch('apps.campaign_execution.tasks.get_executor') as mock_get_executor:
            poll_campaign_status(self.campaign.pk)
            mock_get_executor.assert_not_called()
    
    @patch('apps.campaign_execution.tasks.get_executor')
    @patch('apps.campaign_execution.tasks._log')
    @patch('apps.campaign_execution.tasks._ws')
    def test_poll_campaign_status_with_roi_alert(self, mock_ws, mock_log, mock_get_executor):
        """Test polling campaign status with ROI alert trigger."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Create ROI alert trigger
        ROIAlertTrigger.objects.create(
            campaign_task=self.campaign,
            metric_key='roi',
            comparator='<',
            threshold=1.0,
            action='notify_only'
        )
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.get_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5  # Below threshold
        }
        mock_executor.normalize_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5
        }
        mock_get_executor.return_value = mock_executor
        
        # Poll campaign status
        poll_campaign_status(self.campaign.pk)
        
        # Verify ROI alert was triggered
        mock_ws.assert_called()
        # Check that roiAlert was sent
        roi_alert_calls = [call for call in mock_ws.call_args_list 
                          if call[0][1] == 'roiAlert']
        self.assertTrue(len(roi_alert_calls) > 0)
    
    @patch('apps.campaign_execution.tasks.get_executor')
    @patch('apps.campaign_execution.tasks._log')
    @patch('apps.campaign_execution.tasks._ws')
    def test_poll_campaign_status_with_auto_pause(self, mock_ws, mock_log, mock_get_executor):
        """Test polling campaign status with auto-pause ROI alert."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Create ROI alert trigger with auto-pause
        ROIAlertTrigger.objects.create(
            campaign_task=self.campaign,
            metric_key='roi',
            comparator='<',
            threshold=1.0,
            action='auto_pause'
        )
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.get_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5  # Below threshold
        }
        mock_executor.normalize_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5
        }
        mock_executor.pause.return_value = {'status': 'paused'}
        mock_get_executor.return_value = mock_executor
        
        # Poll campaign status
        poll_campaign_status(self.campaign.pk)
        
        # Verify campaign was auto-paused
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, 'paused')
        self.assertIn('AutoPause', self.campaign.paused_reason)
        
        # Verify pause was called on executor
        mock_executor.pause.assert_called_once()
    
    @patch('apps.campaign_execution.tasks.launch_campaign')
    @patch('apps.campaign_execution.tasks.poll_campaign_status')
    @patch('apps.campaign_execution.tasks._log')
    def test_execute_campaign_success(self, mock_log, mock_poll, mock_launch):
        """Test successful campaign execution."""
        # Execute campaign
        execute_campaign(self.campaign.pk, actor_user_id=self.user.pk)
        
        # Verify launch was called
        mock_launch.assert_called_once_with(self.campaign.pk, actor=self.user)
        
        # Verify polling was started
        mock_poll.apply_async.assert_called_once()
        
        # Verify logging
        mock_log.assert_called()
    
    def test_execute_campaign_invalid_state(self):
        """Test executing campaign in invalid state."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.save()
        
        # Execute campaign should fail
        with patch('apps.campaign_execution.tasks._log') as mock_log:
            execute_campaign(self.campaign.pk, actor_user_id=self.user.pk)
            
            # Verify error was logged
            mock_log.assert_called()
    
    def test_execute_campaign_nonexistent(self):
        """Test executing non-existent campaign."""
        with patch('apps.campaign_execution.tasks._log') as mock_log:
            execute_campaign(99999, actor_user_id=self.user.pk)
            
            # Verify error was logged
            mock_log.assert_called()
    
    @patch('apps.campaign_execution.tasks.get_executor')
    @patch('apps.campaign_execution.tasks._log')
    @patch('apps.campaign_execution.tasks._ws')
    def test_check_roi_alerts(self, mock_ws, mock_log, mock_get_executor):
        """Test checking ROI alerts for all active campaigns."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Create ROI alert trigger
        ROIAlertTrigger.objects.create(
            campaign_task=self.campaign,
            metric_key='roi',
            comparator='<',
            threshold=1.0,
            action='notify_only'
        )
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.get_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5  # Below threshold
        }
        mock_executor.normalize_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5
        }
        mock_get_executor.return_value = mock_executor
        
        # Check ROI alerts
        check_roi_alerts()
        
        # Verify alert was triggered
        mock_ws.assert_called()
        mock_log.assert_called()
    
    @patch('apps.campaign_execution.tasks.get_executor')
    @patch('apps.campaign_execution.tasks._log')
    @patch('apps.campaign_execution.tasks._ws')
    def test_check_roi_alerts_auto_pause(self, mock_ws, mock_log, mock_get_executor):
        """Test checking ROI alerts with auto-pause."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Create ROI alert trigger with auto-pause
        ROIAlertTrigger.objects.create(
            campaign_task=self.campaign,
            metric_key='roi',
            comparator='<',
            threshold=1.0,
            action='auto_pause'
        )
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.get_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5  # Below threshold
        }
        mock_executor.normalize_status.return_value = {
            'state': 'RUNNING',
            'spend': 100.0,
            'roi': 0.5
        }
        mock_executor.pause.return_value = {'status': 'paused'}
        mock_get_executor.return_value = mock_executor
        
        # Check ROI alerts
        check_roi_alerts()
        
        # Verify campaign was auto-paused
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, 'paused')
        self.assertIn('AutoPause', self.campaign.paused_reason)
        
        # Verify pause was called on executor
        mock_executor.pause.assert_called_once()
