from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

from task.models import Task


class CommunicationType(models.TextChoices):
    BUDGET_CHANGE = "budget_change", "Budget Change"
    CREATIVE_APPROVAL = "creative_approval", "Creative Approval"
    KPI_UPDATE = "kpi_update", "KPI Update"
    TARGETING_CHANGE = "targeting_change", "Targeting Change"
    OTHER = "other", "Other"


class ImpactedArea(models.TextChoices):
    BUDGET = "budget", "Budget"
    CREATIVE = "creative", "Creative"
    KPI = "kpi", "KPI"
    TARGETING = "targeting", "Targeting"


class ClientCommunication(models.Model):
    """
    Domain model for client communications that impact campaigns.

    Each instance is intended to be linked to a Task(type="communication")
    via the generic link mechanism on Task (content_type + object_id) and,
    optionally, via the explicit foreign key below.
    """

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="client_communications",
        help_text="Associated workflow task capturing this communication",
    )

    communication_type = models.CharField(
        max_length=50,
        choices=CommunicationType.choices,
        help_text="Type of client communication (e.g. budget change, creative approval)",
    )

    stakeholders = models.TextField(
        blank=True,
        help_text=(
            "Stakeholders involved in this communication. "
            "Can include client contacts and internal team members."
        ),
    )

    impacted_areas = models.JSONField(
        default=list,
        help_text=(
            "List of impacted campaign areas, "
            "e.g. ['budget', 'creative', 'kpi', 'targeting']"
        ),
    )

    required_actions = models.TextField(
        help_text="Required follow-up actions derived from this communication.",
    )

    client_deadline = models.DateField(
        null=True,
        blank=True,
        help_text="Client-requested deadline for completing the required actions.",
    )

    notes = models.TextField(
        blank=True,
        help_text="Optional additional notes about the communication.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_communication"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"ClientCommunication #{self.id} for Task {self.task_id}"

    def clean(self):
        super().clean()

        if not self.impacted_areas:
            raise ValidationError(
                {"impacted_areas": "At least one impacted area must be specified."}
            )

        # Ensure impacted_areas only contains known values
        valid_values = {choice.value for choice in ImpactedArea}
        invalid = [area for area in self.impacted_areas if area not in valid_values]
        if invalid:
            raise ValidationError(
                {
                    "impacted_areas": (
                        f"Invalid impacted areas: {invalid}. "
                        f"Allowed values: {sorted(valid_values)}"
                    )
                }
            )

        # Sanity check: client_deadline should not be in the past by a large margin
        if self.client_deadline and self.client_deadline < timezone.now().date():
            # Allow past dates, but guard against obviously wrong data far in the past
            if (timezone.now().date() - self.client_deadline).days > 365:
                raise ValidationError(
                    {"client_deadline": "Client deadline appears to be too far in the past."}
                )

