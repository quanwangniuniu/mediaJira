from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


# =========================================================
# ContentBlock
# =========================================================
class ContentBlock(models.Model):
    """
    Represents a reusable piece of email content (Universal Content).
    Can be linked to one or more EmailDrafts, or stored as a global shared block.

    Example:
    --------
    A "Header" block or "Footer" block used across multiple email templates.
    """

    BLOCK_TYPES = [
        ("text", "Text"),
        ("image", "Image"),
        ("button", "Button"),
        ("divider", "Divider"),
        ("html", "Custom HTML"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Descriptive info
    name = models.CharField(max_length=255, help_text="Name of this reusable block.")
    block_type = models.CharField(
        max_length=50,
        choices=BLOCK_TYPES,
        default="text",
        help_text="Type of the content block (text, image, etc.)."
    )

    # Main data for rendering (can hold props, text, URLs, styles)
    props = models.JSONField(default=dict, help_text="JSON configuration and content data for the block.")

    # Reusability flags
    shared = models.BooleanField(default=False, help_text="If true, block can be reused across multiple drafts.")
    editable = models.BooleanField(default=True, help_text="Whether the block is editable inside drafts.")

    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_blocks",
        help_text="User who created this content block."
    )
    last_modified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="modified_blocks",
        help_text="User who last modified this content block."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "content_blocks"
        ordering = ["-updated_at"]
        verbose_name = "Content Block"
        verbose_name_plural = "Content Blocks"

    def __str__(self):
        return f"{self.name} ({'Shared' if self.shared else 'Local'})"


# =========================================================
# EmailDraft
# =========================================================
class EmailDraft(models.Model):
    """
    Represents an email template/draft.
    Can contain inline JSON-defined blocks and/or linked reusable ContentBlocks.
    """

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("review", "Under Review"),
        ("approved", "Approved"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    subject = models.CharField(max_length=200, help_text="Subject line of the email.")
    content_blocks = models.JSONField(
        default=list,
        help_text="JSON array of inline (non-reusable) blocks inside this email."
    )

    # NEW: ManyToMany link to reusable blocks
    reusable_blocks = models.ManyToManyField(
        ContentBlock,
        related_name="used_in_drafts",
        blank=True,
        help_text="Reusable content blocks linked to this email draft."
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_email_drafts"
    )
    last_modified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="modified_email_drafts"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "email_drafts"
        ordering = ["-created_at"]
        verbose_name = "Email Draft"
        verbose_name_plural = "Email Drafts"

    def __str__(self):
        return f"{self.title} - {self.subject}"


# =========================================================
# Workflow
# =========================================================
class Workflow(models.Model):
    """
    Represents an automation flow connecting triggers, conditions, and actions.
    Each workflow can send one or multiple EmailDrafts.
    """

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("draft", "Draft"),
        ("paused", "Paused"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    triggers = models.JSONField(default=list)
    actions = models.JSONField(default=list)
    conditions = models.JSONField(default=list)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    is_active = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_workflows"
    )
    last_modified_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="modified_workflows"
    )

    # Connects workflows to their email drafts
    email_drafts = models.ManyToManyField(
        EmailDraft,
        related_name="workflows",
        blank=True,
        help_text="Email drafts used in this workflow."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "workflows"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


# =========================================================
# TriggerLog
# =========================================================
class TriggerLog(models.Model):
    """Tracks execution logs for workflow runs."""
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        Workflow, on_delete=models.CASCADE, related_name="trigger_logs"
    )
    trigger_data = models.JSONField(default=dict)
    execution_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    execution_log = models.JSONField(default=list)
    triggered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="triggered_workflows"
    )

    class Meta:
        db_table = "trigger_logs"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.workflow.name} - {self.get_execution_status_display()}"


# =========================================================
# PreviewLog
# =========================================================
class PreviewLog(models.Model):
    """Stores preview render results for email drafts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    draft = models.ForeignKey(EmailDraft, on_delete=models.CASCADE, related_name="previews")
    context_used = models.JSONField(default=dict)
    rendered_html = models.TextField()
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="previewed_drafts"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "preview_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Preview of {self.draft.title} by {self.created_by or 'System'}"
