# Generated manually to add anomaly_status column to database
# This fixes the issue where 0013_add_anomaly_status_state.py only updated Django state
# but didn't create the actual database column

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0015_add_experiment_task_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='anomaly_status',
            field=models.CharField(
                default='NORMAL',
                help_text='Anomaly status for the task',
                max_length=20
            ),
        ),
    ]

