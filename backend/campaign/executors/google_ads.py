import time
import random
from typing import Dict, Any
from django.core.exceptions import ValidationError
from .base import BaseExecutor


class GoogleAdsExecutor(BaseExecutor):
    """
    Mock Google Ads executor for development/testing.
    Simulates API calls with delays and returns mock responses.
    """
    
    def validate_config(self, audience_config: Dict[str, Any]) -> None:
        """Validate Google Ads audience configuration"""
        if audience_config.get('type') != 'google':
            raise ValidationError("Invalid audience config type for Google Ads")
        
        common = audience_config.get('common', {})
        if not common.get('locations'):
            raise ValidationError("Google Ads requires at least one location")
        
        google = audience_config.get('google', {})
        if not google.get('campaign_type'):
            raise ValidationError("Google Ads requires campaign_type")
        if not google.get('bidding_strategy'):
            raise ValidationError("Google Ads requires bidding_strategy")
    
    def launch(self, campaign_task) -> Dict[str, Any]:
        """Mock launch to Google Ads"""
        # Simulate API delay
        time.sleep(0.5)
        
        # Generate mock external IDs
        campaign_id = f"gcamp_{random.randint(100000, 999999)}"
        ad_group_ids = [f"ag_{random.randint(10000, 99999)}" for _ in range(2)]
        ad_ids = [f"ad_{random.randint(1000, 9999)}" for _ in range(3)]
        
        external_ids = {
            'accountId': self.channel_config.get('settings_json', {}).get('account_id', 'mock_account_123'),
            'campaignId': campaign_id,
            'adGroupIds': ad_group_ids,
            'adIds': ad_ids,
        }
        
        return {
            'success': True,
            'external_ids': external_ids,
            'message': 'Campaign launched successfully on Google Ads'
        }
    
    def pause(self, campaign_task) -> Dict[str, Any]:
        """Mock pause on Google Ads"""
        time.sleep(0.3)
        return {
            'success': True,
            'message': 'Campaign paused successfully on Google Ads'
        }
    
    def resume(self, campaign_task) -> Dict[str, Any]:
        """Mock resume on Google Ads"""
        time.sleep(0.3)
        return {
            'success': True,
            'message': 'Campaign resumed successfully on Google Ads'
        }
    
    def get_status(self, campaign_task) -> Dict[str, Any]:
        """Mock status check from Google Ads"""
        time.sleep(0.2)
        
        # Simulate different statuses
        statuses = ['ACTIVE', 'PAUSED', 'ENDED', 'REMOVED']
        platform_status = random.choice(statuses)
        
        return {
            'success': True,
            'platform_status': platform_status,
            'native_status': platform_status,
            'raw': {
                'status': platform_status,
                'stats': {
                    'impressions': random.randint(1000, 100000),
                    'clicks': random.randint(50, 5000),
                    'cost': round(random.uniform(100.0, 10000.0), 2),
                }
            }
        }
