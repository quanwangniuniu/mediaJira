from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("task", "0014_merge_20260110_0420"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClientCommunication",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "communication_type",
                    models.CharField(
                        choices=[
                            ("budget_change", "Budget Change"),
                            ("creative_approval", "Creative Approval"),
                            ("kpi_update", "KPI Update"),
                            ("targeting_change", "Targeting Change"),
                            ("other", "Other"),
                        ],
                        max_length=50,
                        help_text="Type of client communication (e.g. budget change, creative approval)",
                    ),
                ),
                (
                    "stakeholders",
                    models.TextField(
                        blank=True,
                        help_text="Stakeholders involved in this communication. Can include client contacts and internal team members.",
                    ),
                ),
                (
                    "impacted_areas",
                    models.JSONField(
                        default=list,
                        help_text="List of impacted campaign areas, e.g. ['budget', 'creative', 'kpi', 'targeting']",
                    ),
                ),
                (
                    "required_actions",
                    models.TextField(
                        help_text="Required follow-up actions derived from this communication.",
                    ),
                ),
                (
                    "client_deadline",
                    models.DateField(
                        null=True,
                        blank=True,
                        help_text="Client-requested deadline for completing the required actions.",
                    ),
                ),
                (
                    "notes",
                    models.TextField(
                        blank=True,
                        help_text="Optional additional notes about the communication.",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "task",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="client_communications",
                        to="task.task",
                        help_text="Associated workflow task capturing this communication",
                    ),
                ),
            ],
            options={
                "db_table": "client_communication",
                "ordering": ["-created_at"],
            },
        ),
    ]

