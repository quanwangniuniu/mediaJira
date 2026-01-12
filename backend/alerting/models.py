from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone


User = get_user_model()


class AlertStatus(models.TextChoices):
    OPEN = "open", "Open"
    ACKNOWLEDGED = "acknowledged", "Acknowledged"
    IN_PROGRESS = "in_progress", "In Progress"
    MITIGATED = "mitigated", "Mitigated"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"


class AlertSeverity(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class AlertType(models.TextChoices):
    SPEND_SPIKE = "spend_spike", "Spend Spike"
    POLICY_VIOLATION = "policy_violation", "Policy Violation"
    PERFORMANCE_DROP = "performance_drop", "Performance Drop"
    DELIVERY_ISSUE = "delivery_issue", "Delivery Issue"
    OTHER = "other", "Other"


class AlertTask(models.Model):
    """
    Alert task details for anomaly handling and post-resolution review.
    """

    task = models.OneToOneField(
        "task.Task",
        on_delete=models.CASCADE,
        related_name="alert_task",
        help_text="Parent task that owns this alert task",
    )
    alert_type = models.CharField(
        max_length=50,
        choices=AlertType.choices,
        help_text="Type of alert that triggered this task",
    )
    severity = models.CharField(
        max_length=20,
        choices=AlertSeverity.choices,
        help_text="Severity level of the alert",
    )
    affected_entities = models.JSONField(
        default=list,
        blank=True,
        help_text="List of affected campaigns/ad sets or identifiers",
    )
    initial_metrics = models.JSONField(
        default=dict,
        blank=True,
        help_text="Initial metric snapshot at alert creation",
    )
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_alert_tasks",
        help_text="User who acknowledged the alert",
    )
    acknowledged_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the alert was acknowledged",
    )
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_alert_tasks",
        help_text="User responsible for handling the alert",
    )
    status = models.CharField(
        max_length=20,
        choices=AlertStatus.choices,
        default=AlertStatus.OPEN,
        help_text="Lifecycle status of the alert task",
    )
    investigation_notes = models.TextField(
        blank=True,
        help_text="Initial investigation notes or assumptions",
    )
    resolution_steps = models.TextField(
        blank=True,
        help_text="Actions taken to resolve or mitigate the alert",
    )
    related_references = models.JSONField(
        default=list,
        blank=True,
        help_text="Links or references to campaigns, assets, or policy docs",
    )
    postmortem_root_cause = models.TextField(
        blank=True,
        help_text="Root cause summary after resolution",
    )
    postmortem_prevention = models.TextField(
        blank=True,
        help_text="Preventive measures identified after resolution",
    )
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the alert was resolved",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "alert_task"

    def __str__(self) -> str:
        return f"AlertTask(task={self.task_id}, type={self.alert_type}, severity={self.severity})"

    def mark_acknowledged(self, user: User | None = None) -> None:
        if user and not self.acknowledged_by:
            self.acknowledged_by = user
        if not self.acknowledged_at:
            self.acknowledged_at = timezone.now()
        if self.status == AlertStatus.OPEN:
            self.status = AlertStatus.ACKNOWLEDGED

    def mark_resolved(self) -> None:
        if not self.resolved_at:
            self.resolved_at = timezone.now()
        self.status = AlertStatus.RESOLVED
