from __future__ import annotations

from django.core.management.base import BaseCommand

from calendars.models import Calendar
from core.models import Project, ProjectMember
from core.utils.project_calendars import (
    ensure_project_calendar,
    sync_project_member_calendar_access,
)


class Command(BaseCommand):
    help = (
        "Backfill project-bound calendars for existing projects and "
        "sync active member calendar access."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--project-id",
            dest="project_ids",
            action="append",
            type=int,
            help="Limit execution to one or more project IDs. Can be repeated.",
        )
        parser.add_argument(
            "--skip-member-sync",
            action="store_true",
            help="Only ensure project calendars. Skip member access sync.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without writing data.",
        )
        parser.add_argument(
            "--fail-fast",
            action="store_true",
            help="Stop immediately when an error is encountered.",
        )

    def handle(self, *args, **options):
        project_ids: list[int] = options.get("project_ids") or []
        dry_run: bool = options["dry_run"]
        skip_member_sync: bool = options["skip_member_sync"]
        fail_fast: bool = options["fail_fast"]

        projects_qs = Project.objects.select_related("organization", "owner").order_by("id")
        if project_ids:
            projects_qs = projects_qs.filter(id__in=project_ids)

        existing_project_calendar_ids = set(
            Calendar.objects.filter(
                project_id__isnull=False,
                is_deleted=False,
            ).values_list("project_id", flat=True)
        )

        project_total = projects_qs.count()
        project_missing_before = 0
        project_errors = 0
        project_processed = 0

        if dry_run:
            self.stdout.write(self.style.WARNING("Running in dry-run mode. No data will be written."))

        for project in projects_qs.iterator(chunk_size=200):
            project_processed += 1
            was_missing = project.id not in existing_project_calendar_ids
            if was_missing:
                project_missing_before += 1

            if dry_run:
                continue

            try:
                ensure_project_calendar(project)
                existing_project_calendar_ids.add(project.id)
            except Exception as exc:  # pragma: no cover - defensive runtime safeguard
                project_errors += 1
                self.stderr.write(
                    f"[project:{project.id}] ensure_project_calendar failed: {exc}"
                )
                if fail_fast:
                    raise

        self.stdout.write(f"Projects scanned: {project_total}")
        self.stdout.write(f"Projects missing calendars before run: {project_missing_before}")
        self.stdout.write(f"Project ensure errors: {project_errors}")

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-run completed."))
            return

        if skip_member_sync:
            self.stdout.write(self.style.SUCCESS("Backfill completed (member sync skipped)."))
            return

        members_qs = ProjectMember.objects.filter(is_active=True).select_related("project", "user").order_by("id")
        if project_ids:
            members_qs = members_qs.filter(project_id__in=project_ids)

        member_total = members_qs.count()
        member_processed = 0
        member_errors = 0

        for member in members_qs.iterator(chunk_size=500):
            member_processed += 1
            try:
                sync_project_member_calendar_access(
                    member.project,
                    member.user,
                    member.role,
                )
            except Exception as exc:  # pragma: no cover - defensive runtime safeguard
                member_errors += 1
                self.stderr.write(
                    f"[member:{member.id} project:{member.project_id}] "
                    f"sync_project_member_calendar_access failed: {exc}"
                )
                if fail_fast:
                    raise

        self.stdout.write(f"Active members scanned: {member_total}")
        self.stdout.write(f"Active members synced: {member_processed - member_errors}")
        self.stdout.write(f"Member sync errors: {member_errors}")
        self.stdout.write(self.style.SUCCESS("Backfill completed."))
