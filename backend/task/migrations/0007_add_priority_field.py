# Generated migration for adding priority field to Task model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0006_alter_task_type_alter_taskcomment_task_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='priority',
            field=models.CharField(
                choices=[
                    ('HIGHEST', 'Highest'),
                    ('HIGH', 'High'),
                    ('MEDIUM', 'Medium'),
                    ('LOW', 'Low'),
                    ('LOWEST', 'Lowest')
                ],
                default='MEDIUM',
                help_text='Priority level of the task',
                max_length=20
            ),
        ),
    ]
