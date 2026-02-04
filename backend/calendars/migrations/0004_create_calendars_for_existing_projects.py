# Generated migration to create calendars for existing projects without calendars

from django.db import migrations


def create_calendars_for_projects_without_calendars(apps, schema_editor):
    """
    For any existing projects that don't have a primary calendar,
    create one automatically. This handles legacy data from before
    the automatic calendar creation signal was implemented.
    """
    Calendar = apps.get_model("calendars", "Calendar")
    Project = apps.get_model("core", "Project")
    
    projects_without_calendar = Project.objects.filter(
        is_deleted=False,
        organization__isnull=False,
    ).exclude(
        calendars__is_primary=True,
        calendars__is_deleted=False,
    ).distinct()
    
    calendars_created = 0
    for project in projects_without_calendar:
        # Check if this project already has a primary calendar
        has_primary = Calendar.objects.filter(
            organization_id=project.organization_id,
            project_id=project.id,
            is_primary=True,
            is_deleted=False,
        ).exists()
        
        if not has_primary:
            Calendar.objects.create(
                organization_id=project.organization_id,
                project=project,
                created_by=project.owner,
                name=f"{project.name} Calendar",
                color="#1E88E5",
                visibility="private",
                timezone="UTC",
                is_primary=True,
            )
            calendars_created += 1
    
    if calendars_created > 0:
        print(f"Created {calendars_created} calendars for existing projects")


def reverse_create_calendars(apps, schema_editor):
    """
    Reverse operation - we don't delete the calendars as they might have been
    used and contain data. Just pass.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("calendars", "0003_calendar_project_ownership"),
    ]

    operations = [
        migrations.RunPython(
            create_calendars_for_projects_without_calendars,
            reverse_code=reverse_create_calendars,
        ),
    ]
