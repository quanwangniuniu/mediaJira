# Generated migration to remove start_date and end_date fields from Experiment model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0003_migrate_dates_to_task'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='experiment',
            name='experiment_dates_idx',
        ),
        migrations.RemoveField(
            model_name='experiment',
            name='start_date',
        ),
        migrations.RemoveField(
            model_name='experiment',
            name='end_date',
        ),
    ]

