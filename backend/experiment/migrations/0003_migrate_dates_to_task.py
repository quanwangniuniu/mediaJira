# Generated migration to migrate Experiment dates to Task dates

from django.db import migrations


def migrate_experiment_dates_to_task(apps, schema_editor):
    """
    Migrate Experiment.start_date and Experiment.end_date to Task.start_date and Task.due_date
    Uses raw SQL to avoid issues with model fields that may not exist in the database yet
    """
    db_alias = schema_editor.connection.alias
    
    # Use raw SQL to avoid Django ORM loading all model fields
    with schema_editor.connection.cursor() as cursor:
        # Get all experiments with tasks and their dates
        cursor.execute("""
            SELECT e.id, e.start_date, e.end_date, e.task_id,
                   t.start_date as task_start_date, t.due_date as task_due_date
            FROM experiment e
            INNER JOIN task_task t ON e.task_id = t.id
            WHERE e.task_id IS NOT NULL
        """)
        
        updated_count = 0
        for row in cursor.fetchall():
            exp_id, exp_start_date, exp_end_date, task_id, task_start_date, task_due_date = row
            
            updated_start = False
            updated_due = False
            new_start_date = task_start_date
            new_due_date = task_due_date
            
            # Migrate start_date: prefer Experiment.start_date if Task.start_date is NULL or Experiment date is more recent
            if exp_start_date:
                if task_start_date is None or exp_start_date > task_start_date:
                    new_start_date = exp_start_date
                    updated_start = True
            
            # Migrate end_date to due_date: prefer Experiment.end_date if Task.due_date is NULL or Experiment date is more recent
            if exp_end_date:
                if task_due_date is None or exp_end_date > task_due_date:
                    new_due_date = exp_end_date
                    updated_due = True
            
            if updated_start or updated_due:
                # Update using raw SQL to avoid model field issues
                cursor.execute("""
                    UPDATE task_task
                    SET start_date = %s, due_date = %s
                    WHERE id = %s
                """, [new_start_date, new_due_date, task_id])
                updated_count += 1
    
    print(f"Migrated dates for {updated_count} tasks from their experiments")


def reverse_migration(apps, schema_editor):
    """
    Reverse migration: This is not fully reversible as we can't know which dates came from Experiment
    We'll leave Task dates as they are
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0002_alter_experiment_options'),
        # Depend on a migration that has both start_date (added in 0004) and due_date (in 0001)
        # Use 0012 which exists before the migration split
        # We use raw SQL in the migration function to avoid issues with fields added later
        ('task', '0012_remove_task_task_proj_status_idx_and_more'),
    ]

    operations = [
        migrations.RunPython(migrate_experiment_dates_to_task, reverse_migration),
    ]

