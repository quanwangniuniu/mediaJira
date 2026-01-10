# Generated manually to add 'experiment' to Task.type choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0014_merge_anomaly_and_task_type'),
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
                    ('experiment', 'Experiment')
                ],
                help_text='Chosen type of the task',
                max_length=50
            ),
        ),
    ]

