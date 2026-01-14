import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Prefetch
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime
from .models import Chat, ChatParticipant, Message, MessageStatus, ChatType
from .serializers import (
    ChatSerializer,
    ChatListSerializer,
    ChatCreateSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    ChatParticipantSerializer,
    MarkAsReadSerializer,
)
from .services import ChatService, MessageService, OnlineStatusService
from .tasks import notify_new_message

logger = logging.getLogger(__name__)


class ChatViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing chats.
    
    Endpoints:
    - GET /chats/ - List user's chats
    - POST /chats/ - Create a new chat
    - GET /chats/{id}/ - Get chat details
    - DELETE /chats/{id}/ - Leave a chat (soft delete for user)
    - POST /chats/{id}/add_participant/ - Add participant to group chat
    - POST /chats/{id}/remove_participant/ - Remove participant from group chat
    - POST /chats/{id}/mark_as_read/ - Mark all messages as read
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get chats where user is a participant"""
        # For retrieve/detail actions, return all chats (permission checked in retrieve method)
        if self.action == 'retrieve':
            return Chat.objects.all()
        
        # For list and other actions, filter by user participation
        user = self.request.user
        project_id = self.request.query_params.get('project_id')
        
        return ChatService.get_user_chats(user, project_id)
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ChatListSerializer
        elif self.action == 'create':
            return ChatCreateSerializer
        return ChatSerializer
    
    def list(self, request, *args, **kwargs):
        """
        List user's chats with pagination.
        
        Query params:
        - project_id: Filter by project (optional)
        - page: Page number (default: 1)
        - page_size: Items per page (default: 20)
        """
        logger.info(f"User {request.user.id} listing chats")
        
        queryset = self.get_queryset()
        
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        start = (page - 1) * page_size
        end = start + page_size
        
        chats = queryset[start:end]
        serializer = self.get_serializer(chats, many=True)
        
        return Response({
            'results': serializer.data,
            'page': page,
            'page_size': page_size,
            'total': queryset.count()
        })
    
    def create(self, request, *args, **kwargs):
        """
        Create a new chat (private or group).
        
        Body:
        - project: Project ID
        - type: 'private' or 'group'
        - name: Chat name (required for group chats)
        - participant_ids: List of user IDs
        """
        logger.info(f"User {request.user.id} creating chat: {request.data}")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        chat = serializer.save()
        
        # Return full chat details
        response_serializer = ChatSerializer(chat, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Get chat details"""
        chat = self.get_object()
        
        # Verify user is a participant
        if not ChatParticipant.objects.filter(
            chat=chat,
            user=request.user,
            is_active=True
        ).exists():
            logger.warning(f"User {request.user.id} attempted to access chat {chat.id} without permission")
            return Response(
                {'error': 'You are not a participant of this chat'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(chat)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """
        Leave a chat (soft delete for current user).
        
        For private chats: User leaves the chat
        For group chats: User can leave voluntarily
        """
        chat = self.get_object()
        
        try:
            ChatService.remove_participant(chat, request.user, request.user)
            logger.info(f"User {request.user.id} left chat {chat.id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as e:
            logger.warning(f"Failed to remove user {request.user.id} from chat {chat.id}: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        """
        Add a participant to a group chat.
        
        Body:
        - user_id: ID of user to add
        """
        chat = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
            
            participant = ChatService.add_participant(chat, user, request.user)
            
            serializer = ChatParticipantSerializer(participant)
            logger.info(f"User {request.user.id} added user {user_id} to chat {chat.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            logger.warning(f"Failed to add user {user_id} to chat {chat.id}: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        """
        Remove a participant from a group chat.
        
        Body:
        - user_id: ID of user to remove
        """
        chat = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=user_id)
            
            ChatService.remove_participant(chat, user, request.user)
            logger.info(f"User {request.user.id} removed user {user_id} from chat {chat.id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError as e:
            logger.warning(f"Failed to remove user {user_id} from chat {chat.id}: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Mark all messages in a chat as read (up to a specific message).
        
        Body (optional):
        - message_id: Mark messages up to this message (inclusive)
        """
        chat = self.get_object()
        
        serializer = MarkAsReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        message_id = serializer.validated_data.get('message_id')
        message = None
        
        if message_id:
            message = get_object_or_404(Message, id=message_id, chat=chat)
        
        try:
            MessageService.mark_chat_as_read(chat, request.user, message)
            logger.info(f"User {request.user.id} marked chat {chat.id} as read")
            return Response({'status': 'success'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing messages.
    
    Endpoints:
    - GET /messages/?chat_id=X - List messages for a chat (with cursor pagination)
    - POST /messages/ - Send a message
    - GET /messages/{id}/ - Get message details
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer
    
    def get_queryset(self):
        """Get messages for a specific chat"""
        # For retrieve/detail actions, return all messages (permission checked in retrieve method)
        if self.action in ['retrieve', 'mark_as_read']:
            return Message.objects.all()
        
        # For list action, require chat_id
        chat_id = self.request.query_params.get('chat_id')
        
        if not chat_id:
            return Message.objects.none()
        
        # Verify user is a participant
        if not ChatParticipant.objects.filter(
            chat_id=chat_id,
            user=self.request.user,
            is_active=True
        ).exists():
            return Message.objects.none()
        
        return Message.objects.filter(
            chat_id=chat_id,
            is_deleted=False
        ).select_related('sender').order_by('-created_at')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer
    
    def list(self, request, *args, **kwargs):
        """
        List messages with cursor-based pagination.
        
        Query params:
        - chat_id: Chat ID (required)
        - before: Get messages before this timestamp (ISO format)
        - after: Get messages after this timestamp (ISO format)
        - page_size: Number of messages (default: 20, max: 100)
        """
        chat_id = request.query_params.get('chat_id')
        
        if not chat_id:
            return Response(
                {'error': 'chat_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response(
                {'error': 'Chat not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Parse cursor parameters
        before_str = request.query_params.get('before')
        after_str = request.query_params.get('after')
        page_size = min(int(request.query_params.get('page_size', 20)), 100)
        
        before = None
        after = None
        
        if before_str:
            try:
                before = datetime.fromisoformat(before_str.replace('Z', '+00:00'))
            except ValueError:
                return Response(
                    {'error': 'Invalid before timestamp format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if after_str:
            try:
                after = datetime.fromisoformat(after_str.replace('Z', '+00:00'))
            except ValueError:
                return Response(
                    {'error': 'Invalid after timestamp format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        try:
            messages = MessageService.get_chat_messages(
                chat,
                request.user,
                before=before,
                after=after,
                limit=page_size
            )
            
            serializer = self.get_serializer(messages, many=True)
            
            # Generate cursors for pagination
            data = serializer.data
            next_cursor = None
            prev_cursor = None
            
            if data:
                # For "before" queries (scrolling up), reverse the order
                if not after:
                    data = list(reversed(data))
                
                # Set cursors
                if len(data) == page_size:
                    # There might be more messages
                    if after:
                        next_cursor = data[-1]['created_at']
                    else:
                        prev_cursor = data[0]['created_at']
            
            return Response({
                'results': data,
                'next_cursor': next_cursor,
                'prev_cursor': prev_cursor,
                'page_size': page_size
            })
            
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)
    
    def create(self, request, *args, **kwargs):
        """
        Send a message to a chat.
        
        Body:
        - chat: Chat ID
        - content: Message content
        """
        logger.info(f"User {request.user.id} sending message to chat {request.data.get('chat')}")
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Create message via service
            message = MessageService.create_message(
                chat=serializer.validated_data['chat'],
                sender=request.user,
                content=serializer.validated_data['content']
            )
            
            # Trigger async notification task
            notify_new_message.delay(message.id)
            
            # Return message details
            response_serializer = MessageSerializer(message, context={'request': request})
            logger.info(f"Message {message.id} created successfully")
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            logger.warning(f"Failed to create message: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def retrieve(self, request, *args, **kwargs):
        """Get message details"""
        message = self.get_object()
        
        # Verify user is a participant of the chat
        if not ChatParticipant.objects.filter(
            chat=message.chat,
            user=request.user,
            is_active=True
        ).exists():
            return Response(
                {'error': 'You are not a participant of this chat'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Mark a specific message as read.
        """
        message = self.get_object()
        
        try:
            MessageService.mark_message_as_read(message, request.user)
            logger.info(f"User {request.user.id} marked message {message.id} as read")
            return Response({'status': 'success'})
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Get unread message count for current user.
        
        Query params:
        - chat_id: Get unread count for specific chat (optional)
        """
        chat_id = request.query_params.get('chat_id')
        chat = None
        
        if chat_id:
            try:
                chat = Chat.objects.get(id=chat_id)
            except Chat.DoesNotExist:
                return Response(
                    {'error': 'Chat not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        count = MessageService.get_unread_count(request.user, chat)
        
        return Response({
            'unread_count': count,
            'chat_id': chat_id
        })
