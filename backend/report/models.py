from django.db import models
from django.core.exceptions import ValidationError

from report.prompt_registry import (
    get_default_prompt_version_for_audience,
    get_template_definition_for_version,
)


def _order_index_range_constraint() -> models.CheckConstraint:
    q = models.Q(order_index__gte=1, order_index__lte=6)
    # Django 4.2 uses `check=`, newer versions may prefer `condition=`.
    try:
        return models.CheckConstraint(
            condition=q,
            name="check_report_task_key_action_order_range",
        )
    except TypeError:
        return models.CheckConstraint(
            check=q,
            name="check_report_task_key_action_order_range",
        )


class ReportTask(models.Model):
    class AudienceType(models.TextChoices):
        CLIENT = "client", "Client"
        MANAGER = "manager", "Manager"
        INTERNAL_TEAM = "internal_team", "Internal Team"
        SELF = "self", "Self"
        OTHER = "other", "Other"

    task = models.OneToOneField(
        "task.Task",
        on_delete=models.CASCADE,
        related_name="report_task",
        help_text="The task that owns this report task (1:1 relationship)",
    )
    audience_type = models.CharField(
        max_length=30,
        choices=AudienceType.choices,
        help_text="Who the report is intended for",
    )
    audience_details = models.TextField(
        blank=True,
        help_text="Optional audience details (required if audience type is other)",
    )
    audience_prompt_version = models.CharField(
        max_length=50,
        help_text="Pinned prompt template version for this audience at creation time",
        blank=True,
    )
    context = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured context for the report: {reporting_period: {type, text, start_date?, end_date?}, situation, what_changed}",
    )
    outcome_summary = models.TextField(
        help_text="High-level, qualitative outcome summary",
    )
    narrative_explanation = models.TextField(
        blank=True,
        help_text="Optional narrative explanation",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "report_task"

    def __str__(self) -> str:
        return f"ReportTask(task={self.task_id}, audience={self.audience_type})"

    def clean(self):
        super().clean()
        if self.audience_type == self.AudienceType.OTHER and not self.audience_details.strip():
            raise ValidationError({
                "audience_details": "Audience details are required when audience type is 'other'."
            })

        if self.audience_prompt_version and not self.audience_prompt_version.strip():
            raise ValidationError({
                "audience_prompt_version": "Audience prompt version cannot be blank whitespace."
            })

    def save(self, *args, **kwargs):
        # Pin a prompt version on create (and only fill if missing later).
        if not self.audience_prompt_version:
            self.audience_prompt_version = get_default_prompt_version_for_audience(self.audience_type)
        super().save(*args, **kwargs)

    @property
    def resolved_prompt_template(self) -> dict:
        """Resolved template definition to be returned inline by API serializers."""
        return get_template_definition_for_version(self.audience_prompt_version)

    @property
    def is_complete(self) -> bool:
        if not self.audience_type:
            return False
        if self.audience_type == self.AudienceType.OTHER and not self.audience_details.strip():
            return False
        if not self.audience_prompt_version:
            return False
        # Check if context has situation (required field)
        if not isinstance(self.context, dict) or not self.context.get("situation", "").strip():
            return False
        if not self.outcome_summary.strip():
            return False
        action_count = self.key_actions.count()
        return 1 <= action_count <= 6


class ReportTaskKeyAction(models.Model):
    report_task = models.ForeignKey(
        ReportTask,
        on_delete=models.CASCADE,
        related_name="key_actions",
        help_text="Parent report task",
    )
    order_index = models.PositiveSmallIntegerField(
        help_text="Order of this action (1-6)",
    )
    action_text = models.CharField(
        max_length=280,
        help_text="Concise description of a key action taken",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "report_task_key_action"
        ordering = ["order_index", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["report_task", "order_index"],
                name="uniq_report_task_key_action_order",
            ),
            _order_index_range_constraint(),
        ]

    def __str__(self) -> str:
        return f"ReportTaskKeyAction(report_task={self.report_task_id}, order={self.order_index})"
