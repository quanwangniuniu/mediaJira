from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from .models import Chat, ChatParticipant, Message, MessageStatus, ChatType
from core.models import ProjectMember

User = get_user_model()


class UserSimpleSerializer(serializers.ModelSerializer):
    """Simplified user serializer for chat context"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = fields


class ChatParticipantSerializer(serializers.ModelSerializer):
    """Serializer for chat participants"""
    user = UserSimpleSerializer(read_only=True)
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatParticipant
        fields = [
            'id', 'user', 'chat', 'joined_at', 
            'last_read_at', 'is_active', 'unread_count'
        ]
        read_only_fields = ['id', 'joined_at']
    
    def get_unread_count(self, obj):
        """Calculate unread message count for this participant"""
        if obj.last_read_at:
            return Message.objects.filter(
                chat=obj.chat,
                created_at__gt=obj.last_read_at,
                is_deleted=False
            ).exclude(sender=obj.user).count()
        else:
            # Never read any messages
            return Message.objects.filter(
                chat=obj.chat,
                is_deleted=False
            ).exclude(sender=obj.user).count()


class MessageStatusSerializer(serializers.ModelSerializer):
    """Serializer for message status"""
    user = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = MessageStatus
        fields = [
            'id', 'message', 'user', 'status', 
            'delivered_at', 'read_at', 'created_at'
        ]
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages"""
    sender = UserSimpleSerializer(read_only=True)
    status = serializers.SerializerMethodField()
    statuses = MessageStatusSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'chat', 'sender', 'content', 'status', 'statuses',
            'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'sender', 'created_at', 'updated_at']
    
    def get_status(self, obj):
        """Get message status for the current user"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 'sent'
        
        # If sender, always show as 'sent'
        if obj.sender == request.user:
            return 'sent'
        
        # Get status for current user
        try:
            msg_status = MessageStatus.objects.get(
                message=obj,
                user=request.user
            )
            return msg_status.status
        except MessageStatus.DoesNotExist:
            return 'sent'
    
    def validate_content(self, value):
        """Validate message content"""
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty")
        
        if len(value) > 5000:
            raise serializers.ValidationError("Message content too long (max 5000 characters)")
        
        return value.strip()


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating messages"""
    
    class Meta:
        model = Message
        fields = ['chat', 'content']
    
    def validate_content(self, value):
        """Validate message content"""
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty")
        
        if len(value) > 5000:
            raise serializers.ValidationError("Message content too long (max 5000 characters)")
        
        return value.strip()
    
    def validate_chat(self, value):
        """Validate user has access to the chat"""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context required")
        
        # Check if user is a participant
        if not ChatParticipant.objects.filter(
            chat=value,
            user=request.user,
            is_active=True
        ).exists():
            raise serializers.ValidationError("You are not a participant of this chat")
        
        return value
    
    def create(self, validated_data):
        """Create message and set sender"""
        request = self.context.get('request')
        validated_data['sender'] = request.user
        return super().create(validated_data)


class ChatSerializer(serializers.ModelSerializer):
    """Serializer for chat conversations"""
    participants = ChatParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = [
            'id', 'project', 'type', 'name', 
            'participants', 'last_message', 'unread_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        """Get the last message in the chat"""
        last_msg = Message.objects.filter(
            chat=obj,
            is_deleted=False
        ).order_by('-created_at').first()
        
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None
    
    def get_unread_count(self, obj):
        """Get unread message count for current user"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        try:
            participant = ChatParticipant.objects.get(
                chat=obj,
                user=request.user,
                is_active=True
            )
            
            if participant.last_read_at:
                return Message.objects.filter(
                    chat=obj,
                    created_at__gt=participant.last_read_at,
                    is_deleted=False
                ).exclude(sender=request.user).count()
            else:
                return Message.objects.filter(
                    chat=obj,
                    is_deleted=False
                ).exclude(sender=request.user).count()
        except ChatParticipant.DoesNotExist:
            return 0


class ChatListSerializer(serializers.ModelSerializer):
    """Simplified serializer for chat list (performance optimized)"""
    participants = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Chat
        fields = [
            'id', 'project', 'type', 'name',
            'participants', 'participant_count', 'last_message', 
            'last_message_time', 'unread_count',
            'updated_at'
        ]
    
    def get_participants(self, obj):
        """Get simplified participant info with online status"""
        from .services import OnlineStatusService
        
        participants = ChatParticipant.objects.filter(
            chat=obj,
            is_active=True
        ).select_related('user')
        
        return [{
            'id': p.id,
            'user': {
                'id': p.user.id,
                'username': p.user.username,
                'email': p.user.email,
                'is_online': OnlineStatusService.is_online(p.user.id)
            },
            'joined_at': p.joined_at.isoformat() if p.joined_at else None,
        } for p in participants]
    
    def get_participant_count(self, obj):
        """Get number of active participants"""
        return ChatParticipant.objects.filter(
            chat=obj,
            is_active=True
        ).count()
    
    def get_last_message(self, obj):
        """Get the last message in the chat (full message object for consistency with WebSocket)"""
        last_msg = Message.objects.filter(
            chat=obj,
            is_deleted=False
        ).select_related('sender').order_by('-created_at').first()
        
        if last_msg:
            return {
                'id': last_msg.id,
                'chat_id': last_msg.chat_id,
                'sender': {
                    'id': last_msg.sender.id,
                    'username': last_msg.sender.username,
                    'email': last_msg.sender.email,
                },
                'content': last_msg.content,
                'created_at': last_msg.created_at.isoformat(),
                'updated_at': last_msg.updated_at.isoformat(),
            }
        return None
    
    def get_last_message_time(self, obj):
        """Get timestamp of last message"""
        last_msg = Message.objects.filter(
            chat=obj,
            is_deleted=False
        ).order_by('-created_at').first()
        
        return last_msg.created_at if last_msg else obj.updated_at
    
    def get_unread_count(self, obj):
        """Get unread message count for current user"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        try:
            participant = ChatParticipant.objects.get(
                chat=obj,
                user=request.user,
                is_active=True
            )
            
            if participant.last_read_at:
                return Message.objects.filter(
                    chat=obj,
                    created_at__gt=participant.last_read_at,
                    is_deleted=False
                ).exclude(sender=request.user).count()
            else:
                return Message.objects.filter(
                    chat=obj,
                    is_deleted=False
                ).exclude(sender=request.user).count()
        except ChatParticipant.DoesNotExist:
            return 0


class ChatCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chats"""
    participant_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=True,
        help_text="List of user IDs to add as participants"
    )
    
    class Meta:
        model = Chat
        fields = ['project', 'type', 'name', 'participant_ids']
    
    def validate_participant_ids(self, value):
        """Validate participant IDs"""
        if not value:
            raise serializers.ValidationError("At least one participant is required")
        
        # Remove duplicates
        value = list(set(value))
        
        # Check users exist
        existing_users = User.objects.filter(id__in=value).count()
        if existing_users != len(value):
            raise serializers.ValidationError("Some user IDs are invalid")
        
        return value
    
    def validate(self, data):
        """Validate chat creation"""
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context required")
        
        chat_type = data.get('type', ChatType.PRIVATE)
        participant_ids = data.get('participant_ids', [])
        project = data.get('project')
        
        # Validate chat type and participants
        if chat_type == ChatType.PRIVATE:
            if len(participant_ids) != 1:
                raise serializers.ValidationError(
                    "Private chat must have exactly 1 participant (excluding yourself)"
                )
            
            other_user_id = participant_ids[0]
            
            # Check if users can chat
            other_user = User.objects.get(id=other_user_id)
            can_chat, reason = Chat.can_users_chat(request.user, other_user)
            if not can_chat:
                raise serializers.ValidationError(
                    f"Cannot create private chat: {reason}"
                )
            
            # Check for existing private chat between these two users in this project
            existing_chat = Chat.objects.filter(
                project=project,
                type=ChatType.PRIVATE,
                participants__user=request.user,
                participants__is_active=True
            ).filter(
                participants__user_id=other_user_id,
                participants__is_active=True
            ).first()
            
            if existing_chat:
                raise serializers.ValidationError(
                    f"A private chat with this user already exists in this project (Chat ID: {existing_chat.id})"
                )
        
        elif chat_type == ChatType.GROUP:
            if len(participant_ids) < 1:
                raise serializers.ValidationError(
                    "Group chat must have at least 1 participant (excluding yourself)"
                )
            
            if not data.get('name'):
                raise serializers.ValidationError(
                    "Group chat must have a name"
                )
            
            # Validate all participants are project members
            all_user_ids = participant_ids + [request.user.id]
            project_member_count = ProjectMember.objects.filter(
                project=project,
                user_id__in=all_user_ids,
                is_active=True
            ).count()
            
            if project_member_count != len(all_user_ids):
                raise serializers.ValidationError(
                    "All participants must be members of the project"
                )
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """Create chat with participants"""
        request = self.context.get('request')
        participant_ids = validated_data.pop('participant_ids')
        
        # Create chat
        chat = Chat.objects.create(**validated_data)
        
        # Add current user as participant
        ChatParticipant.objects.create(
            chat=chat,
            user=request.user,
            is_active=True
        )
        
        # Add other participants
        for user_id in participant_ids:
            ChatParticipant.objects.create(
                chat=chat,
                user_id=user_id,
                is_active=True
            )
        
        return chat


class MarkAsReadSerializer(serializers.Serializer):
    """Serializer for marking messages as read"""
    message_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate_message_id(self, value):
        """Validate message exists"""
        if value is not None:
            try:
                Message.objects.get(id=value)
            except Message.DoesNotExist:
                raise serializers.ValidationError("Message not found")
        return value

