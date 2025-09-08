import pytest
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django_fsm import TransitionNotAllowed
from campaign_execution.models import (
    CampaignTask, ChannelConfig, ExecutionLog, ROIAlertTrigger,
    ChannelChoices, CampaignStatus, ExecutionEvent, ExecutionResult,
    MetricKey, ComparatorOperator, AlertAction
)


class CampaignTaskModelTest(TestCase):
    """Test cases for CampaignTask model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.campaign = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2024-12-31 10:00:00',
            channel=ChannelChoices.GOOGLE,
            created_by=self.user
        )
    
    def test_campaign_creation(self):
        """Test campaign task creation."""
        self.assertEqual(self.campaign.title, 'Test Campaign')
        self.assertEqual(self.campaign.status, CampaignStatus.SCHEDULED)
        self.assertEqual(self.campaign.channel, ChannelChoices.GOOGLE)
        self.assertEqual(self.campaign.created_by, self.user)
    
    def test_fsm_transitions(self):
        """Test FSM state transitions."""
        # Test launch transition
        self.campaign.mark_launched()
        self.assertEqual(self.campaign.status, CampaignStatus.LAUNCHED)
        
        # Test pause transition
        self.campaign.mark_paused()
        self.assertEqual(self.campaign.status, CampaignStatus.PAUSED)
        
        # Test resume transition
        self.campaign.mark_resumed()
        self.assertEqual(self.campaign.status, CampaignStatus.LAUNCHED)
        
        # Test completion transition
        self.campaign.mark_completed()
        self.assertEqual(self.campaign.status, CampaignStatus.COMPLETED)
    
    def test_invalid_transitions(self):
        """Test invalid FSM transitions."""
        # Cannot pause from scheduled state
        with self.assertRaises(TransitionNotAllowed):
            self.campaign.mark_paused()
        
        # Cannot complete from scheduled state
        with self.assertRaises(TransitionNotAllowed):
            self.campaign.mark_completed()
    
    def test_archive_from_any_state(self):
        """Test archive transition from any state."""
        # Archive from scheduled
        self.campaign.mark_archived()
        self.assertEqual(self.campaign.status, CampaignStatus.ARCHIVED)
        
        # Reset and test from launched
        self.campaign.status = CampaignStatus.LAUNCHED
        self.campaign.mark_archived()
        self.assertEqual(self.campaign.status, CampaignStatus.ARCHIVED)


class ChannelConfigModelTest(TestCase):
    """Test cases for ChannelConfig model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Mock team object
        self.user.team = type('Team', (), {'id': 1, 'name': 'Test Team'})()
    
    def test_channel_config_creation(self):
        """Test channel config creation."""
        config = ChannelConfig.objects.create(
            team=self.user.team,
            channel=ChannelChoices.GOOGLE,
            auth_token='test_token',
            settings_json={'account_id': '12345'}
        )
        
        self.assertEqual(config.channel, ChannelChoices.GOOGLE)
        self.assertEqual(config.auth_token, 'test_token')
        self.assertEqual(config.settings_json['account_id'], '12345')
        self.assertTrue(config.is_active)


class ExecutionLogModelTest(TestCase):
    """Test cases for ExecutionLog model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.campaign = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2024-12-31 10:00:00',
            channel=ChannelChoices.GOOGLE,
            created_by=self.user
        )
    
    def test_execution_log_creation(self):
        """Test execution log creation."""
        log = ExecutionLog.objects.create(
            campaign_task=self.campaign,
            event=ExecutionEvent.LAUNCH,
            actor_user=self.user,
            result=ExecutionResult.SUCCESS,
            message='Campaign launched successfully',
            details={'spend': 100.0, 'roi': 1.5}
        )
        
        self.assertEqual(log.campaign_task, self.campaign)
        self.assertEqual(log.event, ExecutionEvent.LAUNCH)
        self.assertEqual(log.actor_user, self.user)
        self.assertEqual(log.result, ExecutionResult.SUCCESS)
        self.assertEqual(log.details['spend'], 100.0)


class ROIAlertTriggerModelTest(TestCase):
    """Test cases for ROIAlertTrigger model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.campaign = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2024-12-31 10:00:00',
            channel=ChannelChoices.GOOGLE,
            created_by=self.user
        )
    
    def test_roi_alert_trigger_creation(self):
        """Test ROI alert trigger creation."""
        trigger = ROIAlertTrigger.objects.create(
            campaign_task=self.campaign,
            metric_key=MetricKey.ROI,
            comparator=ComparatorOperator.LT,
            threshold=1.0,
            action=AlertAction.AUTO_PAUSE
        )
        
        self.assertEqual(trigger.campaign_task, self.campaign)
        self.assertEqual(trigger.metric_key, MetricKey.ROI)
        self.assertEqual(trigger.comparator, ComparatorOperator.LT)
        self.assertEqual(trigger.threshold, 1.0)
        self.assertEqual(trigger.action, AlertAction.AUTO_PAUSE)
        self.assertTrue(trigger.is_active)
    
    def test_roi_alert_trigger_defaults(self):
        """Test ROI alert trigger default values."""
        trigger = ROIAlertTrigger.objects.create(
            campaign_task=self.campaign,
            metric_key=MetricKey.ROI,
            comparator=ComparatorOperator.LT,
            threshold=1.0
        )
        
        self.assertEqual(trigger.lookback_minutes, 60)
        self.assertEqual(trigger.action, AlertAction.NOTIFY_ONLY)
        self.assertTrue(trigger.is_active)


class ModelChoicesTest(TestCase):
    """Test cases for model choices."""
    
    def test_channel_choices(self):
        """Test channel choices."""
        self.assertIn(('google', 'Google Ads'), ChannelChoices.choices)
        self.assertIn(('facebook', 'Facebook Ads'), ChannelChoices.choices)
    
    def test_campaign_status_choices(self):
        """Test campaign status choices."""
        self.assertIn(('scheduled', 'Scheduled'), CampaignStatus.choices)
        self.assertIn(('launched', 'Launched'), CampaignStatus.choices)
        self.assertIn(('paused', 'Paused'), CampaignStatus.choices)
        self.assertIn(('completed', 'Completed'), CampaignStatus.choices)
        self.assertIn(('failed', 'Failed'), CampaignStatus.choices)
        self.assertIn(('archived', 'Archived'), CampaignStatus.choices)
    
    def test_execution_event_choices(self):
        """Test execution event choices."""
        self.assertIn(('launch', 'Launch'), ExecutionEvent.choices)
        self.assertIn(('pause', 'Pause'), ExecutionEvent.choices)
        self.assertIn(('resume', 'Resume'), ExecutionEvent.choices)
        self.assertIn(('complete', 'Complete'), ExecutionEvent.choices)
        self.assertIn(('fail', 'Fail'), ExecutionEvent.choices)
    
    def test_metric_key_choices(self):
        """Test metric key choices."""
        self.assertIn(('roi', 'ROI'), MetricKey.choices)
    
    def test_comparator_operator_choices(self):
        """Test comparator operator choices."""
        self.assertIn(('<', '<'), ComparatorOperator.choices)
        self.assertIn(('<=', '<='), ComparatorOperator.choices)
        self.assertIn(('>', '>'), ComparatorOperator.choices)
        self.assertIn(('>=', '>='), ComparatorOperator.choices)
        self.assertIn(('=', '='), ComparatorOperator.choices)
    
    def test_alert_action_choices(self):
        """Test alert action choices."""
        self.assertIn(('notify_only', 'NotifyOnly'), AlertAction.choices)
        self.assertIn(('auto_pause', 'AutoPause'), AlertAction.choices)
