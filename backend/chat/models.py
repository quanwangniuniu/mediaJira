from django.db import models
from django.core.exceptions import ValidationError
from core.models import TimeStampedModel


class Chat(TimeStampedModel):
    """
    Chat model - Represents a chat conversation (private or group).
    All chats must be associated with a project.
    """
    
    CHAT_TYPE_CHOICES = [
        ('private', 'Private Chat'),
        ('group', 'Group Chat'),
    ]
    
    project = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='chats',
        help_text="Project this chat belongs to (required)"
    )
    
    chat_type = models.CharField(
        max_length=20,
        choices=CHAT_TYPE_CHOICES,
        help_text="Type of chat: private (1-on-1) or group"
    )
    
    name = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text="Name of the chat (required for group chats, optional for private)"
    )
    
    created_by = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_chats',
        help_text="User who created this chat"
    )
    
    class Meta:
        db_table = 'chat'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['project', 'chat_type']),
            models.Index(fields=['created_at']),
            models.Index(fields=['updated_at']),
        ]
        verbose_name = 'Chat'
        verbose_name_plural = 'Chats'
    
    def __str__(self):
        if self.chat_type == 'private':
            participants = self.participants.select_related('user')[:2]
            if participants.count() == 2:
                users = [p.user.email for p in participants]
                return f"Private: {' & '.join(users)}"
            return f"Private Chat #{self.id}"
        return self.name or f"Group Chat #{self.id}"
    
    def clean(self):
        """Validate chat data"""
        super().clean()
        
        # Group chats should have a name
        if self.chat_type == 'group' and not self.name:
            raise ValidationError({
                'name': 'Group chats must have a name.'
            })
    
    def get_participant_count(self):
        """Get the number of active participants"""
        return self.participants.filter(is_active=True).count()
    
    def get_unread_count_for_user(self, user):
        """Get unread message count for a specific user"""
        from django.db.models import Q, Count
        
        return self.messages.filter(
            ~Q(sender=user)
        ).exclude(
            statuses__user=user,
            statuses__status='read'
        ).count()


class ChatParticipant(TimeStampedModel):
    """
    ChatParticipant model - Represents a user's participation in a chat.
    Tracks join time, last read time, and active status.
    """
    
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    
    user = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.CASCADE,
        related_name='chat_participations'
    )
    
    joined_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When the user joined this chat"
    )
    
    last_read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Last time the user read messages in this chat"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the user is still an active participant"
    )
    
    class Meta:
        db_table = 'chat_participant'
        unique_together = ['chat', 'user']
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['chat', 'is_active']),
            models.Index(fields=['last_read_at']),
        ]
        verbose_name = 'Chat Participant'
        verbose_name_plural = 'Chat Participants'
    
    def __str__(self):
        status = "active" if self.is_active else "inactive"
        return f"{self.user.email} in {self.chat} ({status})"
    
    def mark_as_read(self):
        """Update last_read_at to current time"""
        from django.utils import timezone
        self.last_read_at = timezone.now()
        self.save(update_fields=['last_read_at'])


class Message(TimeStampedModel):
    """
    Message model - Represents a message in a chat.
    Supports text messages, system messages, and file attachments.
    """
    
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text Message'),
        ('system', 'System Message'),
        ('file', 'File Attachment'),
    ]
    
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    sender = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    
    content = models.TextField(
        help_text="Message content"
    )
    
    message_type = models.CharField(
        max_length=20,
        choices=MESSAGE_TYPE_CHOICES,
        default='text',
        help_text="Type of message"
    )
    
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional metadata for extensibility (e.g., file info, mentions)"
    )
    
    class Meta:
        db_table = 'chat_message'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['message_type']),
        ]
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'
    
    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"Message from {self.sender.email}: {preview}"
    
    def clean(self):
        """Validate message data"""
        super().clean()
        
        # Validate sender is a participant of the chat
        if self.chat_id and self.sender_id:
            is_participant = ChatParticipant.objects.filter(
                chat=self.chat,
                user=self.sender,
                is_active=True
            ).exists()
            
            if not is_participant:
                raise ValidationError({
                    'sender': 'Sender must be an active participant of the chat.'
                })
    
    def mark_as_read_by(self, user):
        """Mark this message as read by a specific user"""
        status, created = MessageStatus.objects.get_or_create(
            message=self,
            user=user,
            defaults={'status': 'read'}
        )
        if not created and status.status != 'read':
            status.status = 'read'
            status.save(update_fields=['status', 'timestamp'])
        return status


class MessageStatus(TimeStampedModel):
    """
    MessageStatus model - Tracks read/delivery status of messages per user.
    """
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
    ]
    
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='statuses'
    )
    
    user = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.CASCADE,
        related_name='message_statuses'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='sent',
        help_text="Status of the message for this user"
    )
    
    timestamp = models.DateTimeField(
        auto_now=True,
        help_text="When the status was last updated"
    )
    
    class Meta:
        db_table = 'chat_message_status'
        unique_together = ['message', 'user']
        verbose_name = 'Message Status'
        verbose_name_plural = 'Message Statuses'
        indexes = [
            models.Index(fields=['message', 'user']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - Message {self.message.id}: {self.status}"

