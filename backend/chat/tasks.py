import logging
from typing import Any, Dict, Optional
from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.cache import cache
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Message, MessageStatus, ChatParticipant
from .services import OnlineStatusService

User = get_user_model()
logger = logging.getLogger(__name__)


def _build_forwarded_from_payload(message: Message) -> Optional[Dict[str, Any]]:
    """Build structured forwarded source payload for realtime message events."""
    is_forwarded = bool(
        message.forwarded_from_message_id
        or message.forwarded_from_sender_display
        or message.forwarded_from_created_at
    )
    if not is_forwarded:
        return None

    return {
        'message_id': message.forwarded_from_message_id,
        'sender_display': message.forwarded_from_sender_display or '',
        'created_at': message.forwarded_from_created_at.isoformat() if message.forwarded_from_created_at else None,
    }


def build_realtime_message_payload(message: Message) -> Dict[str, Any]:
    """Serialize message payload for websocket/celery delivery with attachments and forward metadata."""
    attachments = []
    for attachment in message.attachments.all():
        attachments.append({
            'id': attachment.id,
            'message': attachment.message_id,
            'file_type': attachment.file_type,
            'file_url': attachment.file.url if attachment.file else None,
            'thumbnail_url': attachment.thumbnail.url if attachment.thumbnail else None,
            'file_size': attachment.file_size,
            'file_size_display': attachment.file_size_display,
            'original_filename': attachment.original_filename,
            'mime_type': attachment.mime_type,
            'created_at': attachment.created_at.isoformat(),
        })

    forwarded_from = _build_forwarded_from_payload(message)
    return {
        'id': message.id,
        'chat_id': message.chat.id,
        'sender': {
            'id': message.sender.id,
            'username': message.sender.username,
            'email': message.sender.email,
        },
        'content': message.content,
        'created_at': message.created_at.isoformat(),
        'updated_at': message.updated_at.isoformat(),
        'has_attachments': bool(message.has_attachments or attachments),
        'attachment_count': len(attachments),
        'attachments': attachments,
        'is_forwarded': forwarded_from is not None,
        'forwarded_from': forwarded_from,
    }


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def deliver_message_task(self, message_id: int):
    """
    Celery task to deliver a message to offline users.
    
    This task is triggered when a message is sent to offline users.
    It stores the message in a queue and attempts delivery when users come online.
    
    Args:
        message_id: ID of the message to deliver
    """
    try:
        message = Message.objects.select_related('chat', 'sender').prefetch_related('attachments').get(id=message_id)
        message_payload = build_realtime_message_payload(message)
        
        # Get all recipients who haven't received the message
        pending_statuses = MessageStatus.objects.filter(
            message=message,
            status='sent'
        ).select_related('user')
        
        if not pending_statuses.exists():
            logger.info(f"No pending recipients for message {message_id}")
            return
        
        channel_layer = get_channel_layer()
        delivered_count = 0
        
        for msg_status in pending_statuses:
            user = msg_status.user
            
            # Check if user is online now
            if OnlineStatusService.is_online(user.id):
                try:
                    # Send via WebSocket
                    async_to_sync(channel_layer.group_send)(
                        f'chat_user_{user.id}',
                        {
                            'type': 'chat_message',
                            'message': message_payload
                        }
                    )
                    
                    # Mark as delivered
                    msg_status.mark_as_delivered()
                    delivered_count += 1
                    logger.info(f"Delivered message {message_id} to online user {user.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to send message {message_id} to user {user.id} via WebSocket: {e}")
            else:
                logger.debug(f"User {user.id} still offline for message {message_id}")
        
        # If there are still pending recipients, retry later
        if delivered_count < pending_statuses.count():
            logger.info(f"Message {message_id} has {pending_statuses.count() - delivered_count} pending recipients, will retry")
            raise self.retry(exc=Exception("Some recipients still offline"))
        
        logger.info(f"Message {message_id} delivered to all {delivered_count} recipients")
        
    except Message.DoesNotExist:
        logger.error(f"Message {message_id} not found")
    except Exception as e:
        logger.error(f"Error delivering message {message_id}: {e}")
        raise self.retry(exc=e)


@shared_task
def cleanup_old_online_status():
    """
    Celery periodic task to clean up stale online status entries.
    
    This is a fallback to ensure Redis doesn't accumulate stale entries.
    Should be run periodically (e.g., every hour).
    """
    try:
        # Get all keys matching the pattern
        pattern = f'{OnlineStatusService.ONLINE_KEY_PREFIX}:*'
        keys = cache.keys(pattern) if hasattr(cache, 'keys') else []
        
        cleaned = 0
        for key in keys:
            # Redis TTL will handle expiration, but we can force cleanup here if needed
            if not cache.get(key):
                cache.delete(key)
                cleaned += 1
        
        logger.info(f"Cleaned up {cleaned} stale online status entries")
        
    except Exception as e:
        logger.error(f"Error cleaning up online status: {e}")


@shared_task
def send_typing_indicator(chat_id: int, user_id: int, is_typing: bool):
    """
    Celery task to broadcast typing indicator to chat participants.
    
    Args:
        chat_id: ID of the chat
        user_id: ID of the user typing
        is_typing: True if user is typing, False if stopped
    """
    try:
        channel_layer = get_channel_layer()
        
        # Get all active participants except the typer
        participants = ChatParticipant.objects.filter(
            chat_id=chat_id,
            is_active=True
        ).exclude(user_id=user_id).values_list('user_id', flat=True)
        
        # Broadcast to all participants
        for participant_id in participants:
            async_to_sync(channel_layer.group_send)(
                f'chat_user_{participant_id}',
                {
                    'type': 'typing_indicator',
                    'chat_id': chat_id,
                    'user_id': user_id,
                    'is_typing': is_typing,
                }
            )
        
        logger.debug(f"Sent typing indicator for user {user_id} in chat {chat_id} to {len(participants)} participants")
        
    except Exception as e:
        logger.error(f"Error sending typing indicator: {e}")


@shared_task(bind=True, max_retries=3)
def update_message_status_task(self, message_id: int, user_id: int, status: str):
    """
    Celery task to update message status and notify sender.
    
    Args:
        message_id: ID of the message
        user_id: ID of the user whose status changed
        status: New status ('delivered' or 'read')
    """
    try:
        message = Message.objects.select_related('sender').get(id=message_id)
        msg_status = MessageStatus.objects.get(message=message, user_id=user_id)
        
        # Update status
        if status == 'delivered':
            msg_status.mark_as_delivered()
        elif status == 'read':
            msg_status.mark_as_read()
        else:
            logger.warning(f"Invalid status '{status}' for message {message_id}")
            return
        
        # Notify sender via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_user_{message.sender.id}',
            {
                'type': 'message_status_update',
                'message_id': message_id,
                'user_id': user_id,
                'status': status,
            }
        )
        
        logger.info(f"Updated message {message_id} status to '{status}' for user {user_id}")
        
    except (Message.DoesNotExist, MessageStatus.DoesNotExist) as e:
        logger.error(f"Message or status not found: {e}")
    except Exception as e:
        logger.error(f"Error updating message status: {e}")
        raise self.retry(exc=e)


@shared_task
def notify_new_message(message_id: int):
    """
    Celery task to notify all chat participants of a new message.
    
    This is called after a message is created to push notifications
    to all participants (both online and offline).
    
    Args:
        message_id: ID of the newly created message
    """
    try:
        message = Message.objects.select_related('chat', 'sender').prefetch_related('attachments').get(id=message_id)
        message_payload = build_realtime_message_payload(message)
        
        # Get all active participants except sender
        participants = ChatParticipant.objects.filter(
            chat=message.chat,
            is_active=True
        ).exclude(user=message.sender).select_related('user')
        
        channel_layer = get_channel_layer()
        offline_users = []
        
        for participant in participants:
            user = participant.user
            is_online = OnlineStatusService.is_online(user.id)
            
            logger.info(f"[notify_new_message] Checking user {user.id} ({user.username}) online status: {is_online}")
            
            if is_online:
                # User is online, send via WebSocket immediately
                try:
                    logger.info(f"[notify_new_message] Sending message {message_id} to ONLINE user {user.id} via WebSocket")
                    async_to_sync(channel_layer.group_send)(
                        f'chat_user_{user.id}',
                        {
                            'type': 'chat_message',
                            'message': message_payload
                        }
                    )
                    
                    # Mark as delivered
                    MessageStatus.objects.filter(
                        message=message,
                        user=user
                    ).update(status='delivered')
                    
                    logger.info(f"Successfully sent message {message_id} to online user {user.id}")
                    
                except Exception as e:
                    logger.error(f"Failed to send message to user {user.id}: {e}")
                    offline_users.append(user.id)
            else:
                # User is offline, queue for later delivery
                offline_users.append(user.id)
                logger.info(f"User {user.id} ({user.username}) is OFFLINE, queuing message {message_id}")
        
        # Schedule delivery task for offline users
        if offline_users:
            logger.info(f"Scheduling delivery task for message {message_id} to {len(offline_users)} offline users")
            deliver_message_task.apply_async(
                args=[message_id],
                countdown=5  # Retry after 5 seconds (reduced from 60)
            )
        
    except Message.DoesNotExist:
        logger.error(f"Message {message_id} not found")
    except Exception as e:
        logger.error(f"Error notifying new message {message_id}: {e}")
