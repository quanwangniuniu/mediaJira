import time
import random
from typing import Dict, Any
from django.core.exceptions import ValidationError
from .base import BaseExecutor


class TikTokAdsExecutor(BaseExecutor):
    """
    Mock TikTok Ads executor for development/testing.
    Simulates API calls with delays and returns mock responses.
    """
    
    def validate_config(self, audience_config: Dict[str, Any]) -> None:
        """Validate TikTok Ads audience configuration"""
        if audience_config.get('type') != 'tiktok':
            raise ValidationError("Invalid audience config type for TikTok Ads")
        
        common = audience_config.get('common', {})
        if not common.get('locations'):
            raise ValidationError("TikTok Ads requires at least one location")
        
        tiktok = audience_config.get('tiktok', {})
        if not tiktok.get('objective'):
            raise ValidationError("TikTok Ads requires objective")
        if not tiktok.get('optimization_goal'):
            raise ValidationError("TikTok Ads requires optimization_goal")
        if not tiktok.get('bid_strategy'):
            raise ValidationError("TikTok Ads requires bid_strategy")
    
    def launch(self, campaign_task) -> Dict[str, Any]:
        """Mock launch to TikTok Ads"""
        # Simulate API delay
        time.sleep(0.7)
        
        # Generate mock external IDs
        campaign_id = f"tt_{random.randint(100000, 999999)}"
        ad_group_ids = [f"ag_{random.randint(10000, 99999)}" for _ in range(2)]
        ad_ids = [f"ad_{random.randint(1000, 9999)}" for _ in range(3)]
        
        external_ids = {
            'accountId': f"act_{random.randint(100000, 999999)}",
            'campaignId': campaign_id,
            'adGroupIds': ad_group_ids,
            'adIds': ad_ids,
        }
        
        return {
            'success': True,
            'external_ids': external_ids,
            'message': 'Campaign launched successfully on TikTok Ads'
        }
    
    def pause(self, campaign_task) -> Dict[str, Any]:
        """Mock pause on TikTok Ads"""
        time.sleep(0.4)
        return {
            'success': True,
            'message': 'Campaign paused successfully on TikTok Ads'
        }
    
    def resume(self, campaign_task) -> Dict[str, Any]:
        """Mock resume on TikTok Ads"""
        time.sleep(0.4)
        return {
            'success': True,
            'message': 'Campaign resumed successfully on TikTok Ads'
        }
    
    def get_status(self, campaign_task) -> Dict[str, Any]:
        """Mock status check from TikTok Ads"""
        time.sleep(0.3)
        
        # Simulate different statuses
        statuses = ['ENABLE', 'DISABLE', 'DELETE']
        platform_status = random.choice(statuses)
        
        return {
            'success': True,
            'platform_status': platform_status,
            'native_status': platform_status,
            'raw': {
                'status': platform_status,
                'stats': {
                    'impressions': random.randint(10000, 300000),
                    'clicks': random.randint(200, 15000),
                    'cost': round(random.uniform(300.0, 30000.0), 2),
                }
            }
        }
