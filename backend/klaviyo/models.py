from django.db import models
from django.contrib.auth import get_user_model

from core.models import TimeStampedModel  # Base model with created_at / updated_at fields

User = get_user_model()


class EmailDraft(TimeStampedModel):
    """
    Represents an editable email draft before sending or scheduling.
    Stores metadata (name, subject, status) and links to structured content blocks.
    """

    # Status choices for email draft lifecycle
    STATUS_DRAFT = "draft"
    STATUS_SCHEDULED = "scheduled"
    STATUS_SENT = "sent"
    STATUS_ARCHIVED = "archived"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_SCHEDULED, "Scheduled"),
        (STATUS_SENT, "Sent"),
        (STATUS_ARCHIVED, "Archived"),
    ]

    # (Optional) The user who owns or created this draft
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="klaviyo_email_drafts",
    )

    # Internal name for identifying the email draft within the system
    name = models.CharField(max_length=255, blank=True)

    # Actual email subject line
    subject = models.CharField(max_length=255)

    # Current status of the email draft (draft, scheduled, sent, archived)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
    )

    def __str__(self) -> str:
        """
        Returns a readable representation for admin or debugging.
        Prefer showing the internal name if available.
        """
        if self.name:
            return f"{self.name} ({self.subject})"
        return self.subject


class ContentBlock(models.Model):
    """
    Represents a modular content block belonging to an EmailDraft.
    Each block may be text, image, button, header, divider, etc.
    Blocks are ordered to reconstruct full email content.
    """

    # Link back to the parent email draft
    email_draft = models.ForeignKey(
        EmailDraft,
        on_delete=models.CASCADE,
        related_name="blocks",
    )

    # Type of content (e.g. "header", "text", "image", "button")
    block_type = models.CharField(max_length=50)

    # JSON data for flexible block storage (text, options, layout metadata)
    content = models.JSONField(blank=True, null=True)

    # Render order within the email body
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self) -> str:
        """
        Readable representation showing block type and order.
        """
        return f"{self.block_type} #{self.order} for draft {self.email_draft_id}"


class Workflow(TimeStampedModel):
    """
    Simple placeholder model representing a Klaviyo-like workflow.
    Triggers, actions, and automation logic may be added later.
    """

    # Human-readable workflow name
    name = models.CharField(max_length=255)

    # Whether the workflow is currently active
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name
