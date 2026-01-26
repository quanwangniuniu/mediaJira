from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.files import File
from django.db import transaction
import logging
import os
import subprocess
import tempfile
from .models import Chat, ChatParticipant, Message, MessageStatus, ChatType, MessageAttachment
from core.models import ProjectMember

User = get_user_model()
logger = logging.getLogger(__name__)


# ==================== Mixins for DRY ====================

class ChatUnreadCountMixin:
    """Mixin providing get_unread_count for Chat serializers"""
    
    def get_unread_count(self, obj):
        """Get unread message count for current user using model method"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        
        try:
            participant = ChatParticipant.objects.get(
                chat=obj,
                user=request.user,
                is_active=True
            )
            # Delegate to model method (single source of truth)
            return participant.get_unread_count()
        except ChatParticipant.DoesNotExist:
            return 0


class MessageContentValidationMixin:
    """Mixin providing content validation for Message serializers"""
    
    def validate_content(self, value):
        """Validate message content"""
        if not value or not value.strip():
            raise serializers.ValidationError("Message content cannot be empty")
        
        if len(value) > 5000:
            raise serializers.ValidationError("Message content too long (max 5000 characters)")
        
        return value.strip()


class ChatParticipantValidationMixin:
    """Mixin providing chat participant validation for Message serializers"""
    
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
        """Calculate unread message count for this participant using model method"""
        return obj.get_unread_count()


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


class MessageSerializer(MessageContentValidationMixin, serializers.ModelSerializer):
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


class MessageCreateSerializer(MessageContentValidationMixin, ChatParticipantValidationMixin, serializers.ModelSerializer):
    """Serializer for creating messages"""
    
    class Meta:
        model = Message
        fields = ['chat', 'content']
    
    def create(self, validated_data):
        """Create message and set sender"""
        request = self.context.get('request')
        validated_data['sender'] = request.user
        return super().create(validated_data)


class ChatSerializer(ChatUnreadCountMixin, serializers.ModelSerializer):
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


class ChatListSerializer(ChatUnreadCountMixin, serializers.ModelSerializer):
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


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for MessageAttachment model"""
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    file_size_display = serializers.SerializerMethodField()
    
    class Meta:
        model = MessageAttachment
        fields = [
            'id', 'message', 'file_type', 'file_url', 'thumbnail_url',
            'file_size', 'file_size_display', 'original_filename', 
            'mime_type', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_file_url(self, obj):
        """Return the full URL for the file"""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def get_thumbnail_url(self, obj):
        """Return thumbnail URL if available"""
        if hasattr(obj, 'thumbnail') and obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None
    
    def get_file_size_display(self, obj):
        """Return human-readable file size"""
        size = obj.file_size or 0
        if size < 1024:
            return f"{size} B"
        elif size < 1024 * 1024:
            return f"{size / 1024:.1f} KB"
        elif size < 1024 * 1024 * 1024:
            return f"{size / (1024 * 1024):.1f} MB"
        else:
            return f"{size / (1024 * 1024 * 1024):.1f} GB"


class AttachmentUploadSerializer(serializers.ModelSerializer):
    """Serializer for uploading attachments"""

    def _generate_video_thumbnail(self, attachment: MessageAttachment) -> None:
        """Generate a thumbnail image for video attachments using ffmpeg."""
        try:
            input_path = attachment.file.path
        except Exception:
            logger.warning("Video thumbnail generation skipped: storage has no local path.")
            return

        if not os.path.exists(input_path):
            logger.warning("Video thumbnail generation skipped: file not found.")
            return

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
            output_path = temp_file.name

        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    input_path,
                    "-ss",
                    "00:00:01.000",
                    "-vframes",
                    "1",
                    "-vf",
                    "scale=640:-1",
                    output_path,
                ],
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                filename = f"{os.path.splitext(attachment.original_filename)[0]}_thumb.jpg"
                with open(output_path, "rb") as handle:
                    attachment.thumbnail.save(filename, File(handle), save=True)
        except Exception as exc:
            logger.warning("Video thumbnail generation failed: %s", exc)
        finally:
            try:
                os.remove(output_path)
            except OSError:
                pass
    
    class Meta:
        model = MessageAttachment
        fields = ['id', 'file', 'file_type', 'file_size', 'original_filename', 'mime_type']
        read_only_fields = ['id', 'file_type', 'file_size', 'original_filename', 'mime_type']
    
    def create(self, validated_data):
        file = validated_data.get('file')
        
        # Auto-populate fields from the uploaded file
        validated_data['uploader'] = self.context['request'].user
        validated_data['original_filename'] = file.name if file else ''
        validated_data['file_size'] = file.size if file else 0
        validated_data['mime_type'] = getattr(file, 'content_type', 'application/octet-stream')
        
        # Determine file_type from mime_type
        mime_type = validated_data['mime_type']
        if mime_type.startswith('image/'):
            validated_data['file_type'] = 'image'
        elif mime_type.startswith('video/'):
            validated_data['file_type'] = 'video'
        else:
            validated_data['file_type'] = 'document'
        
        attachment = super().create(validated_data)
        if attachment.file_type == "video":
            self._generate_video_thumbnail(attachment)
        return attachment


class MessageWithAttachmentsSerializer(MessageSerializer):
    """Serializer for Message model with nested attachments"""
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    
    class Meta(MessageSerializer.Meta):
        fields = MessageSerializer.Meta.fields + ['attachments']


class MessageCreateWithAttachmentsSerializer(ChatParticipantValidationMixin, serializers.ModelSerializer):
    """Serializer for creating messages with attachments"""
    attachment_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        default=list
    )
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'chat', 'content', 'attachment_ids', 'attachments', 'created_at']
        read_only_fields = ['id', 'attachments', 'created_at']
    
    def validate_content(self, value):
        """Allow empty content if attachments are provided"""
        # Content validation will be done in validate() method
        return value.strip() if value else ''
    
    def validate(self, data):
        """Validate that either content or attachments are provided"""
        content = data.get('content', '')
        attachment_ids = data.get('attachment_ids', [])
        
        if not content and not attachment_ids:
            raise serializers.ValidationError(
                "Either content or attachments must be provided"
            )
        
        return data
    
    def create(self, validated_data):
        # Set sender from request context
        request = self.context.get('request')
        validated_data['sender'] = request.user
        
        attachment_ids = validated_data.pop('attachment_ids', [])
        message = super().create(validated_data)
        
        # Link attachments to the message
        if attachment_ids:
            MessageAttachment.objects.filter(
                id__in=attachment_ids,
                uploader=request.user,
                message__isnull=True
            ).update(message=message)
        
        return message
