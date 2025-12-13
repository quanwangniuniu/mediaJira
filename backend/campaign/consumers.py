import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import CampaignTask


class CampaignConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time campaign execution updates.
    Handles connections to campaign-specific groups for live status updates, ROI alerts, and errors.
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.campaign_id = self.scope['url_route']['kwargs']['id']
        self.room_group_name = f'campaign_{self.campaign_id}'
        
        # Check if user is authenticated
        if isinstance(self.scope['user'], AnonymousUser):
            await self.close()
            return
        
        # Check if campaign task exists
        campaign_task = await self.get_campaign_task()
        if not campaign_task:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'task_id': str(self.campaign_id),
            'user_id': self.scope['user'].id,
            'username': self.scope['user'].username,
            'message': f'Connected to campaign {self.campaign_id} updates'
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'message')
            
            if message_type == 'ping':
                # Handle ping for connection keep-alive
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': text_data_json.get('timestamp')
                }))
            else:
                # Echo back other messages (for testing)
                await self.send(text_data=json.dumps({
                    'type': 'echo',
                    'message': text_data_json
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    @database_sync_to_async
    def get_campaign_task(self):
        """Get campaign task from database"""
        try:
            return CampaignTask.objects.get(campaign_task_id=self.campaign_id)
        except CampaignTask.DoesNotExist:
            return None
    
    # Handler methods for different event types
    
    async def statusUpdate(self, event):
        """Handle status update events"""
        await self.send(text_data=json.dumps({
            'type': 'statusUpdate',
            **event['payload']
        }))
    
    async def roiDrop(self, event):
        """Handle ROI drop alert events"""
        await self.send(text_data=json.dumps({
            'type': 'roiDrop',
            **event['payload']
        }))
    
    async def channelError(self, event):
        """Handle channel error events"""
        await self.send(text_data=json.dumps({
            'type': 'channelError',
            **event['payload']
        }))

