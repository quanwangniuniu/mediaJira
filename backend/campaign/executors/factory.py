from typing import Optional
from .base import BaseExecutor
from .google_ads import GoogleAdsExecutor
from .facebook_ads import FacebookAdsExecutor
from .tiktok_ads import TikTokAdsExecutor


def get_executor(channel: str, channel_config: Optional[dict] = None) -> BaseExecutor:
    """
    Factory function to get appropriate executor for channel.
    
    Args:
        channel: Channel name (GoogleAds, FacebookAds, TikTokAds)
        channel_config: Optional channel configuration dict
        
    Returns:
        BaseExecutor instance
        
    Raises:
        ValueError: If channel is not supported
    """
    executor_map = {
        'GoogleAds': GoogleAdsExecutor,
        'FacebookAds': FacebookAdsExecutor,
        'TikTokAds': TikTokAdsExecutor,
    }
    
    executor_class = executor_map.get(channel)
    if not executor_class:
        raise ValueError(f"Unsupported channel: {channel}")
    
    return executor_class(channel_config=channel_config)

