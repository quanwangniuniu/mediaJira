# Generated manually to add 'platform_policy_update' to Task.type choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0021_add_optimization_task_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='type',
            field=models.CharField(
                choices=[
                    ('budget', 'Budget'),
                    ('asset', 'Asset'),
                    ('retrospective', 'Retrospective'),
                    ('report', 'Report'),
                    ('execution', 'Execution'),
                    ('scaling', 'Scaling'),
                    ('alert', 'Alert'),
                    ('experiment', 'Experiment'),
                    ('optimization', 'Optimization'),
                    ('communication', 'Client Communication'),
                    ('platform_policy_update', 'Platform Policy Update'),
                ],
                help_text='Chosen type of the task',
                max_length=50,
            ),
        ),
    ]
