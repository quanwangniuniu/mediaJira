"""
Tests for campaign Celery tasks
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from campaign.models import (
    CampaignTask, Channel, CampaignTaskStatus, ROIAlertTrigger,
    MetricKey, Comparator, AlertAction
)
from campaign.tasks import (
    check_roi_alerts, _calculate_metrics_from_stats, _check_threshold
)

User = get_user_model()


class CampaignTaskTest(TestCase):
    """Test campaign Celery tasks"""
    
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
            audience_config={
                'type': 'google',
                'common': {'locations': ['AU']},
                'google': {
                    'campaign_type': 'SEARCH',
                    'bidding_strategy': 'TARGET_ROAS'
                }
            },
            created_by=self.user,
            status=CampaignTaskStatus.SCHEDULED
        )
    
    def test_launch_campaign_task(self):
        """Test launch campaign task"""
        # Note: This is a simplified test - full integration testing requires Celery broker
        task_id = str(self.campaign_task.campaign_task_id)
        # In real tests, would use Celery's eager mode or mock the task
        pass


class ROIAlertCheckingTest(TestCase):
    """Test ROI alert checking functionality"""
    
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
            created_by=self.user,
            status=CampaignTaskStatus.LAUNCHED
        )
    
    def test_check_roi_alerts_no_active_alerts(self):
        """Test ROI alert check when no active alerts exist"""
        result = check_roi_alerts(str(self.campaign_task.campaign_task_id))
        self.assertTrue(result['success'])
        self.assertEqual(result['alerts_checked'], 0)
    
    def test_check_roi_alerts_skips_inactive_campaign(self):
        """Test ROI alert check skips campaigns not in LAUNCHED or PAUSED status"""
        self.campaign_task.status = CampaignTaskStatus.SCHEDULED
        self.campaign_task.save()
        
        result = check_roi_alerts(str(self.campaign_task.campaign_task_id))
        self.assertTrue(result['success'])
        self.assertTrue(result['skipped'])
        self.assertEqual(result['reason'], 'Campaign not active')
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_check_roi_alerts_triggers_alert(self, mock_log_event, mock_websocket, mock_get_executor):
        """Test ROI alert check triggers when threshold is met"""
        # Create a mock executor
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {
                'stats': {
                    'impressions': 10000,
                    'clicks': 100,
                    'cost': 100.0,
                    'revenue': 150.0,
                    'conversions': 10
                }
            }
        }
        mock_get_executor.return_value = mock_executor
        
        # Create ROI alert trigger (ROAS < 2.0)
        alert = ROIAlertTrigger.objects.create(
            campaign_task=self.campaign_task,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=2.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        # ROAS = 150/100 = 1.5, which is < 2.0, so alert should trigger
        result = check_roi_alerts(str(self.campaign_task.campaign_task_id))
        
        self.assertTrue(result['success'])
        self.assertEqual(result['alerts_checked'], 1)
        self.assertEqual(result['alerts_triggered'], 1)
        
        # Verify log and websocket events were called
        mock_log_event.assert_called_once()
        mock_websocket.assert_called_once()
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    @patch('campaign.tasks.CampaignService.pause_campaign')
    def test_check_roi_alerts_auto_pause(self, mock_pause, mock_log_event, mock_websocket, mock_get_executor):
        """Test ROI alert with AUTO_PAUSE action pauses campaign"""
        # Create a mock executor
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {
                'stats': {
                    'impressions': 10000,
                    'clicks': 100,
                    'cost': 100.0,
                    'revenue': 50.0,  # Low revenue, ROAS = 0.5
                    'conversions': 5
                }
            }
        }
        mock_get_executor.return_value = mock_executor
        
        # Create ROI alert trigger (ROAS < 1.0) with AUTO_PAUSE
        alert = ROIAlertTrigger.objects.create(
            campaign_task=self.campaign_task,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=1.0,
            action=AlertAction.AUTO_PAUSE,
            is_active=True
        )
        
        # ROAS = 50/100 = 0.5, which is < 1.0, so alert should trigger and pause
        result = check_roi_alerts(str(self.campaign_task.campaign_task_id))
        
        self.assertTrue(result['success'])
        self.assertEqual(result['alerts_triggered'], 1)
        # Verify pause was called
        mock_pause.assert_called_once()
        mock_log_event.assert_called_once()
        mock_websocket.assert_called_once()
    
    @patch('campaign.tasks.get_executor')
    def test_check_roi_alerts_no_stats_available(self, mock_get_executor):
        """Test ROI alert check when no stats are available"""
        # Create a mock executor with no stats
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {}
        }
        mock_get_executor.return_value = mock_executor
        
        # Create an alert
        ROIAlertTrigger.objects.create(
            campaign_task=self.campaign_task,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=2.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        result = check_roi_alerts(str(self.campaign_task.campaign_task_id))
        
        self.assertTrue(result['success'])
        self.assertEqual(result['alerts_checked'], 0)
        self.assertIn('message', result)


class MetricsCalculationTest(TestCase):
    """Test metrics calculation helper functions"""
    
    def test_calculate_metrics_from_stats(self):
        """Test calculating metrics from raw stats"""
        stats = {
            'impressions': 10000,
            'clicks': 100,
            'cost': 100.0,
            'revenue': 200.0,
            'conversions': 10
        }
        
        metrics = _calculate_metrics_from_stats(stats)
        
        # Check calculated metrics
        self.assertIn('ctr', metrics)
        self.assertAlmostEqual(metrics['ctr'], 1.0)  # 100/10000 * 100 = 1.0%
        
        self.assertIn('cpc', metrics)
        self.assertAlmostEqual(metrics['cpc'], 1.0)  # 100/100 = 1.0
        
        self.assertIn('cpa', metrics)
        self.assertAlmostEqual(metrics['cpa'], 10.0)  # 100/10 = 10.0
        
        self.assertIn('roas', metrics)
        self.assertAlmostEqual(metrics['roas'], 2.0)  # 200/100 = 2.0
        
        self.assertIn('roi', metrics)
        self.assertAlmostEqual(metrics['roi'], 1.0)  # (200-100)/100 = 1.0
    
    def test_calculate_metrics_mock_data(self):
        """Test calculating metrics with mock data (no revenue)"""
        stats = {
            'impressions': 1000,
            'clicks': 50,
            'cost': 50.0,
            # No revenue
        }
        
        metrics = _calculate_metrics_from_stats(stats)
        
        # Should calculate CTR and CPC
        self.assertIn('ctr', metrics)
        self.assertIn('cpc', metrics)
        
        # Should have mock ROAS/ROI (2x)
        self.assertIn('roas', metrics)
        self.assertAlmostEqual(metrics['roas'], 2.0)
        self.assertIn('roi', metrics)
        self.assertAlmostEqual(metrics['roi'], 1.0)
    
    def test_check_threshold_comparators(self):
        """Test threshold checking with different comparators"""
        # Less than
        self.assertTrue(_check_threshold(1.5, Comparator.LT, 2.0))
        self.assertFalse(_check_threshold(2.5, Comparator.LT, 2.0))
        
        # Less than or equal
        self.assertTrue(_check_threshold(2.0, Comparator.LTE, 2.0))
        self.assertTrue(_check_threshold(1.5, Comparator.LTE, 2.0))
        self.assertFalse(_check_threshold(2.5, Comparator.LTE, 2.0))
        
        # Greater than
        self.assertTrue(_check_threshold(2.5, Comparator.GT, 2.0))
        self.assertFalse(_check_threshold(1.5, Comparator.GT, 2.0))
        
        # Greater than or equal
        self.assertTrue(_check_threshold(2.0, Comparator.GTE, 2.0))
        self.assertTrue(_check_threshold(2.5, Comparator.GTE, 2.0))
        self.assertFalse(_check_threshold(1.5, Comparator.GTE, 2.0))
        
        # Equal (with epsilon for float comparison)
        self.assertTrue(_check_threshold(2.0, Comparator.EQ, 2.0))
        self.assertTrue(_check_threshold(2.000001, Comparator.EQ, 2.0))  # Within epsilon
        self.assertFalse(_check_threshold(2.01, Comparator.EQ, 2.0))

