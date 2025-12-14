from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from django.core.exceptions import ValidationError


class BaseExecutor(ABC):
    """
    Abstract base class for channel executors.
    All executors must implement these methods.
    """
    
    def __init__(self, channel_config: Optional[Dict[str, Any]] = None):
        """
        Initialize executor with channel configuration.
        
        Args:
            channel_config: Optional configuration dict from ChannelConfig model
        """
        self.channel_config = channel_config or {}
    
    @abstractmethod
    def validate_config(self, audience_config: Dict[str, Any]) -> None:
        """
        Validate audience configuration for this channel.
        
        Args:
            audience_config: Audience configuration dict
            
        Raises:
            ValidationError: If configuration is invalid
        """
        pass
    
    @abstractmethod
    def launch(self, campaign_task) -> Dict[str, Any]:
        """
        Launch campaign on external platform.
        
        Args:
            campaign_task: CampaignTask instance
            
        Returns:
            Dict with keys:
                - success: bool
                - external_ids: Dict[str, Any] - External platform IDs
                - message: str (optional)
                - error: str (optional)
        """
        pass
    
    @abstractmethod
    def pause(self, campaign_task) -> Dict[str, Any]:
        """
        Pause campaign on external platform.
        
        Args:
            campaign_task: CampaignTask instance
            
        Returns:
            Dict with keys:
                - success: bool
                - message: str (optional)
                - error: str (optional)
        """
        pass
    
    @abstractmethod
    def resume(self, campaign_task) -> Dict[str, Any]:
        """
        Resume campaign on external platform.
        
        Args:
            campaign_task: CampaignTask instance
            
        Returns:
            Dict with keys:
                - success: bool
                - message: str (optional)
                - error: str (optional)
        """
        pass
    
    @abstractmethod
    def get_status(self, campaign_task) -> Dict[str, Any]:
        """
        Get current status from external platform.
        
        Args:
            campaign_task: CampaignTask instance
            
        Returns:
            Dict with keys:
                - success: bool
                - platform_status: str (optional)
                - native_status: str (optional)
                - raw: Dict[str, Any] (optional) - Raw platform response
                - error: str (optional)
        """
        pass
