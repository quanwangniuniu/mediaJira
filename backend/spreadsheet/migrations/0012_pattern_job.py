from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("spreadsheet", "0011_rename_spreadsheet_sheet_op_type_idx_spreadsheet_sheet_i_b2bbc3_idx_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PatternJob",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("queued", "Queued"),
                            ("running", "Running"),
                            ("succeeded", "Succeeded"),
                            ("failed", "Failed"),
                        ],
                        default="queued",
                        max_length=20,
                    ),
                ),
                ("progress", models.PositiveSmallIntegerField(default=0)),
                ("step_cursor", models.IntegerField(blank=True, null=True)),
                ("error_code", models.CharField(blank=True, max_length=50, null=True)),
                ("error_message", models.TextField(blank=True, default="")),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="pattern_jobs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "pattern",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="jobs",
                        to="spreadsheet.workflowpattern",
                    ),
                ),
                (
                    "sheet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pattern_jobs",
                        to="spreadsheet.sheet",
                    ),
                ),
                (
                    "spreadsheet",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pattern_jobs",
                        to="spreadsheet.spreadsheet",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="patternjob",
            index=models.Index(fields=["created_by", "status"], name="spreadsheet_created_96ee1a_idx"),
        ),
        migrations.AddIndex(
            model_name="patternjob",
            index=models.Index(fields=["pattern", "status"], name="spreadsheet_pattern_1dfd5b_idx"),
        ),
        migrations.AddIndex(
            model_name="patternjob",
            index=models.Index(fields=["sheet", "status"], name="spreadsheet_sheet_s_2a5292_idx"),
        ),
    ]

