import logging
from typing import Any, Dict, List, Optional, Tuple
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q, Prefetch
from django.core.cache import cache
from django.utils import timezone
from .models import Chat, ChatParticipant, Message, MessageStatus, ChatType
from core.models import ProjectMember

User = get_user_model()
logger = logging.getLogger(__name__)


class OnlineStatusService:
    """Service for managing user online status"""
    
    ONLINE_KEY_PREFIX = 'user_online'
    ONLINE_TIMEOUT = 60 * 5  # 5 minutes
    
    @classmethod
    def set_online(cls, user_id: int) -> None:
        """Mark user as online"""
        key = f'{cls.ONLINE_KEY_PREFIX}:{user_id}'
        cache.set(key, True, timeout=cls.ONLINE_TIMEOUT)
        logger.info(f"[OnlineStatus] User {user_id} marked as ONLINE (timeout: {cls.ONLINE_TIMEOUT}s)")
    
    @classmethod
    def set_offline(cls, user_id: int) -> None:
        """Mark user as offline"""
        key = f'{cls.ONLINE_KEY_PREFIX}:{user_id}'
        cache.delete(key)
        logger.info(f"[OnlineStatus] User {user_id} marked as OFFLINE")
    
    @classmethod
    def is_online(cls, user_id: int) -> bool:
        """Check if user is online"""
        key = f'{cls.ONLINE_KEY_PREFIX}:{user_id}'
        result = cache.get(key, False)
        logger.debug(f"[OnlineStatus] Checking user {user_id}: {result}")
        return result
    
    @classmethod
    def get_online_users(cls, user_ids: List[int]) -> List[int]:
        """Get list of online users from given user IDs"""
        online_users = []
        for user_id in user_ids:
            if cls.is_online(user_id):
                online_users.append(user_id)
        return online_users
    
    @classmethod
    def heartbeat(cls, user_id: int) -> None:
        """Update user's online status (extend timeout)"""
        cls.set_online(user_id)


class ChatService:
    """Service for chat-related business logic"""
    
    @staticmethod
    @transaction.atomic
    def create_private_chat(
        current_user: User,
        other_user: User,
        project_id: int
    ) -> Tuple[Chat, bool]:
        """
        Create or get existing private chat between two users.
        
        Returns:
            Tuple[Chat, bool]: (chat, created)
        """
        # Check if chat already exists
        existing_chat = Chat.objects.filter(
            project_id=project_id,
            type=ChatType.PRIVATE,
            participants__user=current_user
        ).filter(
            participants__user=other_user
        ).distinct().first()
        
        if existing_chat:
            logger.info(f"Found existing private chat {existing_chat.id} between users {current_user.id} and {other_user.id}")
            return existing_chat, False
        
        # Validate users can chat
        can_chat, reason = Chat.can_users_chat(current_user, other_user)
        if not can_chat:
            logger.warning(f"Users {current_user.id} and {other_user.id} cannot chat: {reason}")
            raise ValueError(f"Cannot create chat: {reason}")
        
        # Create new chat
        chat = Chat.objects.create(
            project_id=project_id,
            type=ChatType.PRIVATE
        )
        
        # Add participants
        ChatParticipant.objects.create(chat=chat, user=current_user, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=other_user, is_active=True)
        
        logger.info(f"Created private chat {chat.id} between users {current_user.id} and {other_user.id}")
        return chat, True
    
    @staticmethod
    @transaction.atomic
    def create_group_chat(
        current_user: User,
        project_id: int,
        name: str,
        participant_ids: List[int]
    ) -> Chat:
        """
        Create a group chat.
        
        Args:
            current_user: User creating the chat
            project_id: Project ID
            name: Chat name
            participant_ids: List of user IDs to add as participants
        
        Returns:
            Chat: Created chat
        """
        # Validate all participants are project members
        all_user_ids = participant_ids + [current_user.id]
        project_member_count = ProjectMember.objects.filter(
            project_id=project_id,
            user_id__in=all_user_ids,
            is_active=True
        ).count()
        
        if project_member_count != len(all_user_ids):
            logger.warning(f"Not all users are project members for project {project_id}")
            raise ValueError("All participants must be members of the project")
        
        # Create chat
        chat = Chat.objects.create(
            project_id=project_id,
            type=ChatType.GROUP,
            name=name
        )
        
        # Add participants
        ChatParticipant.objects.bulk_create([
            ChatParticipant(chat=chat, user_id=user_id, is_active=True)
            for user_id in all_user_ids
        ])
        
        logger.info(f"Created group chat {chat.id} '{name}' with {len(all_user_ids)} participants")
        return chat
    
    @staticmethod
    def get_user_chats(user: User, project_id: Optional[int] = None):
        """Get all chats for a user, optionally filtered by project"""
        query = Chat.objects.filter(
            participants__user=user,
            participants__is_active=True
        ).distinct()
        
        if project_id:
            query = query.filter(project_id=project_id)
        
        # Prefetch related data for performance
        query = query.prefetch_related(
            Prefetch(
                'participants',
                queryset=ChatParticipant.objects.select_related('user').filter(is_active=True)
            )
        ).select_related('project')
        
        return query
    
    @staticmethod
    @transaction.atomic
    def add_participant(chat: Chat, user: User, added_by: User) -> ChatParticipant:
        """
        Add a participant to a group chat.
        
        Args:
            chat: Chat to add participant to
            user: User to add
            added_by: User performing the action
        
        Returns:
            ChatParticipant: Created participant
        """
        if chat.type != ChatType.GROUP:
            raise ValueError("Can only add participants to group chats")
        
        # Check if added_by is a participant
        if not ChatParticipant.objects.filter(chat=chat, user=added_by, is_active=True).exists():
            raise ValueError("Only participants can add new members")
        
        # Check if user can join
        if not chat.can_user_join(user):
            raise ValueError("User cannot join this chat (not a project member)")
        
        # Check if already a participant
        existing = ChatParticipant.objects.filter(chat=chat, user=user).first()
        if existing:
            if existing.is_active:
                logger.warning(f"User {user.id} already active participant in chat {chat.id}")
                raise ValueError("User is already a participant")
            else:
                # Reactivate
                existing.is_active = True
                existing.joined_at = timezone.now()
                existing.save()
                logger.info(f"Reactivated participant {user.id} in chat {chat.id}")
                return existing
        
        # Add new participant
        participant = ChatParticipant.objects.create(
            chat=chat,
            user=user,
            is_active=True
        )
        
        logger.info(f"Added participant {user.id} to chat {chat.id} by user {added_by.id}")
        return participant
    
    @staticmethod
    @transaction.atomic
    def remove_participant(chat: Chat, user: User, removed_by: User) -> None:
        """
        Remove a participant from a group chat.
        
        Args:
            chat: Chat to remove participant from
            user: User to remove
            removed_by: User performing the action
        """
        if chat.type != ChatType.GROUP:
            raise ValueError("Can only remove participants from group chats")
        
        # Check if removed_by is a participant (or removing themselves)
        if removed_by != user:
            if not ChatParticipant.objects.filter(chat=chat, user=removed_by, is_active=True).exists():
                raise ValueError("Only participants can remove members")
        
        # Remove participant (soft delete)
        participant = ChatParticipant.objects.filter(chat=chat, user=user, is_active=True).first()
        if not participant:
            raise ValueError("User is not a participant")
        
        participant.is_active = False
        participant.save()
        
        logger.info(f"Removed participant {user.id} from chat {chat.id} by user {removed_by.id}")


class MessageService:
    """Service for message-related business logic"""
    
    @staticmethod
    @transaction.atomic
    def create_message(
        chat: Chat,
        sender: User,
        content: str,
        forwarded_from_message: Optional[Message] = None,
        forwarded_from_sender_display: Optional[str] = None,
        forwarded_from_created_at: Optional[timezone.datetime] = None,
    ) -> Message:
        """
        Create a message in a chat.
        
        Args:
            chat: Chat to send message to
            sender: User sending the message
            content: Message content
            forwarded_from_message: Forwarded source message reference
            forwarded_from_sender_display: Snapshot of source sender display
            forwarded_from_created_at: Snapshot of source message created_at
        
        Returns:
            Message: Created message
        """
        # Validate sender is a participant
        if not ChatParticipant.objects.filter(chat=chat, user=sender, is_active=True).exists():
            logger.warning(f"User {sender.id} is not a participant of chat {chat.id}")
            raise ValueError("You are not a participant of this chat")
        
        # Create message
        message = Message.objects.create(
            chat=chat,
            sender=sender,
            content=content,
            forwarded_from_message=forwarded_from_message,
            forwarded_from_sender_display=forwarded_from_sender_display,
            forwarded_from_created_at=forwarded_from_created_at,
        )
        
        # Create message status for all recipients (excluding sender)
        recipients = ChatParticipant.objects.filter(
            chat=chat,
            is_active=True
        ).exclude(user=sender).select_related('user')
        
        MessageStatus.objects.bulk_create([
            MessageStatus(
                message=message,
                user=recipient.user,
                status='sent'
            )
            for recipient in recipients
        ])
        
        logger.info(f"Created message {message.id} in chat {chat.id} by user {sender.id}")
        return message
    
    @staticmethod
    def get_chat_messages(
        chat: Chat,
        user: User,
        before: Optional[timezone.datetime] = None,
        after: Optional[timezone.datetime] = None,
        limit: int = 20
    ):
        """
        Get messages for a chat with cursor-based pagination.
        
        Args:
            chat: Chat to get messages from
            user: User requesting messages
            before: Get messages before this timestamp (for scrolling up)
            after: Get messages after this timestamp (for new messages)
            limit: Maximum number of messages to return
        
        Returns:
            QuerySet: Messages
        """
        # Validate user is a participant
        if not ChatParticipant.objects.filter(chat=chat, user=user, is_active=True).exists():
            raise ValueError("You are not a participant of this chat")
        
        query = Message.objects.filter(
            chat=chat,
            is_deleted=False
        ).select_related('sender')
        
        if before:
            query = query.filter(created_at__lt=before)
        
        if after:
            query = query.filter(created_at__gt=after)
        
        # Order by created_at descending for "before" (scrolling up)
        # Order by created_at ascending for "after" (new messages)
        if after:
            query = query.order_by('created_at')
        else:
            query = query.order_by('-created_at')
        
        return query[:limit]
    
    @staticmethod
    @transaction.atomic
    def mark_message_as_delivered(message: Message, user: User) -> None:
        """Mark a message as delivered for a user"""
        try:
            status = MessageStatus.objects.get(message=message, user=user)
            if status.status == 'sent':
                status.mark_as_delivered()
                logger.info(f"Marked message {message.id} as delivered for user {user.id}")
        except MessageStatus.DoesNotExist:
            logger.warning(f"MessageStatus not found for message {message.id} and user {user.id}")
    
    @staticmethod
    @transaction.atomic
    def mark_message_as_read(message: Message, user: User) -> None:
        """Mark a message as read for a user"""
        try:
            status = MessageStatus.objects.get(message=message, user=user)
            status.mark_as_read()
            logger.info(f"Marked message {message.id} as read for user {user.id}")
        except MessageStatus.DoesNotExist:
            logger.warning(f"MessageStatus not found for message {message.id} and user {user.id}")
    
    @staticmethod
    @transaction.atomic
    def mark_chat_as_read(chat: Chat, user: User, up_to_message: Optional[Message] = None) -> None:
        """
        Mark all messages in a chat as read for a user.
        
        Args:
            chat: Chat to mark as read
            user: User marking as read
            up_to_message: Optional message to mark up to (inclusive)
        """
        # Update participant's last_read_at
        participant = ChatParticipant.objects.filter(chat=chat, user=user, is_active=True).first()
        if not participant:
            raise ValueError("You are not a participant of this chat")
        
        if up_to_message:
            # Mark up to specific message
            participant.last_read_at = up_to_message.created_at
            participant.save()
            
            # Mark all message statuses as read up to this message
            MessageStatus.objects.filter(
                message__chat=chat,
                message__created_at__lte=up_to_message.created_at,
                user=user,
                status__in=['sent', 'delivered']
            ).update(
                status='read',
                read_at=timezone.now()
            )
            
            logger.info(f"Marked messages up to {up_to_message.id} as read for user {user.id} in chat {chat.id}")
        else:
            # Mark all messages as read
            old_last_read_at = participant.last_read_at
            participant.last_read_at = timezone.now()
            participant.save()
            
            # Verify the save worked by reloading from DB
            participant.refresh_from_db()
            
            logger.info(
                f"mark_chat_as_read: chat={chat.id}, user={user.id}, "
                f"old_last_read_at={old_last_read_at}, new_last_read_at={participant.last_read_at}, "
                f"unread_count_after={participant.get_unread_count()}"
            )
            
            MessageStatus.objects.filter(
                message__chat=chat,
                user=user,
                status__in=['sent', 'delivered']
            ).update(
                status='read',
                read_at=timezone.now()
            )
            
            logger.info(f"Marked all messages as read for user {user.id} in chat {chat.id}")
    
    @staticmethod
    def get_unread_count(user: User, chat: Optional[Chat] = None) -> int:
        """
        Get unread message count for a user.
        Uses ChatParticipant.get_unread_count() as single source of truth.
        
        Args:
            user: User to check
            chat: Optional specific chat to check (if None, returns total across all chats)
        
        Returns:
            int: Unread message count
        """
        if chat:
            # Get unread count for a specific chat
            try:
                participant = ChatParticipant.objects.get(
                    chat=chat,
                    user=user,
                    is_active=True
                )
                return participant.get_unread_count()
            except ChatParticipant.DoesNotExist:
                return 0
        else:
            # Get total unread count across all chats
            total = 0
            participants = ChatParticipant.objects.filter(
                user=user,
                is_active=True
            ).select_related('chat')
            
            for participant in participants:
                total += participant.get_unread_count()
            
            return total

    @staticmethod
    def forward_messages_batch(
        *,
        source_chat_id: int,
        source_message_ids: List[int],
        target_chat_ids: List[int],
        target_user_ids: List[int],
        user: User
    ) -> Dict[str, Any]:
        """
        Forward multiple source messages to multiple target chats and users.

        Notes:
        - Supports partial success.
        - Skips non-text or attachment messages for v1.
        """
        source_chat = Chat.objects.select_related('project').filter(id=source_chat_id).first()
        if not source_chat:
            raise ValueError("Source chat not found")

        if not ChatParticipant.objects.filter(chat=source_chat, user=user, is_active=True).exists():
            raise ValueError("You are not a participant of the source chat")

        source_messages = list(
            Message.objects.filter(
                chat=source_chat,
                id__in=source_message_ids,
                is_deleted=False
            )
            .select_related('sender')
            .prefetch_related('attachments')
            .order_by('created_at')
        )

        found_message_ids = {msg.id for msg in source_messages}
        missing_message_ids = [msg_id for msg_id in source_message_ids if msg_id not in found_message_ids]
        if missing_message_ids:
            raise ValueError(f"Invalid source_message_ids for this chat: {missing_message_ids}")

        forwardable_messages: List[Message] = []
        skipped_message_ids: List[int] = []
        for message in source_messages:
            has_text = bool((message.content or '').strip())
            has_attachments = len(list(message.attachments.all())) > 0
            if not has_text or has_attachments:
                skipped_message_ids.append(message.id)
            else:
                forwardable_messages.append(message)

        resolved_target_chat_ids = set()
        created_private_chat_ids = set()
        resolution_errors: List[Dict[str, Any]] = []

        for target_chat_id in target_chat_ids:
            target_chat = Chat.objects.filter(id=target_chat_id).first()
            if not target_chat:
                resolution_errors.append({
                    'target_chat_id': target_chat_id,
                    'reason': 'target_chat_not_found'
                })
                continue

            if target_chat.project_id != source_chat.project_id:
                resolution_errors.append({
                    'target_chat_id': target_chat_id,
                    'reason': 'target_chat_project_mismatch'
                })
                continue

            if not ChatParticipant.objects.filter(
                chat=target_chat,
                user=user,
                is_active=True
            ).exists():
                resolution_errors.append({
                    'target_chat_id': target_chat_id,
                    'reason': 'not_participant'
                })
                continue

            resolved_target_chat_ids.add(target_chat.id)

        target_users = User.objects.filter(id__in=target_user_ids)
        users_by_id = {u.id: u for u in target_users}
        project_member_ids = set(
            ProjectMember.objects.filter(
                project=source_chat.project,
                user_id__in=target_user_ids,
                is_active=True
            ).values_list('user_id', flat=True)
        )

        for target_user_id in target_user_ids:
            if target_user_id == user.id:
                resolution_errors.append({
                    'target_user_id': target_user_id,
                    'reason': 'target_user_is_self'
                })
                continue

            target_user = users_by_id.get(target_user_id)
            if not target_user:
                resolution_errors.append({
                    'target_user_id': target_user_id,
                    'reason': 'target_user_not_found'
                })
                continue

            if target_user_id not in project_member_ids:
                resolution_errors.append({
                    'target_user_id': target_user_id,
                    'reason': 'target_user_not_project_member'
                })
                continue

            try:
                private_chat, created = ChatService.create_private_chat(
                    current_user=user,
                    other_user=target_user,
                    project_id=source_chat.project_id
                )
                resolved_target_chat_ids.add(private_chat.id)
                if created:
                    created_private_chat_ids.add(private_chat.id)
            except ValueError:
                resolution_errors.append({
                    'target_user_id': target_user_id,
                    'reason': 'cannot_create_private_chat'
                })

        sorted_target_chat_ids = sorted(resolved_target_chat_ids)
        failures: List[Dict[str, Any]] = []
        attempted_sends = 0
        succeeded_sends = 0

        # Expand target resolution failures into message-level failures for clearer UI reporting.
        if forwardable_messages:
            for resolution_error in resolution_errors:
                for source_message in forwardable_messages:
                    failures.append({
                        'target_chat_id': resolution_error.get('target_chat_id'),
                        'target_user_id': resolution_error.get('target_user_id'),
                        'source_message_id': source_message.id,
                        'reason': resolution_error['reason']
                    })

        for target_chat_id in sorted_target_chat_ids:
            target_chat = Chat.objects.filter(id=target_chat_id).first()
            if not target_chat:
                for source_message in forwardable_messages:
                    failures.append({
                        'target_chat_id': target_chat_id,
                        'source_message_id': source_message.id,
                        'reason': 'target_chat_not_found'
                    })
                continue

            for source_message in forwardable_messages:
                attempted_sends += 1
                try:
                    forwarded_content = (source_message.content or '').strip()
                    if not forwarded_content.strip():
                        failures.append({
                            'target_chat_id': target_chat_id,
                            'source_message_id': source_message.id,
                            'reason': 'empty_forward_content'
                        })
                        continue

                    new_message = MessageService.create_message(
                        chat=target_chat,
                        sender=user,
                        content=forwarded_content,
                        forwarded_from_message=source_message,
                        forwarded_from_sender_display=(
                            source_message.sender.username or source_message.sender.email
                        ),
                        forwarded_from_created_at=source_message.created_at,
                    )

                    from .tasks import notify_new_message
                    notify_new_message.delay(new_message.id)
                    succeeded_sends += 1
                except Exception as exc:
                    logger.warning(
                        "forward_messages_batch send_failed source_chat=%s source_message=%s target_chat=%s error=%s",
                        source_chat.id,
                        source_message.id,
                        target_chat_id,
                        str(exc)
                    )
                    failures.append({
                        'target_chat_id': target_chat_id,
                        'source_message_id': source_message.id,
                        'reason': 'send_failed'
                    })

        if succeeded_sends == 0:
            status_value = 'failed'
        elif failures or skipped_message_ids:
            status_value = 'partial_success'
        else:
            status_value = 'success'

        result = {
            'status': status_value,
            'summary': {
                'requested_messages': len(source_message_ids),
                'forwardable_messages': len(forwardable_messages),
                'target_chats': len(sorted_target_chat_ids),
                'attempted_sends': attempted_sends,
                'succeeded_sends': succeeded_sends,
                'failed_sends': len(failures),
            },
            'resolved': {
                'target_chat_ids': sorted_target_chat_ids,
                'created_private_chat_ids': sorted(created_private_chat_ids),
                'skipped_message_ids': skipped_message_ids,
            },
            'failures': failures,
        }

        logger.info(
            "forward_messages_batch source_chat=%s source_messages=%s target_chats=%s status=%s succeeded=%s failed=%s skipped=%s",
            source_chat.id,
            len(source_message_ids),
            len(sorted_target_chat_ids),
            status_value,
            succeeded_sends,
            len(failures),
            len(skipped_message_ids)
        )
        return result
