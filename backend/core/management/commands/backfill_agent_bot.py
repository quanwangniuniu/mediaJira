from django.core.management.base import BaseCommand

from core.models import Project, ProjectMember
from core.utils.bot_user import get_agent_bot_user


class Command(BaseCommand):
    help = "Add the Agent Bot user to all existing projects."

    def handle(self, *args, **options):
        bot = get_agent_bot_user()
        projects = Project.objects.all()
        added = 0
        for project in projects.iterator(chunk_size=200):
            _, created = ProjectMember.objects.get_or_create(
                user=bot,
                project=project,
                defaults={'role': 'bot', 'is_active': True},
            )
            if created:
                added += 1
        self.stdout.write(
            f"Done. Bot added to {added} projects "
            f"({projects.count()} total)."
        )
