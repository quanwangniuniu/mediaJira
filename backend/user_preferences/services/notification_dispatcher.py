from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, time
import pytz
from ..models import NotificationSettings, SlackIntegration, UserPreferences

User = get_user_model()

class NotificationDispatcher:
    """
    Mock notification dispatcher service for PROFILE-05
    
    Handles business logic for determining which channels should receive notifications
    and generates mock dispatch logs.
    """
    
    def dispatch_mock_notification(self, user_id, trigger_type, message):
        """
        Main method to process mock notification dispatch
        
        Returns dict with channels that would be notified and mock logs
        """
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return {
                'error': 'User not found',
                'channels_would_notify': [],
                'mock_logs': []
            }
        
        # Check quiet hours status
        if self._is_in_quiet_hours(user):
            return {
                'quiet_hours_active': True,
                'channels_would_notify': [],
                'mock_logs': [f"[MOCK NOTIFICATION] Skipped - User {user.username} is in quiet hours"]
            }
        
        # Find enabled notification channels for this trigger
        enabled_channels = self._get_enabled_channels(user, trigger_type)
        
        # Generate mock dispatch logs
        mock_logs = self._generate_mock_logs(user, trigger_type, message, enabled_channels)
        
        return {
            'user_id': user_id,
            'trigger_type': trigger_type,
            'quiet_hours_active': False,
            'channels_would_notify': [channel['name'] for channel in enabled_channels],
            'mock_logs': mock_logs
        }
    
    def _is_in_quiet_hours(self, user):
        """
        Check if user is currently in quiet hours based on their timezone
        """
        try:
            preferences = user.preferences
            if not preferences.quiet_hours_start or not preferences.quiet_hours_end:
                return False
            
            # Get user's timezone or default to UTC
            user_timezone = preferences.timezone or 'UTC'
            try:
                tz = pytz.timezone(user_timezone)
            except pytz.UnknownTimeZoneError:
                tz = pytz.UTC
            
            # Get current time in user's timezone
            now = timezone.now().astimezone(tz)
            current_time = now.time()
            
            quiet_start = preferences.quiet_hours_start
            quiet_end = preferences.quiet_hours_end
            
            # Handle quiet hours that span midnight
            if quiet_start <= quiet_end:
                # Same day: 22:00 - 08:00 next day
                return quiet_start <= current_time <= quiet_end
            else:
                # Spans midnight: 22:00 - 08:00
                return current_time >= quiet_start or current_time <= quiet_end
                
        except UserPreferences.DoesNotExist:
            return False
    
    def _get_enabled_channels(self, user, trigger_type):
        """
        Find all enabled notification channels for user and trigger type
        """
        enabled_channels = []
        
        # Get notification settings for this trigger
        settings = NotificationSettings.objects.filter(
            user=user,
            setting_key=trigger_type,
            enabled=True
        )
        
        for setting in settings:
            channel_info = {
                'id': setting.channel_id,
                'name': setting.channel_name,
                'type': setting.channel_name.lower()
            }
            
            # For Slack, check if user has active integration
            if setting.channel_id == 1:  # Slack channel
                if self._has_active_slack_integration(user):
                    slack_integration = SlackIntegration.objects.get(user=user, is_active=True)
                    channel_info['webhook_url'] = slack_integration.webhook_url
                    channel_info['channel_detail'] = slack_integration.channel_name or 'Default'
                    enabled_channels.append(channel_info)
            else:
                # For other channels (Email, SMS, etc.), just add them
                enabled_channels.append(channel_info)
        
        return enabled_channels
    
    def _has_active_slack_integration(self, user):
        """
        Check if user has an active Slack integration configured
        """
        return SlackIntegration.objects.filter(user=user, is_active=True).exists()
    
    def _generate_mock_logs(self, user, trigger_type, message, enabled_channels):
        """
        Generate mock notification logs as required by PROFILE-05
        """
        mock_logs = []
        
        if not enabled_channels:
            mock_logs.append(f"[MOCK NOTIFICATION] No enabled channels found for user {user.username}")
            return mock_logs
        
        # Header log
        mock_logs.append(f"[MOCK NOTIFICATION] User: {user.username}")
        mock_logs.append(f"[MOCK NOTIFICATION] Trigger: {trigger_type}")
        mock_logs.append(f"[MOCK NOTIFICATION] Message: {message}")
        
        # Channel-specific logs
        for channel in enabled_channels:
            if channel['type'] == 'slack':
                mock_logs.append(f"[MOCK SLACK] Webhook: {channel.get('webhook_url', 'N/A')}")
                mock_logs.append(f"[MOCK SLACK] Channel: {channel.get('channel_detail', 'Default')}")
                mock_logs.append(f"[MOCK SLACK] Message: {message}")
            elif channel['type'] == 'email':
                mock_logs.append(f"[MOCK EMAIL] Recipient: {user.email}")
                mock_logs.append(f"[MOCK EMAIL] Subject: {trigger_type.replace('_', ' ').title()} Alert")
                mock_logs.append(f"[MOCK EMAIL] Message: {message}")
            else:
                mock_logs.append(f"[MOCK {channel['type'].upper()}] Channel: {channel['name']}")
                mock_logs.append(f"[MOCK {channel['type'].upper()}] Message: {message}")
        
        # Summary log
        mock_logs.append(f"[MOCK NOTIFICATION] Would notify {len(enabled_channels)} channel(s)")
        
        return mock_logs