from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Calendar


User = get_user_model()


@receiver(post_save, sender=User)
def create_default_calendar(sender, instance: User, created: bool, **kwargs) -> None:
    if not created:
        return
    if not getattr(instance, "organization_id", None):
        return

    has_primary = Calendar.objects.filter(
        organization_id=instance.organization_id,
        owner_id=instance.id,
        is_primary=True,
        is_deleted=False,
    ).exists()
    if has_primary:
        return

    Calendar.objects.create(
        organization_id=instance.organization_id,
        owner=instance,
        name="My Calendar",
        color="#1E88E5",
        visibility="private",
        timezone="UTC",
        is_primary=True,
    )
