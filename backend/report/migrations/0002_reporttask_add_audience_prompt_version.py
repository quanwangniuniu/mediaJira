from django.db import migrations, models


DEFAULT_VERSION_BY_AUDIENCE = {
    "client": "client_v1",
    "manager": "manager_v1",
    "internal_team": "internal_team_v1",
    "self": "self_v1",
    "other": "other_v1",
}


def populate_prompt_versions(apps, schema_editor):
    ReportTask = apps.get_model("report", "ReportTask")

    # Backfill existing rows based on audience_type.
    for report_task in ReportTask.objects.all().only("id", "audience_type", "audience_prompt_version"):
        if report_task.audience_prompt_version:
            continue
        report_task.audience_prompt_version = DEFAULT_VERSION_BY_AUDIENCE.get(
            report_task.audience_type, "other_v1"
        )
        report_task.save(update_fields=["audience_prompt_version"])


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("report", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="reporttask",
            name="audience_prompt_version",
            field=models.CharField(
                blank=True,
                help_text="Pinned prompt template version for this audience at creation time",
                max_length=50,
                null=True,
            ),
        ),
        migrations.RunPython(populate_prompt_versions, reverse_code=noop_reverse),
        migrations.AlterField(
            model_name="reporttask",
            name="audience_prompt_version",
            field=models.CharField(
                blank=True,
                help_text="Pinned prompt template version for this audience at creation time",
                max_length=50,
            ),
        ),
    ]
