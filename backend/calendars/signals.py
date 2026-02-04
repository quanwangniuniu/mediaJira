from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import Project
from .models import Calendar


@receiver(post_save, sender=Project)
def create_default_project_calendar(sender, instance: Project, created: bool, **kwargs) -> None:
    """
    Automatically create a primary calendar when a new project is created.
    """
    if not created:
        return
    if not getattr(instance, "organization_id", None):
        return

    # Check if project already has a primary calendar
    has_primary = Calendar.objects.filter(
        organization_id=instance.organization_id,
        project_id=instance.id,
        is_primary=True,
        is_deleted=False,
    ).exists()
    if has_primary:
        return

    Calendar.objects.create(
        organization_id=instance.organization_id,
        project=instance,
        created_by=instance.owner,  # The project owner is the calendar creator
        name=f"{instance.name} Calendar",
        color="#1E88E5",
        visibility="private",
        timezone="UTC",
        is_primary=True,
    )
