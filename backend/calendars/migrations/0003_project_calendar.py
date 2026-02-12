# Generated manually: project-bound calendar support.

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0012_add_avatar_to_customuser"),
        ("calendars", "0002_event_etag"),
    ]

    operations = [
        migrations.AlterField(
            model_name="calendar",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                help_text="Calendar owner",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="owned_calendars",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="calendar",
            name="project",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional project binding for project-scoped calendars.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="calendars",
                to="core.project",
            ),
        ),
        migrations.AddIndex(
            model_name="calendar",
            index=models.Index(fields=["organization", "project", "is_deleted"], name="calendars_c_organiz_87e5ba_idx"),
        ),
        migrations.RemoveConstraint(
            model_name="calendar",
            name="unique_calendar_name_per_owner_per_org",
        ),
        migrations.RemoveConstraint(
            model_name="calendar",
            name="unique_primary_calendar_per_owner_per_org",
        ),
        migrations.AddConstraint(
            model_name="calendar",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_deleted=False, owner__isnull=False),
                fields=("organization", "owner", "name"),
                name="unique_calendar_name_per_owner_per_org",
            ),
        ),
        migrations.AddConstraint(
            model_name="calendar",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_primary=True, is_deleted=False, owner__isnull=False),
                fields=("organization", "owner"),
                name="unique_primary_calendar_per_owner_per_org",
            ),
        ),
        migrations.AddConstraint(
            model_name="calendar",
            constraint=models.UniqueConstraint(
                condition=models.Q(is_deleted=False, project__isnull=False),
                fields=("project",),
                name="unique_project_calendar",
            ),
        ),
    ]
