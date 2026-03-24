from django.db.models.signals import post_save
from django.dispatch import receiver

from core.models import Project, ProjectMember
from core.utils.bot_user import get_agent_bot_user


@receiver(post_save, sender=Project)
def add_agent_bot_to_project(sender, instance, created, **kwargs):
    """Auto-add the Agent Bot user to every newly created project."""
    if not created:
        return
    bot = get_agent_bot_user()
    ProjectMember.objects.get_or_create(
        user=bot,
        project=instance,
        defaults={'role': 'bot', 'is_active': True},
    )
