from __future__ import annotations

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Organization, Role


# Default roles used in the UI for project member invitations
DEFAULT_ROLES = [
    {"name": "Super Administrator", "level": 1},
    {"name": "Organization Admin", "level": 2},
    {"name": "Team Leader", "level": 3},
    {"name": "Campaign Manager", "level": 4},
    {"name": "Budget Controller", "level": 5},
    {"name": "Approver", "level": 6},
    {"name": "Reviewer", "level": 7},
    {"name": "Data Analyst", "level": 8},
    {"name": "Senior Media Buyer", "level": 9},
    {"name": "Specialist Media Buyer", "level": 10},
    {"name": "Junior Media Buyer", "level": 11},
    {"name": "Designer", "level": 12},
    {"name": "Copywriter", "level": 13},
]


@receiver(post_save, sender=Organization)
def create_default_organization_roles(sender, instance: Organization, created: bool, **kwargs) -> None:
    """
    Automatically create default roles when a new organization is created.
    These roles are required for the project member invitation UI.
    """
    if not created:
        return
    
    for role_data in DEFAULT_ROLES:
        Role.objects.get_or_create(
            organization=instance,
            name=role_data["name"],
            defaults={"level": role_data["level"]},
        )
