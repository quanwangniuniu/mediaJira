from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone

User = get_user_model()


class Experiment(models.Model):
    """
    Controlled experiment model for validating hypotheses in advertising.
    Represents A/B tests and other controlled experiments with control/variant groups.
    """
    
    class ExperimentStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        RUNNING = 'running', 'Running'
        PAUSED = 'paused', 'Paused'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    class ExperimentOutcome(models.TextChoices):
        WIN = 'win', 'Win'
        LOSE = 'lose', 'Lose'
        INCONCLUSIVE = 'inconclusive', 'Inconclusive'
    
    # --- Core Fields ---
    name = models.CharField(
        max_length=255,
        null=False,
        blank=False,
        help_text="The name of the experiment"
    )
    
    hypothesis = models.TextField(
        null=False,
        blank=False,
        help_text="The hypothesis being tested in this experiment"
    )
    
    expected_outcome = models.TextField(
        null=True,
        blank=True,
        help_text="Expected outcome of the experiment (e.g., '10% increase in CTR')"
    )
    
    description = models.TextField(
        null=True,
        blank=True,
        help_text="Additional description of the experiment"
    )
    
    # --- Experiment Design Fields ---
    control_group = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Control group configuration: {'campaigns': [...], 'ad_set_ids': [...], 'ad_ids': [...]}"
    )
    
    variant_group = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text="Variant group configuration: {'campaigns': [...], 'ad_set_ids': [...], 'ad_ids': [...]}"
    )
    
    success_metric = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Metric used to measure success (e.g., 'CTR', 'CPA', 'ROAS')"
    )
    
    constraints = models.TextField(
        null=True,
        blank=True,
        help_text="Constraints or considerations relevant to the experiment"
    )
    
    # --- Timing Fields ---
    # Note: start_date and end_date are now stored in the associated Task model
    # (Task.start_date and Task.due_date)
    
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Actual execution start time when experiment began"
    )
    
    # --- Status and Outcome ---
    status = models.CharField(
        max_length=20,
        choices=ExperimentStatus.choices,
        default=ExperimentStatus.DRAFT,
        null=False,
        blank=False,
        help_text="Current status of the experiment"
    )
    
    experiment_outcome = models.CharField(
        max_length=20,
        choices=ExperimentOutcome.choices,
        null=True,
        blank=True,
        help_text="Final outcome of the experiment"
    )
    
    outcome_notes = models.TextField(
        null=True,
        blank=True,
        help_text="Notes summarizing learnings and conclusions from the experiment"
    )
    
    # --- Relationships ---
    task = models.OneToOneField(
        "task.Task",
        on_delete=models.CASCADE,
        related_name="experiment",
        null=True,
        blank=True,
        help_text="The task that owns this experiment (1:1 relationship)"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='created_by',
        related_name='created_experiments',
        help_text="The user who created the experiment"
    )
    
    # --- Timestamps ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'experiment'
        indexes = [
            models.Index(fields=['status'], name='experiment_status_idx'),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.id})"


class ExperimentProgressUpdate(models.Model):
    """
    Progress update for experiment execution tracking.
    Records periodic updates during experiment execution.
    """
    
    experiment = models.ForeignKey(
        Experiment,
        on_delete=models.CASCADE,
        related_name='progress_updates',
        help_text="The experiment this progress update belongs to"
    )
    
    update_date = models.DateTimeField(
        default=timezone.now,
        help_text="When this progress update was created"
    )
    
    notes = models.TextField(
        null=False,
        blank=False,
        help_text="Progress update notes/description"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_column='created_by',
        related_name='created_experiment_progress_updates',
        help_text="The user who created this progress update"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'experiment_progress_update'
        indexes = [
            models.Index(fields=['experiment', 'created_at'], name='exp_progress_time_idx'),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Progress Update {self.id} for Experiment {self.experiment_id}"

