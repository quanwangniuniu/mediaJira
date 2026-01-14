from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0012_remove_task_task_proj_status_idx_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name='task',
                    name='anomaly_status',
                    field=models.CharField(
                        default='NORMAL',
                        help_text='Anomaly status for the task',
                        max_length=20
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
