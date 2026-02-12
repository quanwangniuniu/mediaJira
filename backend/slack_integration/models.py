from django.db import models
from core.models import TimeStampedModel, Organization, Project
from task.models import Task

from cryptography.fernet import Fernet
from django.conf import settings
import base64

# Helper for encryption
def encrypt_token(token):
    if not token:
        return None
    # Ensure we have a valid key from settings, or use a default for dev if missing (NOT SAFER FOR PROD)
    # In a real scenario, settings.SECRET_KEY should be used to derive a Fernet key
    # For simplicity here, we assume settings.SECRET_KEY is long enough or we pad it
    key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32, b'='))
    f = Fernet(key)
    return f.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token):
    if not encrypted_token:
        return None
    key = base64.urlsafe_b64encode(settings.SECRET_KEY[:32].encode().ljust(32, b'='))
    f = Fernet(key)
    return f.decrypt(encrypted_token.encode()).decode()

class SlackWorkspaceConnection(TimeStampedModel):
    """
    Represents a connection between a MediaJira Organization and a Slack Workspace.
    Stores the secure bot token required for API calls.
    """
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name='slack_connections',
        help_text="The MediaJira organization this connection belongs to."
    )

    slack_team_id = models.CharField(
        max_length=50,
        help_text="The unique ID of the Slack Workspace (e.g., T123456)."
    )

    slack_team_name = models.CharField(
        max_length=255,
        help_text="The name of the Slack Workspace."
    )
    
    # Storing encrypted token
    encrypted_access_token = models.TextField(
        help_text="Encrypted Bot User OAuth Token."
    )
    
    # Metadata for the installer user
    installer_slack_user_id = models.CharField(
        max_length=50,
        null=True, blank=True,
        help_text="Slack ID of the user who installed the app."
    )

    # Default channel for notifications if not specified in preferences
    # This acts as a fallback if specific preferences don't define a channel.
    default_channel_id = models.CharField(
        max_length=50,
        null=True, blank=True,
        help_text="Default Slack Channel ID to send notifications to (fallback)."
    )

    default_channel_name = models.CharField(
        max_length=255,
        null=True, blank=True,
        help_text="Name of the default channel (e.g., #general)."
    )
    
    # Connection state
    # Allows a user to revoke access (disable integration) without deleting historical data.
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this connection is currently active/enabled."
    )

    class Meta:
        # Enforce that an organization can only have one connection to a specific Slack workspace.
        # This prevents duplicate connections for the same team ID, ensuring data integrity.
        unique_together = ['organization', 'slack_team_id']
        verbose_name = "Slack Connection"
        verbose_name_plural = "Slack Connections"

    def set_access_token(self, raw_token):
        self.encrypted_access_token = encrypt_token(raw_token)

    def get_access_token(self):
        return decrypt_token(self.encrypted_access_token)

    def __str__(self):
        return f"{self.organization.name} - {self.slack_team_name} ({self.slack_team_id})"


class NotificationPreference(TimeStampedModel):
    """
    Stores configuration for which events should trigger Slack notifications
    and where they should be sent.
    """
    class EventType(models.TextChoices):
        """
        Enumeration of supported event types that can trigger notifications.
        Used to filter which events are sent to which channel.
        """
        TASK_CREATED = 'TASK_CREATED', "Task Created"
        TASK_STATUS_CHANGE = 'TASK_STATUS_CHANGE', "Task Status Change"
        COMMENT_UPDATED = 'COMMENT_UPDATED', "Comment Updated"
        DEADLINE_REMINDER = 'DEADLINE_REMINDER', "Deadline Reminder"
        DECISION_CREATED = 'DECISION_CREATED', "Decision Created"

    connection = models.ForeignKey(
        SlackWorkspaceConnection,
        on_delete=models.CASCADE,
        related_name='preferences'
    )
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='slack_preferences',
        help_text="The MediaJira project this preference applies to."
    )

    # Identifies the type of event that triggers this notification.
    # Allows for granular control over what messages are sent to Slack.
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        default=EventType.TASK_STATUS_CHANGE,
        help_text=" The type of event to listen for."
    )

    # Choices are directly referenced from the core Task model to ensure consistency with business logic.
    task_status = models.CharField(
        max_length=50,
        choices=Task.Status.choices,
        null=True, blank=True,
        help_text="Specific task status to filter by (only used if event_type is TASK_STATUS_CHANGE)."
    )

    # If null, the system should fall back to the Connection's `default_channel_id`.
    # This allows a single connection configuration to serve as a baseline.
    slack_channel_id = models.CharField(
        max_length=50,
        null=True, blank=True,
        help_text="Specific channel ID. If empty, uses the connection's default channel."
    )
    
    slack_channel_name = models.CharField(
        max_length=255,
        null=True, blank=True,
        help_text="Specific channel name."
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this notification preference is currently enabled."
    )

    class Meta:
        # Prevent duplicate rules
        unique_together = [
            'connection', 
            'project', 
            'event_type',
            'task_status', 
            'slack_channel_id'
        ]
        verbose_name = "Notification Preference"

    def __str__(self):
        base = f"{self.project.name}: {self.event_type}"
        if self.task_status:
            base += f" ({self.task_status})"
        target = self.slack_channel_name or "Default Channel"
        return f"{base} -> {target}"
