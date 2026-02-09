from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("spreadsheet", "0009_sheetstructureoperation"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkflowPattern",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("version", models.IntegerField(default=1)),
                ("origin_spreadsheet_id", models.IntegerField(blank=True, null=True)),
                ("origin_sheet_id", models.IntegerField(blank=True, null=True)),
                ("is_archived", models.BooleanField(default=False)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workflow_patterns",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="WorkflowPatternStep",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("seq", models.PositiveIntegerField()),
                ("type", models.CharField(max_length=50)),
                ("params", models.JSONField(default=dict)),
                ("disabled", models.BooleanField(default=False)),
                (
                    "pattern",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="steps",
                        to="spreadsheet.workflowpattern",
                    ),
                ),
            ],
            options={
                "ordering": ["seq"],
            },
        ),
        migrations.AddConstraint(
            model_name="workflowpatternstep",
            constraint=models.UniqueConstraint(fields=("pattern", "seq"), name="unique_pattern_step_seq"),
        ),
        migrations.AddIndex(
            model_name="workflowpattern",
            index=models.Index(fields=["owner", "is_archived"], name="spreadsheet_owner_i_e92511_idx"),
        ),
        migrations.AddIndex(
            model_name="workflowpatternstep",
            index=models.Index(fields=["pattern", "seq"], name="spreadsheet_pattern_a128c3_idx"),
        ),
    ]

