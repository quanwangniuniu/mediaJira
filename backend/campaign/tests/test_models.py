"""
Tests for campaign models
Uses faker to generate test data
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from faker import Faker
from campaign.models import (
    CampaignTask, ExecutionLog, ChannelConfig, ROIAlertTrigger,
    CampaignTaskStatus, OperationEvent, OperationResult, Channel,
    MetricKey, Comparator, AlertAction
)

User = get_user_model()
fake = Faker()


class CampaignTaskModelTest(TestCase):
    """Test CampaignTask model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass'
        )
    
    def test_create_campaign_task(self):
        """Test creating a campaign task using faker"""
        title = fake.sentence(nb_words=4)
        task = CampaignTask.objects.create(
            title=title,
            scheduled_date=fake.future_datetime(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=[fake.uuid4() for _ in range(2)],
            audience_config={'type': 'google', 'common': {}},
            created_by=self.user
        )
        self.assertEqual(task.status, CampaignTaskStatus.SCHEDULED)
        self.assertIn(title, str(task))
        
    # FSM transition tests moved to test_fsm_transitions.py


class ExecutionLogModelTest(TestCase):
    """Test ExecutionLog model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass'
        )
        self.campaign_task = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2025-01-01T00:00:00Z',
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=[],
            audience_config={'type': 'google'},
            created_by=self.user
        )
    
    def test_create_execution_log(self):
        """Test creating an execution log using faker"""
        message = fake.sentence()
        log = ExecutionLog.objects.create(
            campaign_task=self.campaign_task,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            message=message
        )
        self.assertEqual(log.event, OperationEvent.LAUNCH)
        self.assertEqual(log.result, OperationResult.SUCCESS)
        self.assertEqual(log.message, message)


class ROIAlertTriggerModelTest(TestCase):
    """Test ROIAlertTrigger model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass'
        )
        self.campaign_task = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2025-01-01T00:00:00Z',
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=[],
            audience_config={'type': 'google'},
            created_by=self.user
        )
    
    def test_create_roi_alert_trigger(self):
        """Test creating an ROI alert trigger using faker"""
        threshold = round(fake.pyfloat(left_digits=1, right_digits=2, positive=True, min_value=0.5, max_value=5.0), 2)
        alert = ROIAlertTrigger.objects.create(
            campaign_task=self.campaign_task,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=threshold,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        self.assertEqual(alert.metric_key, MetricKey.ROAS)
        self.assertEqual(alert.comparator, Comparator.LT)
        self.assertEqual(alert.threshold, threshold)
        self.assertEqual(alert.action, AlertAction.NOTIFY_ONLY)
        self.assertTrue(alert.is_active)
        self.assertIsNotNone(alert.roi_alert_trigger_id)
    
    def test_roi_alert_trigger_str(self):
        """Test ROI alert trigger string representation"""
        alert = ROIAlertTrigger.objects.create(
            campaign_task=self.campaign_task,
            metric_key=MetricKey.ROI,
            comparator=Comparator.LTE,
            threshold=0.5,
            action=AlertAction.AUTO_PAUSE
        )
        
        str_repr = str(alert)
        self.assertIn('ROIAlertTrigger', str_repr)
        self.assertIn(MetricKey.ROI, str_repr)
        self.assertIn(Comparator.LTE, str_repr)
        self.assertIn('0.5', str_repr)

