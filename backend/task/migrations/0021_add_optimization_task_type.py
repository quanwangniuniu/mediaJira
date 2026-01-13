# Generated manually to add 'optimization' to Task.type choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0020_add_alert_task_type'),
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
                ],
                help_text='Chosen type of the task',
                max_length=50,
            ),
        ),
    ]

