# Generated manually

from django.db import migrations, models
import django.db.models.deletion


def delete_orphaned_hierarchies_and_subtasks(apps, schema_editor):
    """
    Before changing parent_task to CASCADE (non-nullable), we need to:
    1. Delete all TaskHierarchy records where parent_task_id is NULL
    2. Delete all orphaned subtasks (tasks with is_subtask=True that have no parent)
    """
    TaskHierarchy = apps.get_model('task', 'TaskHierarchy')
    Task = apps.get_model('task', 'Task')
    
    # Find all TaskHierarchy records with NULL parent_task_id
    orphaned_hierarchies = TaskHierarchy.objects.filter(parent_task_id__isnull=True)
    orphaned_child_task_ids = list(orphaned_hierarchies.values_list('child_task_id', flat=True))
    
    # Delete orphaned hierarchies
    orphaned_hierarchies.delete()
    
    # For each orphaned child task, check if it has any other parent relationships
    # If not, delete the orphaned subtask
    for child_task_id in orphaned_child_task_ids:
        remaining_hierarchies = TaskHierarchy.objects.filter(child_task_id=child_task_id)
        if not remaining_hierarchies.exists():
            # No remaining parents, delete the orphaned subtask
            Task.objects.filter(id=child_task_id).delete()


def reverse_migrate(apps, schema_editor):
    """Reverse migration - nothing to do as we can't restore deleted records"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0009_add_is_subtask_field'),
    ]

    operations = [
        # First, clean up orphaned hierarchies and subtasks
        migrations.RunPython(delete_orphaned_hierarchies_and_subtasks, reverse_migrate),
        # Then change TaskHierarchy.parent_task back to CASCADE and remove null=True
        migrations.AlterField(
            model_name='taskhierarchy',
            name='parent_task',
            field=models.ForeignKey(
                help_text='Parent task',
                on_delete=django.db.models.deletion.CASCADE,
                related_name='subtasks',
                to='task.task'
            ),
        ),
    ]

