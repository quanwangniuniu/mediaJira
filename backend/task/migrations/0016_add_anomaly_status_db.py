from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("task", "0015_alter_task_type_add_alert"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.AddField(
                    model_name="task",
                    name="anomaly_status",
                    field=models.CharField(
                        default="NORMAL",
                        help_text="Anomaly status for the task",
                        max_length=20,
                    ),
                ),
            ],
        ),
    ]
