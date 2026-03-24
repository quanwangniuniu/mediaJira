import logging
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Chat, ChatParticipant, Message, MessageStatus
from .services import OnlineStatusService, MessageService
from .tasks import build_realtime_message_payload

User = get_user_model()
logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat functionality.
    
    Connection URL: ws://localhost:8000/ws/chat/{user_id}/
    Authentication: JWT token in query string or Authorization header
    
    Message Types (client -> server):
    - chat_message: Send a message
    - typing_start: User started typing
    - typing_stop: User stopped typing
    - mark_as_read: Mark message as read
    - heartbeat: Keep connection alive
    
    Message Types (server -> client):
    - chat_message: New message received
    - message_status_update: Message status changed
    - typing_indicator: Someone is typing
    - error: Error occurred
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.user = self.scope.get('user')
        
        # Verify authentication
        if not self.user or not self.user.is_authenticated:
            logger.warning(f"Unauthenticated connection attempt for user {self.user_id}")
            await self.close(code=4001)
            return
        
        # Verify user ID matches authenticated user
        if str(self.user.id) != str(self.user_id):
            logger.warning(f"User {self.user.id} attempted to connect as user {self.user_id}")
            await self.close(code=4003)
            return
        
        # Join user's personal channel group
        self.user_group_name = f'chat_user_{self.user_id}'
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )
        
        # Mark user as online
        await database_sync_to_async(OnlineStatusService.set_online)(self.user.id)
        
        await self.accept()
        logger.info(f"[WebSocket] User {self.user_id} ({self.user.username}) connected and marked as ONLINE")
        
        # Send any queued messages
        await self.send_queued_messages()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        if hasattr(self, 'user_group_name'):
            # Leave user's personal channel group
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )
            
            # Mark user as offline
            if hasattr(self, 'user') and self.user:
                await database_sync_to_async(OnlineStatusService.set_offline)(self.user.id)
                logger.info(f"[WebSocket] User {self.user_id} ({self.user.username}) disconnected and marked as OFFLINE (code: {close_code})")
            else:
                logger.info(f"[WebSocket] User {self.user_id} disconnected (code: {close_code})")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'chat_message':
                await self.handle_chat_message(data)
            elif message_type == 'typing_start':
                await self.handle_typing_start(data)
            elif message_type == 'typing_stop':
                await self.handle_typing_stop(data)
            elif message_type == 'mark_as_read':
                await self.handle_mark_as_read(data)
            elif message_type == 'heartbeat':
                await self.handle_heartbeat(data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                await self.send_error(f"Unknown message type: {message_type}")
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received from user {self.user_id}")
            await self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error handling message from user {self.user_id}: {e}")
            await self.send_error(f"Error: {str(e)}")
    
    async def handle_chat_message(self, data):
        """Handle incoming chat message"""
        chat_id = data.get('chat_id')
        content = data.get('content')
        
        if not chat_id or not content:
            await self.send_error("chat_id and content are required")
            return
        
        try:
            # Create message in database
            message = await database_sync_to_async(self.create_message)(
                chat_id, content
            )
            
            # Send to all participants in the chat
            participants = await database_sync_to_async(self.get_chat_participants)(chat_id)
            
            message_data = {
                'type': 'chat_message',
                'message': {
                    'id': message.id,
                    'chat_id': chat_id,
                    'sender': {
                        'id': self.user.id,
                        'username': self.user.username,
                        'email': self.user.email,
                    },
                    'content': message.content,
                    'created_at': message.created_at.isoformat(),
                }
            }
            
            # Broadcast to all participants
            for participant_id in participants:
                await self.channel_layer.group_send(
                    f'chat_user_{participant_id}',
                    message_data
                )
            
            logger.info(f"Message {message.id} sent to chat {chat_id} by user {self.user_id}")
        
        except ValueError as e:
            await self.send_error(str(e))
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            await self.send_error("Failed to send message")
    
    async def handle_typing_start(self, data):
        """Handle typing start indicator"""
        chat_id = data.get('chat_id')
        
        if not chat_id:
            await self.send_error("chat_id is required")
            return
        
        try:
            # Broadcast to all participants except sender
            participants = await database_sync_to_async(self.get_chat_participants)(
                chat_id, exclude_user_id=self.user.id
            )
            
            for participant_id in participants:
                await self.channel_layer.group_send(
                    f'chat_user_{participant_id}',
                    {
                        'type': 'typing_indicator',
                        'chat_id': chat_id,
                        'user_id': self.user.id,
                        'is_typing': True,
                    }
                )
            
            logger.debug(f"Typing start sent for user {self.user_id} in chat {chat_id}")
        
        except Exception as e:
            logger.error(f"Error handling typing start: {e}")
    
    async def handle_typing_stop(self, data):
        """Handle typing stop indicator"""
        chat_id = data.get('chat_id')
        
        if not chat_id:
            await self.send_error("chat_id is required")
            return
        
        try:
            # Broadcast to all participants except sender
            participants = await database_sync_to_async(self.get_chat_participants)(
                chat_id, exclude_user_id=self.user.id
            )
            
            for participant_id in participants:
                await self.channel_layer.group_send(
                    f'chat_user_{participant_id}',
                    {
                        'type': 'typing_indicator',
                        'chat_id': chat_id,
                        'user_id': self.user.id,
                        'is_typing': False,
                    }
                )
            
            logger.debug(f"Typing stop sent for user {self.user_id} in chat {chat_id}")
        
        except Exception as e:
            logger.error(f"Error handling typing stop: {e}")
    
    async def handle_mark_as_read(self, data):
        """Handle mark as read request"""
        message_id = data.get('message_id')
        
        if not message_id:
            await self.send_error("message_id is required")
            return
        
        try:
            # Mark message as read
            await database_sync_to_async(self.mark_message_read)(message_id)
            
            # Get message sender to notify
            sender_id = await database_sync_to_async(self.get_message_sender)(message_id)
            
            # Notify sender
            await self.channel_layer.group_send(
                f'chat_user_{sender_id}',
                {
                    'type': 'message_status_update',
                    'message_id': message_id,
                    'user_id': self.user.id,
                    'status': 'read',
                }
            )
            
            logger.debug(f"Message {message_id} marked as read by user {self.user_id}")
        
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
            await self.send_error("Failed to mark message as read")
    
    async def handle_heartbeat(self, data):
        """Handle heartbeat to keep connection alive"""
        # Update online status
        await database_sync_to_async(OnlineStatusService.set_online)(self.user.id)
        logger.debug(f"[WebSocket] Heartbeat from user {self.user_id}, refreshed online status")
        
        # Send pong response
        await self.send(text_data=json.dumps({
            'type': 'pong',
            'timestamp': timezone.now().isoformat()
        }))
    
    async def send_queued_messages(self):
        """Send any queued messages for this user"""
        try:
            queued_messages = await database_sync_to_async(self.get_queued_messages)()
            
            for msg in queued_messages:
                await self.send(text_data=json.dumps({
                    'type': 'chat_message',
                    'message': msg
                }))
                
                # Mark as delivered - wrap everything in database_sync_to_async
                await database_sync_to_async(self._mark_message_delivered)(msg['id'])
            
            if queued_messages:
                logger.info(f"Sent {len(queued_messages)} queued messages to user {self.user_id}")
        
        except Exception as e:
            logger.error(f"Error sending queued messages: {e}")
    
    # Channel layer handlers (called by group_send)
    
    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))
    
    async def message_status_update(self, event):
        """Send message status update to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'message_status_update',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'status': event['status'],
        }))
    
    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'typing_indicator',
            'chat_id': event['chat_id'],
            'user_id': event['user_id'],
            'is_typing': event['is_typing'],
        }))
    
    async def chat_created(self, event):
        """Send new chat notification to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'chat_created',
            'chat': event['chat']
        }))
    
    async def send_error(self, message):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message
        }))
    
    # Database operations (sync)
    
    def create_message(self, chat_id, content):
        """Create a message in the database"""
        chat = Chat.objects.get(id=chat_id)
        return MessageService.create_message(chat, self.user, content)
    
    def get_chat_participants(self, chat_id, exclude_user_id=None):
        """Get list of participant IDs for a chat"""
        query = ChatParticipant.objects.filter(
            chat_id=chat_id,
            is_active=True
        )
        
        if exclude_user_id:
            query = query.exclude(user_id=exclude_user_id)
        
        return list(query.values_list('user_id', flat=True))
    
    def mark_message_read(self, message_id):
        """Mark a message as read"""
        message = Message.objects.get(id=message_id)
        MessageService.mark_message_as_read(message, self.user)
    
    def _mark_message_delivered(self, message_id):
        """Mark a message as delivered (helper for async context)"""
        message = Message.objects.get(id=message_id)
        MessageService.mark_message_as_delivered(message, self.user)
    
    def get_message_sender(self, message_id):
        """Get the sender ID of a message"""
        message = Message.objects.get(id=message_id)
        return message.sender.id
    
    def get_queued_messages(self):
        """Get queued messages for this user (messages with 'sent' status)"""
        statuses = MessageStatus.objects.filter(
            user=self.user,
            status='sent'
        ).select_related('message', 'message__sender', 'message__chat').prefetch_related('message__attachments')[:50]
        
        messages = []
        for status in statuses:
            msg = status.message
            messages.append(build_realtime_message_payload(msg))
        
        return messages
