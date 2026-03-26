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
        ('follow_up_prompt', 'Follow-up Prompt'),
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


class AgentWorkflowDefinition(TimeStampedModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('draft', 'Draft'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    project = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='agent_workflow_definitions',
        null=True,
        blank=True,
    )
    is_default = models.BooleanField(default=False)
    is_system = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_workflow_definitions',
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class AgentWorkflowStep(TimeStampedModel):
    STEP_TYPE_CHOICES = [
        ('analyze_data', 'Analyze Data'),
        ('call_dify', 'Call Dify'),
        ('call_llm', 'Call LLM'),
        ('create_decision', 'Create Decision'),
        ('create_tasks', 'Create Tasks'),
        ('generate_miro_snapshot', 'Generate Miro Snapshot'),
        ('create_miro_board', 'Create Miro Board'),
        ('custom_api', 'Custom API'),
        ('await_confirmation', 'Await Confirmation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        AgentWorkflowDefinition,
        on_delete=models.CASCADE,
        related_name='steps',
    )
    name = models.CharField(max_length=255)
    step_type = models.CharField(max_length=30, choices=STEP_TYPE_CHOICES)
    order = models.PositiveIntegerField()
    config = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['order']
        unique_together = [['workflow', 'order']]

    def __str__(self):
        return f"{self.workflow.name} - Step {self.order}: {self.name}"


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
    workflow_definition = models.ForeignKey(
        AgentWorkflowDefinition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workflow_runs',
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='analyzing')
    current_step_order = models.PositiveIntegerField(null=True, blank=True)
    analysis_result = models.JSONField(null=True, blank=True)
    created_tasks = models.JSONField(default=list, blank=True)
    miro_snapshot = models.JSONField(null=True, blank=True)
    miro_board = models.ForeignKey(
        'miro.Board',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agent_workflow_runs',
    )
    error_message = models.TextField(null=True, blank=True)
    chat_follow_up_started = models.BooleanField(default=False)
    chat_followed_up = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"WorkflowRun {self.id} - {self.status}"


class AgentStepExecution(TimeStampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
        ('awaiting', 'Awaiting Confirmation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_run = models.ForeignKey(
        AgentWorkflowRun,
        on_delete=models.CASCADE,
        related_name='step_executions',
    )
    step = models.ForeignKey(
        AgentWorkflowStep,
        on_delete=models.SET_NULL,
        null=True,
        related_name='executions',
    )
    step_order = models.PositiveIntegerField()
    step_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    input_data = models.JSONField(null=True, blank=True)
    output_data = models.JSONField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['step_order']

    def __str__(self):
        return f"Run {self.workflow_run_id} - Step {self.step_order}: {self.status}"
