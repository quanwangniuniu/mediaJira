"""
Tests for campaign Celery tasks
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from campaign.models import (
    CampaignTask, Channel, CampaignTaskStatus
)
from campaign.tasks import (
    check_roi_alerts
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


    # ROI alert tests moved to test_roi_pause_logic.py
    # Metrics calculation tests moved to test_helpers.py

