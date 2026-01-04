# Generated migration for adding database indexes for dashboard performance

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0007_add_priority_field'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['project', 'status'], name='task_proj_status_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['project', 'type'], name='task_proj_type_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['project', 'priority'], name='task_proj_priority_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['project', 'due_date'], name='task_proj_due_idx'),
        ),
    ]
