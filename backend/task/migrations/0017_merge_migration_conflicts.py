# Merge migration to resolve conflict between 0014_merge_20260110_0420 and 0015_add_experiment_task_type
# This merges the two migration paths:
# Path 1: 0013_add_anomaly_status_state → 0014_merge_20260110_0420
# Path 2: 0013_alter_task_type → 0014_merge_anomaly_and_task_type → 0015_add_experiment_task_type
# Note: 0016_add_anomaly_status_column was removed as it duplicated 0015_add_anomaly_status_db_column

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0014_merge_20260110_0420'),
        ('task', '0015_add_experiment_task_type'),
    ]

    operations = [
        # Empty merge migration - both paths modify different fields, so no conflict
    ]

