from django.contrib.auth import get_user_model
from django.db import models

User = get_user_model()

# --- Models for Optimization Experiment ---
class OptimizationExperiment(models.Model):
    #Defines the types of experiments (enum)
    class ExperimentType(models.TextChoices):
        AB_TEST = 'ab_test'
        CREATIVE_ROTATION = 'creative_rotation'
        BUDGET_SPLIT = 'budget_split'
    
    #Defines the status of experiments (enum)
    class ExperimentStatus(models.TextChoices):
        RUNNING = 'running'
        PAUSED = 'paused'
        COMPLETED = 'completed'
        ROLLED_BACK = 'rolled_back'
    
    # --- Fields ---
    name = models.CharField(
        max_length=255, 
        null=False, 
        blank=False, 
        help_text="The name of the experiment")

    experiment_type = models.CharField(
        max_length=255, 
        choices=ExperimentType.choices, 
        null=False, 
        blank=False, 
        help_text="The type of the experiment")
    
    #Linked campaigns' ids are stored as a JSON field, e.g., ["fb:123", "tt:456"]
    linked_campaign_ids = models.JSONField(
        null=False, 
        blank=False, 
        help_text="The ids of the linked campaigns")
    
    hypothesis = models.TextField(
        null=False, 
        blank=False, 
        help_text="The hypothesis of the experiment")
    
    start_date = models.DateField(
        null=False, 
        blank=False, 
        help_text="The start date of the experiment",
        )
    
    end_date = models.DateField(
        null=False, 
        blank=False, 
        help_text="The end date of the experiment")
    
    status = models.CharField(
        max_length=255, 
        choices=ExperimentStatus.choices, 
        null=False, 
        blank=False, 
        default=ExperimentStatus.RUNNING,
        help_text="The status of the experiment")
    
    description = models.TextField(
        null=False, 
        blank=False, 
        help_text="The description of the experiment")
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        db_column='created_by',
        related_name='owned_optimization_experiments', 
        help_text="The user who created the experiment")

    class Meta:
        db_table = 'optimization_experiment'
    
    def __str__(self):
        return f"{self.name} ({self.id})"


# --- Models for Scaling Action ---
class ScalingAction(models.Model):
    #Defines the types of scaling actions (enum)
    class ScalingActionType(models.TextChoices):
        BUDGET_INCREASE = 'budget_increase'
        BUDGET_DECREASE = 'budget_decrease'
        AUDIENCE_EXPAND = 'audience_expand'
        AUDIENCE_NARROW = 'audience_narrow'
        CREATIVE_REPLACE = 'creative_replace'
    
    # --- Fields ---
    experiment_id = models.ForeignKey(
        OptimizationExperiment,
        on_delete=models.CASCADE,
        related_name='owned_scaling_actions',
        db_column='experiment_id',
        null=True,
        help_text="The experiment that the scaling action belongs to")
    
    action_type = models.CharField(
        max_length=255, 
        choices=ScalingActionType.choices, 
        null=False, 
        blank=False, 
        help_text="The type of the scaling action")
    
    # Details of the scaling action are stored as a JSON field, e.g., {"increase_pct": 25}
    # TODO: validator needed if there is a required format for action_details
    action_details = models.JSONField(
        null=False, 
        blank=False, 
        help_text="The details of the scaling action")
    
    # Campaign id is stored as a string, e.g., "fb:123"
    campaign_id = models.CharField(
        max_length=255, 
        null=False, 
        blank=False,
        help_text="The id of the campaign that the scaling action belongs to")
    
    performed_at = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time the scaling action was performed")
    
    performed_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='performed_scaling_actions',
        db_column='performed_by',
        help_text="The user who performed the scaling action")
    
    class Meta:
        db_table = 'scaling_action'

# --- Models for Rollback History ---
class RollbackHistory(models.Model):
    # --- Fields ---
    scaling_action_id = models.ForeignKey(
        ScalingAction,
        on_delete=models.CASCADE,
        related_name='owned_rollback_histories',
        null=False,
        help_text="The id of the scaling action that was rolled back")

    reason = models.TextField(
        null=False, 
        blank=False,
        help_text="The reason for the rollback")
    
    performed_at = models.DateTimeField(
        auto_now_add=True, 
        help_text="The date and time the rollback action was performed")
    
    performed_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        db_column='performed_by',
        related_name='performed_rollback_actions', 
        help_text="The user who performed the rollback action")
    
    class Meta:
        db_table = 'rollback_history'

# --- Models for Experiment Metric ---
class ExperimentMetric(models.Model):
    # --- Fields ---
    experiment_id = models.ForeignKey(
        OptimizationExperiment,
        on_delete=models.CASCADE,
        related_name='owned_experiment_metrics',
        db_column='experiment_id',
        null=False,
        help_text="The id of the experiment that the metric belongs to")
    
    metric_name = models.CharField(
        max_length=255, 
        null=False, 
        blank=False, 
        help_text="The name of the metric")
    
    metric_value = models.FloatField(
        null=False, 
        blank=False, 
        help_text="The value of the metric")
    
    recorded_at = models.DateTimeField(
        auto_now_add=True,
        help_text="The date and time the metric was recorded")
    
    class Meta:
        indexes = [
            models.Index(fields=['experiment_id', 'recorded_at'], name='exp_metric_time_idx'),
        ]
        db_table = 'experiment_metric'
