from django.db import migrations, models
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0008_add_dashboard_indexes'),
    ]

    # NOTE:
    # We use default=timezone.now together with preserve_default=False
    # to backfill existing Task rows when adding non-null auto_now/auto_now_add
    # timestamp fields, without keeping this default on the model afterwards.
    operations = [
        migrations.AddField(
            model_name='task',
            name='created_at',
            field=models.DateTimeField(
                auto_now_add=True,
                default=timezone.now,
                help_text="Task creation timestamp"
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='task',
            name='updated_at',
            field=models.DateTimeField(
                auto_now=True,
                default=timezone.now,
                help_text="Task last update timestamp"
            ),
            preserve_default=False,
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['updated_at'], name='task_updated_at_idx'),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(fields=['created_at'], name='task_created_at_idx'),
        ),
    ]
