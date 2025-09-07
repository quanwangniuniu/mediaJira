import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import CampaignTask


class CampaignExecutionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time campaign execution updates.
    Handles status changes, ROI alerts, and execution errors.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.campaign_id = self.scope['url_route']['kwargs']['campaign_id']
        self.campaign_group_name = f'campaign_{self.campaign_id}'
        
        # Check if user has permission to access this campaign
        user = self.scope.get('user')
        if isinstance(user, AnonymousUser):
            await self.close()
            return
        
        # Verify campaign exists and user has access
        campaign = await self.get_campaign(self.campaign_id)
        if not campaign:
            await self.close()
            return
        
        if not await self.has_campaign_access(user, campaign):
            await self.close()
            return
        
        # Join campaign group
        await self.channel_layer.group_add(
            self.campaign_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial status
        await self.send_initial_status(campaign)
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave campaign group
        await self.channel_layer.group_discard(
            self.campaign_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle messages received from WebSocket."""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            elif message_type == 'subscribe_metrics':
                # Client wants to receive metric updates
                await self.send(text_data=json.dumps({
                    'type': 'subscription_confirmed',
                    'message': 'Subscribed to metric updates'
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    # WebSocket event handlers
    async def statusChanged(self, event):
        """Handle status change events."""
        await self.send(text_data=json.dumps({
            'type': 'status_changed',
            'data': event['payload']
        }))
    
    async def roiAlert(self, event):
        """Handle ROI alert events."""
        await self.send(text_data=json.dumps({
            'type': 'roi_alert',
            'data': event['payload']
        }))
    
    async def executionError(self, event):
        """Handle execution error events."""
        await self.send(text_data=json.dumps({
            'type': 'execution_error',
            'data': event['payload']
        }))
    
    async def metricUpdate(self, event):
        """Handle metric update events."""
        await self.send(text_data=json.dumps({
            'type': 'metric_update',
            'data': event['payload']
        }))
    
    # Helper methods
    @database_sync_to_async
    def get_campaign(self, campaign_id):
        """Get campaign by ID."""
        try:
            return CampaignTask.objects.get(pk=campaign_id)
        except CampaignTask.DoesNotExist:
            return None
    
    @database_sync_to_async
    def has_campaign_access(self, user, campaign):
        """Check if user has access to the campaign."""
        # Campaign creator has access
        if campaign.created_by == user:
            return True
        
        # Check team-based access
        if hasattr(user, 'team') and hasattr(campaign.created_by, 'team'):
            return user.team == campaign.created_by.team
        
        # Check role-based access
        user_roles = getattr(user, 'roles', [])
        allowed_roles = ['Specialist', 'Senior Media Buyer', 'Admin']
        
        return any(role in allowed_roles for role in user_roles)
    
    async def send_initial_status(self, campaign):
        """Send initial campaign status to the client."""
        await self.send(text_data=json.dumps({
            'type': 'initial_status',
            'data': {
                'campaign_id': campaign.pk,
                'title': campaign.title,
                'status': campaign.status,
                'platform_status': campaign.platform_status,
                'channel': campaign.channel,
                'scheduled_date': campaign.scheduled_date.isoformat() if campaign.scheduled_date else None,
                'end_date': campaign.end_date.isoformat() if campaign.end_date else None,
                'roi_threshold': float(campaign.roi_threshold) if campaign.roi_threshold else None,
                'paused_reason': campaign.paused_reason,
                'last_updated': campaign.updated_at.isoformat()
            }
        }))


class CampaignListConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for campaign list updates.
    Handles notifications for multiple campaigns.
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        user = self.scope.get('user')
        if isinstance(user, AnonymousUser):
            await self.close()
            return
        
        # Create user-specific group
        self.user_group_name = f'user_{user.id}_campaigns'
        
        # Join user group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave user group
        await self.channel_layer.group_discard(
            self.user_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle messages received from WebSocket."""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    # WebSocket event handlers
    async def campaignCreated(self, event):
        """Handle campaign creation events."""
        await self.send(text_data=json.dumps({
            'type': 'campaign_created',
            'data': event['payload']
        }))
    
    async def campaignUpdated(self, event):
        """Handle campaign update events."""
        await self.send(text_data=json.dumps({
            'type': 'campaign_updated',
            'data': event['payload']
        }))
    
    async def campaignDeleted(self, event):
        """Handle campaign deletion events."""
        await self.send(text_data=json.dumps({
            'type': 'campaign_deleted',
            'data': event['payload']
        }))
