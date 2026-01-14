from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Fix migration for Task.anomaly_status.

    Migration 0013_add_anomaly_status_state only updated Django's state
    (SeparateDatabaseAndState with empty database_operations), so new
    databases are missing the actual column. This migration adds the
    column at the database level only, without changing state again.
    """

    dependencies = [
        ("task", "0014_merge_20260110_0420"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.AddField(
                    model_name="task",
                    name="anomaly_status",
                    field=models.CharField(
                        max_length=20,
                        default="NORMAL",
                        help_text="Anomaly status for the task",
                    ),
                ),
            ],
        ),
    ]

