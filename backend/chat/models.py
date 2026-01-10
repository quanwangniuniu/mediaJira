from django.db import models
from django.conf import settings
from core.models import TimeStampedModel, Project, Team


class ChatType:
    """Chat type constants"""
    PRIVATE = 'private'
    GROUP = 'group'
    
    CHOICES = [
        (PRIVATE, 'Private Chat'),
        (GROUP, 'Group Chat'),
    ]


class Chat(TimeStampedModel):
    """
    Chat model representing a conversation between users.
    All chats must be associated with a project.
    
    Access Rules:
    - Private Chat: Users can chat if they are in the same Team OR same Project
    - Group Chat: All participants must be members of the associated Project
    """
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='chats',
        help_text="Project this chat belongs to (required)"
    )
    type = models.CharField(
        max_length=20,
        choices=ChatType.CHOICES,
        default=ChatType.PRIVATE,
        help_text="Type of chat: private (1-on-1) or group"
    )
    name = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Name for group chats (optional for private chats)"
    )
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['project', '-updated_at']),
            models.Index(fields=['type', '-updated_at']),
        ]
    
    def __str__(self):
        if self.type == ChatType.GROUP:
            return f"Group: {self.name or 'Unnamed'} (Project: {self.project.name})"
        return f"Private Chat (Project: {self.project.name})"
    
    def get_participant_users(self):
        """Get all active participant users in this chat"""
        return [p.user for p in self.participants.filter(is_active=True).select_related('user')]
    
    def is_user_participant(self, user):
        """Check if a user is an active participant in this chat"""
        return self.participants.filter(user=user, is_active=True).exists()
    
    @staticmethod
    def can_users_chat(user1, user2):
        """
        Check if two users can create a private chat.
        
        Rules:
        - Same Team: Users are in the same Team (via TeamMember)
        - OR Same Project: Users are in the same Project (via ProjectMember)
        
        Returns: (can_chat: bool, reason: str)
        """
        from core.models import TeamMember, ProjectMember
        
        # Check if users are in the same team
        user1_teams = set(TeamMember.objects.filter(user=user1).values_list('team_id', flat=True))
        user2_teams = set(TeamMember.objects.filter(user=user2).values_list('team_id', flat=True))
        
        if user1_teams & user2_teams:  # Intersection - same team
            return True, "same_team"
        
        # Check if users are in the same project
        user1_projects = set(ProjectMember.objects.filter(user=user1, is_active=True).values_list('project_id', flat=True))
        user2_projects = set(ProjectMember.objects.filter(user=user2, is_active=True).values_list('project_id', flat=True))
        
        if user1_projects & user2_projects:  # Intersection - same project
            return True, "same_project"
        
        return False, "no_common_team_or_project"
    
    def can_user_join(self, user):
        """
        Check if a user can join this chat.
        
        For group chats: User must be a member of the associated project
        For private chats: Check via can_users_chat with existing participants
        """
        from core.models import ProjectMember
        
        if self.type == ChatType.GROUP:
            # Group chat: Must be project member
            return ProjectMember.objects.filter(
                user=user,
                project=self.project,
                is_active=True
            ).exists()
        else:
            # Private chat: Check with existing participant
            participants = self.get_participant_users()
            if participants:
                can_chat, _ = self.can_users_chat(user, participants[0])
                return can_chat
            return False


class ChatParticipant(TimeStampedModel):
    """
    Model representing a user's participation in a chat.
    Tracks join time, last read time, and activity status.
    """
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
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
        help_text="Last time the user read messages in this chat (for quick unread count)"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this user is still active in the chat"
    )
    
    class Meta:
        unique_together = ['chat', 'user']
        ordering = ['joined_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['chat', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.email} in {self.chat}"
    
    def get_unread_count(self):
        """
        Get count of unread messages for this participant.
        Uses last_read_at for quick calculation.
        """
        if not self.last_read_at:
            # Never read, count all messages except own
            return self.chat.messages.filter(
                is_deleted=False
            ).exclude(sender=self.user).count()
        
        return self.chat.messages.filter(
            created_at__gt=self.last_read_at,
            is_deleted=False
        ).exclude(sender=self.user).count()


class Message(TimeStampedModel):
    """
    Message model representing a text message in a chat.
    Once created, messages are persisted and accessible to all participants.
    """
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        help_text="User who sent this message"
    )
    content = models.TextField(
        help_text="Text content of the message"
    )
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['chat', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['chat', '-created_at']),  # For latest messages
        ]
    
    def __str__(self):
        preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"{self.sender.email}: {preview}"
    
    def get_status_for_user(self, user):
        """Get the status of this message for a specific user"""
        try:
            status = self.statuses.get(user=user)
            return status.status
        except MessageStatus.DoesNotExist:
            return None


class MessageStatus(TimeStampedModel):
    """
    Tracks the delivery and read status of messages for each recipient.
    
    Status Flow:
    - sent: Message created (default)
    - delivered: Message delivered via WebSocket or user came online
    - read: User has read the message
    
    This enables:
    - "✓" (sent)
    - "✓✓" (delivered) 
    - "✓✓" blue (read)
    - Group chat: "Read by 3 of 5"
    """
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='statuses',
        help_text="The message this status refers to"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='message_statuses',
        help_text="The recipient user"
    )
    
    STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='sent',
        help_text="Current status of the message for this user"
    )
    
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the message was delivered to the user"
    )
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the user read the message"
    )
    
    class Meta:
        unique_together = ['message', 'user']
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['message', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['message', 'user']),
        ]
        verbose_name_plural = 'Message statuses'
    
    def __str__(self):
        return f"{self.message.id} - {self.user.email}: {self.status}"
    
    def mark_as_delivered(self):
        """Mark message as delivered"""
        from django.utils import timezone
        if self.status == 'sent':
            self.status = 'delivered'
            self.delivered_at = timezone.now()
            self.save(update_fields=['status', 'delivered_at', 'updated_at'])
    
    def mark_as_read(self):
        """Mark message as read"""
        from django.utils import timezone
        if self.status in ['sent', 'delivered']:
            self.status = 'read'
            self.read_at = timezone.now()
            if not self.delivered_at:
                self.delivered_at = self.read_at
            self.save(update_fields=['status', 'delivered_at', 'read_at', 'updated_at'])
