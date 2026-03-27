from django.conf import settings
from django.db import models
import uuid


class Meeting(models.Model):
    """
    Meeting model represents a single meeting scoped to a project.
    """

    STATUS_DRAFT = "draft"

    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
    ]

    project = models.ForeignKey(
        "core.Project",
        on_delete=models.CASCADE,
        related_name="meetings",
    )
    title = models.CharField(max_length=255)
    meeting_type = models.CharField(max_length=100)
    objective = models.TextField()
    scheduled_date = models.DateField(blank=True, null=True)
    scheduled_time = models.TimeField(blank=True, null=True)
    external_reference = models.CharField(max_length=255, blank=True, null=True)
    # Frontend meeting workspace layout (module blocks order/config).
    # Stored as JSON-serializable structure from the editor.
    layout_config = models.JSONField(default=list, null=True, blank=True)
    status = models.CharField(
        max_length=32,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
    )

    def __str__(self) -> str:
        return f"{self.title} ({self.project_id})"


class AgendaItem(models.Model):
    """
    AgendaItem model stores a single agenda entry for a meeting.
    """

    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="agenda_items",
    )
    content = models.TextField()
    order_index = models.PositiveIntegerField()
    is_priority = models.BooleanField(default=False)

    class Meta:
        unique_together = ("meeting", "order_index")

    def __str__(self) -> str:
        return f"AgendaItem #{self.order_index} for meeting {self.meeting_id}"


class ParticipantLink(models.Model):
    """
    ParticipantLink model represents a link between a meeting and a user.
    """

    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="participant_links",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meeting_participations",
    )
    role = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        unique_together = ("meeting", "user")

    def __str__(self) -> str:
        return f"ParticipantLink user={self.user_id} meeting={self.meeting_id}"


class ArtifactLink(models.Model):
    """
    ArtifactLink model represents a link between a meeting and an external artifact.
    """

    meeting = models.ForeignKey(
        Meeting,
        on_delete=models.CASCADE,
        related_name="artifact_links",
    )
    artifact_type = models.CharField(max_length=50)
    artifact_id = models.PositiveIntegerField()

    class Meta:
        unique_together = ("meeting", "artifact_type", "artifact_id")

    def __str__(self) -> str:
        return (
            f"ArtifactLink type={self.artifact_type} "
            f"id={self.artifact_id} meeting={self.meeting_id}"
        )


def _meeting_template_id() -> str:
    # Use hex string UUIDs to keep URL-safe IDs.
    return uuid.uuid4().hex


class MeetingTemplate(models.Model):
    """
    MeetingTemplate stores reusable workspace templates (layout_config).
    layout_config is expected to be JSON-serializable (e.g. the frontend `blocks` structure).
    Do not reintroduce block_config — legacy DB columns are dropped via migration 0003.
    """

    id = models.CharField(primary_key=True, max_length=64, default=_meeting_template_id, editable=False)
    name = models.CharField(max_length=255)
    layout_config = models.JSONField(default=dict, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="meeting_templates",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.id})"

