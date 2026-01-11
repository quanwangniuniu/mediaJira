# Merge migration to resolve conflict between 0015_add_anomaly_status_db_column and 0017_merge_migration_conflicts
# This merges the final two migration paths:
# Path 1: 0014_merge_20260110_0420 → 0015_add_anomaly_status_db_column
# Path 2: 0014_merge_20260110_0420 → 0016_add_anomaly_status_column → 0017_merge_migration_conflicts

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0015_add_anomaly_status_db_column'),
        ('task', '0017_merge_migration_conflicts'),
    ]

    operations = [
        # Empty merge migration - both paths modify different aspects, so no conflict
    ]

