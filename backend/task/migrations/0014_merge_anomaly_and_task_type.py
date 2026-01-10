# Generated merge migration to resolve conflict between 0013_add_anomaly_status_state and 0013_alter_task_type

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0013_add_anomaly_status_state'),
        ('task', '0013_alter_task_type'),
    ]

    operations = [
        # Empty merge migration - both 0013 migrations modify different fields (anomaly_status vs type), so no conflict
    ]

