# Generated manually

from django.db import migrations, models
import django.db.models.deletion


def migrate_existing_subtasks(apps, schema_editor):
    """Set is_subtask=True for all existing subtasks"""
    Task = apps.get_model('task', 'Task')
    TaskHierarchy = apps.get_model('task', 'TaskHierarchy')
    
    # Get all tasks that are currently subtasks (have parent_relationship)
    subtask_ids = TaskHierarchy.objects.values_list('child_task_id', flat=True)
    Task.objects.filter(id__in=subtask_ids).update(is_subtask=True)


def reverse_migrate(apps, schema_editor):
    """Reverse migration - set all is_subtask to False"""
    Task = apps.get_model('task', 'Task')
    Task.objects.all().update(is_subtask=False)


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0008_taskrelation_taskhierarchy'),
    ]

    operations = [
        # Add is_subtask field to Task model
        migrations.AddField(
            model_name='task',
            name='is_subtask',
            field=models.BooleanField(default=False, editable=False, help_text='Whether this task is a subtask. Once True, cannot be changed back.'),
        ),
        # Migrate existing data: set is_subtask=True for all existing subtasks
        migrations.RunPython(migrate_existing_subtasks, reverse_migrate),
        # Modify TaskHierarchy.parent_task to allow NULL and use SET_NULL
        migrations.AlterField(
            model_name='taskhierarchy',
            name='parent_task',
            field=models.ForeignKey(
                help_text='Parent task (can be null if parent was deleted)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='subtasks',
                to='task.task'
            ),
        ),
    ]

