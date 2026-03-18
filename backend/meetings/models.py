from django.conf import settings
from django.db import models


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

