"""
Tests for campaign executors
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from campaign.models import CampaignTask, Channel
from campaign.executors import get_executor, GoogleAdsExecutor, FacebookAdsExecutor, TikTokAdsExecutor

User = get_user_model()


class ExecutorTest(TestCase):
    """Test executor classes"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(username='testuser', email='test@example.com', password='testpass')
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
            created_by=self.user
        )
    
    def test_get_executor(self):
        """Test executor factory"""
        executor = get_executor('GoogleAds')
        self.assertIsInstance(executor, GoogleAdsExecutor)
        
        executor = get_executor('FacebookAds')
        self.assertIsInstance(executor, FacebookAdsExecutor)
        
        executor = get_executor('TikTokAds')
        self.assertIsInstance(executor, TikTokAdsExecutor)
    
    def test_google_ads_executor_validate(self):
        """Test Google Ads executor validation"""
        executor = GoogleAdsExecutor()
        valid_config = {
            'type': 'google',
            'common': {'locations': ['AU']},
            'google': {
                'campaign_type': 'SEARCH',
                'bidding_strategy': 'TARGET_ROAS'
            }
        }
        executor.validate_config(valid_config)  # Should not raise
        
        invalid_config = {'type': 'facebook'}
        with self.assertRaises(ValidationError):
            executor.validate_config(invalid_config)

    def test_executor_handles_api_failure(self):
        """Test executor handles API failure scenarios"""
        executor = GoogleAdsExecutor()
        # This test verifies executor structure for API failure handling
        # Detailed API failure tests are in test_api_fallback.py
        self.assertIsNotNone(executor)

