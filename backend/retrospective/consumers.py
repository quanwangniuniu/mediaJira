import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import RetrospectiveTask, Insight, CampaignMetric


class RetrospectiveConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time retrospective updates.
    Handles connections to retrospective-specific groups for live updates.
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.retrospective_id = self.scope['url_route']['kwargs']['retrospective_id']
        self.room_group_name = f'retrospective_{self.retrospective_id}'
        
        # Check if user is authenticated
        if isinstance(self.scope['user'], AnonymousUser):
            await self.close()
            return
        
        # Check if retrospective exists
        retrospective = await self.get_retrospective()
        if not retrospective:
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
            'retrospective_id': self.retrospective_id,
            'user_id': self.scope['user'].id,
            'username': self.scope['user'].username,
            'message': f'Connected to retrospective {self.retrospective_id} updates'
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
    def get_retrospective(self):
        """Get retrospective from database"""
        try:
            # For now, we'll use RetrospectiveTask as the main model
            # This might need to be adjusted based on your actual retrospective model
            return RetrospectiveTask.objects.filter(id=self.retrospective_id).first()
        except Exception:
            return None
    
    # Handler methods for different event types
    
    async def task_status_changed(self, event):
        """Handle task status change events"""
        await self.send(text_data=json.dumps({
            'type': 'taskStatusChanged',
            'retrospective_id': event['retrospective_id'],
            'task_id': event['task_id'],
            'from': event['from_state'],
            'to': event['to_state'],
            'changed_by': event['changed_by'],
            'timestamp': event['timestamp'],
            'metadata': event.get('metadata', {})
        }))
    
    async def insight_added(self, event):
        """Handle insight addition events"""
        await self.send(text_data=json.dumps({
            'type': 'insightAdded',
            'retrospective_id': event['retrospective_id'],
            'insight_id': event['insight_id'],
            'user_id': event['user_id'],
            'content': event['content'],
            'timestamp': event['timestamp']
        }))
    
    async def metric_updated(self, event):
        """Handle metric update events"""
        await self.send(text_data=json.dumps({
            'type': 'metricUpdated',
            'retrospective_id': event['retrospective_id'],
            'metric_id': event['metric_id'],
            'metric_name': event['metric_name'],
            'old_value': event['old_value'],
            'new_value': event['new_value'],
            'updated_by': event['updated_by'],
            'timestamp': event['timestamp']
        }))
    
    async def retrospective_completed(self, event):
        """Handle retrospective completion events"""
        await self.send(text_data=json.dumps({
            'type': 'retrospectiveCompleted',
            'retrospective_id': event['retrospective_id'],
            'completed_by': event['completed_by'],
            'completion_summary': event.get('completion_summary'),
            'timestamp': event['timestamp']
        }))
    
    async def kpi_updated(self, event):
        """Handle KPI update events"""
        await self.send(text_data=json.dumps({
            'type': 'kpiUpdated',
            'retrospective_id': event['retrospective_id'],
            'kpi_name': event['kpi_name'],
            'old_value': event['old_value'],
            'new_value': event['new_value'],
            'updated_by': event['updated_by'],
            'timestamp': event['timestamp']
        }))
