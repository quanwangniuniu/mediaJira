import pytest
import json
from unittest.mock import Mock, patch
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from ..models import CampaignTask, ChannelConfig, ExecutionLog, ROIAlertTrigger
from ..serializers import CampaignTaskSerializer


class CampaignExecutionViewsTest(APITestCase):
    """Test cases for campaign execution views."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Mock user roles
        self.user.roles = ['Specialist']
        
        self.client.force_authenticate(user=self.user)
        
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
    
    def test_campaign_list_view(self):
        """Test campaign list view."""
        url = reverse('campaign-task-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Campaign')
    
    def test_campaign_detail_view(self):
        """Test campaign detail view."""
        url = reverse('campaign-task-detail', kwargs={'pk': self.campaign.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Campaign')
        self.assertEqual(response.data['status'], 'scheduled')
    
    def test_campaign_creation(self):
        """Test campaign creation."""
        url = reverse('campaign-task-list')
        data = {
            'title': 'New Campaign',
            'scheduled_date': '2024-12-31 12:00:00',
            'channel': 'facebook',
            'creative_asset_ids': ['asset1', 'asset2'],
            'audience_config': {'age': '25-35', 'interests': ['tech']}
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Campaign')
        self.assertEqual(response.data['status'], 'scheduled')
    
    @patch('apps.campaign_execution.views.launch_campaign')
    @patch('apps.campaign_execution.views.poll_campaign_status')
    def test_launch_campaign_view(self, mock_poll, mock_launch):
        """Test campaign launch view."""
        url = reverse('campaign-task-launch', kwargs={'pk': self.campaign.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('launched successfully', response.data['message'])
        
        # Verify services were called
        mock_launch.assert_called_once_with(self.campaign.pk, actor=self.user)
        mock_poll.apply_async.assert_called_once()
    
    def test_launch_campaign_invalid_state(self):
        """Test launching campaign in invalid state."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.save()
        
        url = reverse('campaign-task-launch', kwargs={'pk': self.campaign.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('can only be launched from scheduled status', response.data['error'])
    
    @patch('apps.campaign_execution.views.pause_campaign')
    def test_pause_campaign_view(self, mock_pause):
        """Test campaign pause view."""
        # Set campaign to launched state
        self.campaign.mark_launched()
        self.campaign.save()
        
        url = reverse('campaign-task-pause', kwargs={'pk': self.campaign.pk})
        data = {'reason': 'Test pause'}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('paused successfully', response.data['message'])
        
        # Verify service was called
        mock_pause.assert_called_once_with(self.campaign.pk, actor=self.user, reason='Test pause')
    
    def test_pause_campaign_invalid_state(self):
        """Test pausing campaign in invalid state."""
        url = reverse('campaign-task-pause', kwargs={'pk': self.campaign.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('can only be paused from launched status', response.data['error'])
    
    @patch('apps.campaign_execution.views.get_executor')
    def test_resume_campaign_view(self, mock_get_executor):
        """Test campaign resume view."""
        # Set campaign to paused state
        self.campaign.mark_launched()
        self.campaign.mark_paused()
        self.campaign.external_ids_json = {'campaignId': 'camp_456'}
        self.campaign.save()
        
        # Mock executor
        mock_executor = Mock()
        mock_executor.resume.return_value = {'status': 'resumed'}
        mock_get_executor.return_value = mock_executor
        
        url = reverse('campaign-task-resume', kwargs={'pk': self.campaign.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('resumed successfully', response.data['message'])
        
        # Verify campaign was resumed
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, 'launched')
    
    def test_resume_campaign_invalid_state(self):
        """Test resuming campaign in invalid state."""
        url = reverse('campaign-task-resume', kwargs={'pk': self.campaign.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('can only be resumed from paused status', response.data['error'])
    
    @patch('apps.campaign_execution.views.get_executor')
    def test_campaign_status_view(self, mock_get_executor):
        """Test campaign status view."""
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
        
        url = reverse('campaign-task-status', kwargs={'pk': self.campaign.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['campaign_id'], self.campaign.pk)
        self.assertEqual(response.data['status'], 'launched')
        self.assertIn('metrics', response.data)
    
    def test_channel_config_list_view(self):
        """Test channel config list view."""
        url = reverse('channel-config-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['channel'], 'google')
    
    def test_execution_log_list_view(self):
        """Test execution log list view."""
        # Create an execution log
        ExecutionLog.objects.create(
            campaign_task=self.campaign,
            event='Launch',
            actor_user=self.user,
            result='Success',
            message='Test log'
        )
        
        url = reverse('execution-log-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['event'], 'Launch')
    
    def test_roi_alert_trigger_list_view(self):
        """Test ROI alert trigger list view."""
        # Create an ROI alert trigger
        ROIAlertTrigger.objects.create(
            campaign_task=self.campaign,
            metric_key='roi',
            comparator='<',
            threshold=1.0,
            action='notify_only'
        )
        
        url = reverse('roi-alert-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['metric_key'], 'roi')
    
    def test_roi_alert_trigger_creation(self):
        """Test ROI alert trigger creation."""
        url = reverse('roi-alert-list')
        data = {
            'campaign_task': self.campaign.pk,
            'metric_key': 'roi',
            'comparator': '<',
            'threshold': 1.0,
            'action': 'auto_pause'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['metric_key'], 'roi')
        self.assertEqual(response.data['action'], 'auto_pause')


class CampaignExecutionPermissionsTest(APITestCase):
    """Test cases for campaign execution permissions."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Mock user roles - not a Specialist or Senior Media Buyer
        self.user.roles = ['Junior']
        
        self.client.force_authenticate(user=self.user)
        
        # Mock team object
        self.user.team = type('Team', (), {'id': 1, 'name': 'Test Team'})()
        
        self.campaign = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2024-12-31 10:00:00',
            channel='google',
            created_by=self.user
        )
    
    def test_insufficient_permissions_for_launch(self):
        """Test that users without proper roles cannot launch campaigns."""
        url = reverse('campaign-task-launch', kwargs={'pk': self.campaign.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_insufficient_permissions_for_pause(self):
        """Test that users without proper roles cannot pause campaigns."""
        url = reverse('campaign-task-pause', kwargs={'pk': self.campaign.pk})
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_read_only_access_allowed(self):
        """Test that users can still read campaign data."""
        url = reverse('campaign-task-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
