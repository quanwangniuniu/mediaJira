import time
import random
from typing import Dict, Any
from django.core.exceptions import ValidationError
from .base import BaseExecutor


class FacebookAdsExecutor(BaseExecutor):
    """
    Mock Facebook Ads executor for development/testing.
    Simulates API calls with delays and returns mock responses.
    """
    
    def validate_config(self, audience_config: Dict[str, Any]) -> None:
        """Validate Facebook Ads audience configuration"""
        if audience_config.get('type') != 'facebook':
            raise ValidationError("Invalid audience config type for Facebook Ads")
        
        common = audience_config.get('common', {})
        if not common.get('locations'):
            raise ValidationError("Facebook Ads requires at least one location")
        
        facebook = audience_config.get('facebook', {})
        if not facebook.get('objective'):
            raise ValidationError("Facebook Ads requires objective")
        if not facebook.get('optimization_goal'):
            raise ValidationError("Facebook Ads requires optimization_goal")
        if not facebook.get('bid_strategy'):
            raise ValidationError("Facebook Ads requires bid_strategy")
    
    def launch(self, campaign_task) -> Dict[str, Any]:
        """Mock launch to Facebook Ads"""
        # Simulate API delay
        time.sleep(0.6)
        
        # Generate mock external IDs
        campaign_id = f"fb_{random.randint(100000000, 999999999)}"
        ad_set_ids = [f"ads_{random.randint(10000000, 99999999)}" for _ in range(2)]
        ad_ids = [f"ad_{random.randint(1000000, 9999999)}" for _ in range(4)]
        
        external_ids = {
            'accountId': f"act_{random.randint(100000000, 999999999)}",
            'campaignId': campaign_id,
            'adSetIds': ad_set_ids,
            'adIds': ad_ids,
        }
        
        return {
            'success': True,
            'external_ids': external_ids,
            'message': 'Campaign launched successfully on Facebook Ads'
        }
    
    def pause(self, campaign_task) -> Dict[str, Any]:
        """Mock pause on Facebook Ads"""
        time.sleep(0.4)
        return {
            'success': True,
            'message': 'Campaign paused successfully on Facebook Ads'
        }
    
    def resume(self, campaign_task) -> Dict[str, Any]:
        """Mock resume on Facebook Ads"""
        time.sleep(0.4)
        return {
            'success': True,
            'message': 'Campaign resumed successfully on Facebook Ads'
        }
    
    def get_status(self, campaign_task) -> Dict[str, Any]:
        """Mock status check from Facebook Ads"""
        time.sleep(0.3)
        
        # Simulate different statuses
        statuses = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED']
        platform_status = random.choice(statuses)
        
        return {
            'success': True,
            'platform_status': platform_status,
            'native_status': platform_status,
            'raw': {
                'status': platform_status,
                'stats': {
                    'impressions': random.randint(5000, 200000),
                    'clicks': random.randint(100, 10000),
                    'spend': round(random.uniform(200.0, 20000.0), 2),
                }
            }
        }
