"""
Tests for ROI-triggered pause logic
Extracted and extended ROI tests from test_tasks.py
"""
import pytest
from unittest.mock import patch, MagicMock
from campaign.models import (
    CampaignTask, CampaignTaskStatus, ROIAlertTrigger,
    MetricKey, Comparator, AlertAction
)
from campaign.tasks import check_roi_alerts
from campaign.services import CampaignService


@pytest.mark.django_db
class TestROIAlertTriggering:
    """Test ROI alert triggering logic"""
    
    def test_check_roi_alerts_no_active_alerts(self, campaign_task_launched):
        """Test ROI alert check when no active alerts exist"""
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_checked'] == 0
    
    def test_check_roi_alerts_skips_inactive_campaign(self, campaign_task_scheduled):
        """Test ROI alert check skips campaigns not in LAUNCHED or PAUSED status"""
        result = check_roi_alerts(str(campaign_task_scheduled.campaign_task_id))
        
        assert result['success'] is True
        assert result['skipped'] is True
        assert result['reason'] == 'Campaign not active'
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_check_roi_alerts_triggers_alert(self, mock_log_event, mock_websocket, mock_get_executor, campaign_task_launched):
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
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=2.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        # ROAS = 150/100 = 1.5, which is < 2.0, so alert should trigger
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_checked'] == 1
        assert result['alerts_triggered'] == 1
        
        # Verify log and websocket events were called
        assert mock_log_event.called
        assert mock_websocket.called
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    @patch('campaign.tasks.CampaignService.pause_campaign')
    def test_check_roi_alerts_auto_pause(self, mock_pause, mock_log_event, mock_websocket, mock_get_executor, campaign_task_launched):
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
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=1.0,
            action=AlertAction.AUTO_PAUSE,
            is_active=True
        )
        
        # ROAS = 50/100 = 0.5, which is < 1.0, so alert should trigger and pause
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_triggered'] == 1
        # Verify pause was called
        assert mock_pause.called
        assert mock_log_event.called
        assert mock_websocket.called
    
    @patch('campaign.tasks.get_executor')
    def test_check_roi_alerts_no_stats_available(self, mock_get_executor, campaign_task_launched):
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
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=2.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_checked'] == 0
        assert 'message' in result


@pytest.mark.django_db
class TestROIAlertMultipleMetrics:
    """Test ROI alerts with different metrics"""
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_roi_alert_with_roi_metric(self, mock_log_event, mock_websocket, mock_get_executor, campaign_task_launched):
        """Test ROI alert with ROI metric"""
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {
                'stats': {
                    'impressions': 10000,
                    'clicks': 100,
                    'cost': 100.0,
                    'revenue': 150.0,  # ROI = (150-100)/100 = 0.5
                    'conversions': 10
                }
            }
        }
        mock_get_executor.return_value = mock_executor
        
        # Create ROI alert trigger (ROI < 1.0)
        alert = ROIAlertTrigger.objects.create(
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.ROI,
            comparator=Comparator.LT,
            threshold=1.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_triggered'] == 1
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_roi_alert_with_cpa_metric(self, mock_log_event, mock_websocket, mock_get_executor, campaign_task_launched):
        """Test ROI alert with CPA metric"""
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {
                'stats': {
                    'impressions': 10000,
                    'clicks': 100,
                    'cost': 100.0,
                    'conversions': 5  # CPA = 100/5 = 20.0
                }
            }
        }
        mock_get_executor.return_value = mock_executor
        
        # Create ROI alert trigger (CPA > 15.0)
        alert = ROIAlertTrigger.objects.create(
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.CPA,
            comparator=Comparator.GT,
            threshold=15.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_triggered'] == 1
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_roi_alert_with_ctr_metric(self, mock_log_event, mock_websocket, mock_get_executor, campaign_task_launched):
        """Test ROI alert with CTR metric"""
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {
                'stats': {
                    'impressions': 10000,
                    'clicks': 50,  # CTR = 50/10000 * 100 = 0.5%
                    'cost': 100.0
                }
            }
        }
        mock_get_executor.return_value = mock_executor
        
        # Create ROI alert trigger (CTR < 1.0%)
        alert = ROIAlertTrigger.objects.create(
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.CTR,
            comparator=Comparator.LT,
            threshold=1.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_triggered'] == 1


@pytest.mark.django_db
class TestROIAlertMultipleAlerts:
    """Test multiple ROI alerts on same campaign"""
    
    @patch('campaign.tasks.get_executor')
    @patch('campaign.tasks._send_websocket_event')
    @patch('campaign.tasks.CampaignService.log_execution_event')
    def test_multiple_alerts_triggered(self, mock_log_event, mock_websocket, mock_get_executor, campaign_task_launched):
        """Test multiple alerts can be triggered simultaneously"""
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {
                'stats': {
                    'impressions': 10000,
                    'clicks': 50,
                    'cost': 100.0,
                    'revenue': 150.0,
                    'conversions': 5
                }
            }
        }
        mock_get_executor.return_value = mock_executor
        
        # Create multiple alerts
        ROIAlertTrigger.objects.create(
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=2.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        ROIAlertTrigger.objects.create(
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.CTR,
            comparator=Comparator.LT,
            threshold=1.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_checked'] == 2
        assert result['alerts_triggered'] == 2
    
    @patch('campaign.tasks.get_executor')
    def test_inactive_alerts_not_checked(self, mock_get_executor, campaign_task_launched):
        """Test inactive alerts are not checked"""
        mock_executor = MagicMock()
        mock_executor.get_status.return_value = {
            'success': True,
            'raw': {
                'stats': {
                    'impressions': 10000,
                    'clicks': 100,
                    'cost': 100.0,
                    'revenue': 150.0
                }
            }
        }
        mock_get_executor.return_value = mock_executor
        
        # Create active alert
        ROIAlertTrigger.objects.create(
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=2.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=True
        )
        
        # Create inactive alert
        ROIAlertTrigger.objects.create(
            campaign_task=campaign_task_launched,
            metric_key=MetricKey.ROAS,
            comparator=Comparator.LT,
            threshold=1.0,
            action=AlertAction.NOTIFY_ONLY,
            is_active=False  # Inactive
        )
        
        result = check_roi_alerts(str(campaign_task_launched.campaign_task_id))
        
        assert result['success'] is True
        assert result['alerts_checked'] == 1  # Only active alert checked

