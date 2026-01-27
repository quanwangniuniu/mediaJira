# Generated manually to add Optimization model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0020_add_alert_task_type'),
        ('optimization', '0002_scalingplan_scalingstep'),
    ]

    operations = [
        migrations.CreateModel(
            name='Optimization',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('task', models.OneToOneField(blank=True, help_text='The task that owns this optimization (1:1 relationship)', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='optimization', to='task.task')),
            ],
            options={
                'db_table': 'optimization',
            },
        ),
    ]

