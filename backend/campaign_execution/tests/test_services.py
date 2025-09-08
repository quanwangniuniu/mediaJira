import pytest
from unittest.mock import Mock, patch
from django.test import TestCase
from django.contrib.auth.models import User
from django.db import transaction
from campaign_execution.models import CampaignTask, ChannelConfig, ExecutionLog
from campaign_execution.services import launch_campaign, pause_campaign, _log, _ws
from campaign_execution.executors.base import ExecutorError


class ServicesTest(TestCase):
    """Test cases for campaign execution services."""
    
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
    
    @patch('campaign_execution.services.get_executor')
    @patch('campaign_execution.services._log')
    @patch('campaign_execution.services._ws')
    def test_launch_campaign_success(self, mock_ws, mock_log, mock_get_executor):
        """Test successful campaign launch."""
        # Mock executor
        mock_executor = Mock()
        mock_executor.launch.return_value = {
            'accountId': 'acc_123',
            'campaignId': 'camp_456'
        }
        mock_get_executor.return_value = mock_executor
        
        # Launch campaign
        launch_campaign(self.campaign.pk, actor=self.user)
        
        # Refresh campaign from database
        self.campaign.refresh_from_db()
        
        # Assertions
        self.assertEqual(self.campaign.status, 'launched')
        self.assertEqual(self.campaign.platform_status, 'LAUNCHED')
        self.assertEqual(self.campaign.external_ids_json['campaignId'], 'camp_456')
        
        # Verify executor was called correctly
        mock_get_executor.assert_called_once()
        mock_executor.launch.assert_called_once()
        
        # Verify logging and WebSocket notifications
        mock_log.assert_called()
        mock_ws.assert_called()
    
    @patch('campaign_execution.services.get_executor')
    @patch('campaign_execution.services._log')
    @patch('campaign_execution.services._ws')
    def test_launch_campaign_executor_error(self, mock_ws, mock_log, mock_get_executor):
        """Test campaign launch with executor error."""
        # Mock executor to raise error
        mock_executor = Mock()
        mock_executor.launch.side_effect = ExecutorError("API Error")
        mock_get_executor.return_value = mock_executor
        
        # Launch campaign should raise exception
        with self.assertRaises(ExecutorError):
            launch_campaign(self.campaign.pk, actor=self.user)
        
        # Campaign should remain in scheduled state
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, 'scheduled')
        
        # Verify error logging
        mock_log.assert_called()
        mock_ws.assert_called()
    
    @patch('campaign_execution.services.get_executor')
    @patch('campaign_execution.services._log')
    @patch('campaign_execution.services._ws')
    def test_pause_campaign_success(self, mock_ws, mock_log, mock_get_executor):
        """Test successful campaign pause."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.pause.return_value = {'status': 'paused'}
        mock_get_executor.return_value = mock_executor
        
        # Pause campaign
        pause_campaign(self.campaign.pk, actor=self.user, reason='Test pause')
        
        # Refresh campaign from database
        self.campaign.refresh_from_db()
        
        # Assertions
        self.assertEqual(self.campaign.status, 'paused')
        self.assertEqual(self.campaign.platform_status, 'PAUSED')
        self.assertEqual(self.campaign.paused_reason, 'Test pause')
        
        # Verify executor was called correctly
        mock_get_executor.assert_called_once()
        mock_executor.pause.assert_called_once_with({'campaignId': 'camp_456'})
        
        # Verify logging and WebSocket notifications
        mock_log.assert_called()
        mock_ws.assert_called()
    
    def test_log_function(self):
        """Test _log function."""
        # Test successful log creation
        _log(self.campaign, 'Launch', result='Success', message='Test message', 
             details={'test': 'data'}, actor=self.user)
        
        # Verify log was created
        log = ExecutionLog.objects.get(campaign_task=self.campaign)
        self.assertEqual(log.event, 'Launch')
        self.assertEqual(log.result, 'Success')
        self.assertEqual(log.message, 'Test message')
        self.assertEqual(log.details['test'], 'data')
        self.assertEqual(log.actor_user, self.user)
    
    @patch('campaign_execution.services.async_to_sync')
    def test_ws_function(self, mock_async_to_sync):
        """Test _ws function."""
        mock_channel_layer = Mock()
        mock_async_to_sync.return_value.return_value = mock_channel_layer
        
        # Test WebSocket message sending
        _ws('test_group', 'test_type', {'test': 'data'})
        
        # Verify channel layer was called
        mock_channel_layer.group_send.assert_called_once_with(
            'test_group',
            {'type': 'test_type', 'payload': {'test': 'data'}}
        )
    
    def test_launch_campaign_invalid_state(self):
        """Test launching campaign in invalid state."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.save()
        
        # Launch should fail
        with self.assertRaises(Exception):
            launch_campaign(self.campaign.pk, actor=self.user)
    
    def test_pause_campaign_invalid_state(self):
        """Test pausing campaign in invalid state."""
        # Campaign is in scheduled state, cannot pause
        with self.assertRaises(Exception):
            pause_campaign(self.campaign.pk, actor=self.user, reason='Test')
    
    @patch('campaign_execution.services.get_executor')
    def test_launch_campaign_missing_config(self, mock_get_executor):
        """Test launching campaign with missing channel config."""
        # Delete channel config
        self.channel_config.delete()
        
        # Launch should fail
        with self.assertRaises(ChannelConfig.DoesNotExist):
            launch_campaign(self.campaign.pk, actor=self.user)
    
    @patch('campaign_execution.services.get_executor')
    def test_pause_campaign_missing_config(self, mock_get_executor):
        """Test pausing campaign with missing channel config."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Delete channel config
        self.channel_config.delete()
        
        # Pause should fail
        with self.assertRaises(ChannelConfig.DoesNotExist):
            pause_campaign(self.campaign.pk, actor=self.user, reason='Test')
