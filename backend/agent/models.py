import uuid
from django.db import models
from django.conf import settings
from core.models import TimeStampedModel


class AgentSession(TimeStampedModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='agent_sessions',
    )
    project = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='agent_sessions',
    )
    title = models.CharField(max_length=255, blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"AgentSession {self.id} - {self.title}"


class AgentMessage(TimeStampedModel):
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    MESSAGE_TYPE_CHOICES = [
        ('text', 'Text'),
        ('analysis', 'Analysis'),
        ('decision_draft', 'Decision Draft'),
        ('task_created', 'Task Created'),
        ('confirmation_request', 'Confirmation Request'),
        ('error', 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AgentSession,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    message_type = models.CharField(
        max_length=30, choices=MESSAGE_TYPE_CHOICES, default='text'
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"


class ImportedCSVFile(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    filename = models.CharField(max_length=255, help_text="Stored filename on disk")
    original_filename = models.CharField(max_length=255, help_text="Original upload filename")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='imported_csv_files',
    )
    project = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='imported_csv_files',
    )
    row_count = models.IntegerField(default=0)
    column_count = models.IntegerField(default=0)
    file_size = models.BigIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.original_filename} ({self.row_count} rows)"


class AgentWorkflowRun(TimeStampedModel):
    STATUS_CHOICES = [
        ('analyzing', 'Analyzing'),
        ('awaiting_confirmation', 'Awaiting Confirmation'),
        ('creating_decision', 'Creating Decision'),
        ('creating_tasks', 'Creating Tasks'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        AgentSession,
        on_delete=models.CASCADE,
        related_name='workflow_runs',
    )
    spreadsheet = models.ForeignKey(
        'spreadsheet.Spreadsheet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agent_workflow_runs',
    )
    decision = models.ForeignKey(
        'decision.Decision',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agent_workflow_runs',
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='analyzing')
    analysis_result = models.JSONField(null=True, blank=True)
    created_tasks = models.JSONField(default=list, blank=True)
    error_message = models.TextField(null=True, blank=True)
    chat_followed_up = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"WorkflowRun {self.id} - {self.status}"
