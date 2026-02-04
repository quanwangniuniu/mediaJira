# Generated migration for Calendar project ownership change
# This migration:
# 1. Adds Calendar.project field (nullable first)
# 2. Adds Calendar.created_by field (for audit)
# 3. Migrates existing calendars to projects
# 4. Removes Calendar.owner field
# 5. Updates indexes and constraints

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_calendars_to_projects(apps, schema_editor):
    """
    Migrate existing calendars from user ownership to project ownership.
    Strategy:
    - For each calendar owner, find or create a project they own/belong to
    - Associate the calendar with that project
    """
    Calendar = apps.get_model('calendars', 'Calendar')
    Project = apps.get_model('core', 'Project')
    ProjectMember = apps.get_model('core', 'ProjectMember')
    
    calendars = Calendar.objects.filter(project__isnull=True).select_related('owner', 'organization')
    
    for calendar in calendars:
        if not calendar.owner_id:
            continue
            
        owner = calendar.owner
        organization = calendar.organization
        
        # Try to find an existing project for this user
        # 1. First check if user owns a project in this organization
        project = Project.objects.filter(
            owner=owner,
            organization=organization,
            is_deleted=False,
        ).first()
        
        # 2. If not, check if user is a member of any project in this organization
        if not project:
            membership = ProjectMember.objects.filter(
                user=owner,
                project__organization=organization,
                project__is_deleted=False,
                is_active=True,
            ).select_related('project').first()
            if membership:
                project = membership.project
        
        # 3. If still no project, create a personal project for this user
        if not project:
            project = Project.objects.create(
                name=f"{owner.email}'s Project",
                organization=organization,
                owner=owner,
            )
            # Also create a ProjectMember entry for the owner
            ProjectMember.objects.get_or_create(
                user=owner,
                project=project,
                defaults={'role': 'owner', 'is_active': True}
            )
        
        # Associate calendar with the project
        calendar.project = project
        calendar.created_by = owner  # Preserve the original owner as created_by
        calendar.save(update_fields=['project', 'created_by'])


def reverse_migrate_calendars(apps, schema_editor):
    """
    Reverse migration: This is a no-op since we're removing the owner field.
    Data would be lost if reversed.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0001_initial'),  # Ensure core app migrations are applied
        ('calendars', '0002_event_etag'),
    ]

    operations = [
        # Step 1: Add the new project field (nullable initially for migration safety)
        migrations.AddField(
            model_name='calendar',
            name='project',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='calendars',
                to='core.project',
                help_text='Project this calendar belongs to',
            ),
        ),
        
        # Step 2: Add created_by field for audit purposes
        migrations.AddField(
            model_name='calendar',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_calendars',
                to=settings.AUTH_USER_MODEL,
                help_text='User who created this calendar (for audit)',
            ),
        ),
        
        # Step 3: Run data migration to associate calendars with projects
        migrations.RunPython(migrate_calendars_to_projects, reverse_migrate_calendars),
        
        # Step 4: Remove old indexes that reference 'owner'
        migrations.RemoveIndex(
            model_name='calendar',
            name='calendars_c_organiz_5134d2_idx',  # organization, owner, is_deleted
        ),
        migrations.RemoveIndex(
            model_name='calendar',
            name='calendars_c_organiz_80545e_idx',  # organization, owner, is_primary
        ),
        
        # Step 5: Remove old constraints that reference 'owner'
        migrations.RemoveConstraint(
            model_name='calendar',
            name='unique_calendar_name_per_owner_per_org',
        ),
        migrations.RemoveConstraint(
            model_name='calendar',
            name='unique_primary_calendar_per_owner_per_org',
        ),
        
        # Step 6: Remove the owner field
        migrations.RemoveField(
            model_name='calendar',
            name='owner',
        ),
        
        # Step 7: Make project field required (non-nullable)
        migrations.AlterField(
            model_name='calendar',
            name='project',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='calendars',
                to='core.project',
                help_text='Project this calendar belongs to',
            ),
        ),
        
        # Step 8: Add new indexes for project-based queries
        migrations.AddIndex(
            model_name='calendar',
            index=models.Index(
                fields=['organization', 'project', 'is_deleted'],
                name='calendars_c_organiz_proj_del_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='calendar',
            index=models.Index(
                fields=['organization', 'project', 'is_primary'],
                name='calendars_c_organiz_proj_pri_idx',
            ),
        ),
        
        # Step 9: Add new constraints for project-based uniqueness
        migrations.AddConstraint(
            model_name='calendar',
            constraint=models.UniqueConstraint(
                fields=['organization', 'project', 'name'],
                condition=models.Q(is_deleted=False),
                name='unique_calendar_name_per_project_per_org',
            ),
        ),
        migrations.AddConstraint(
            model_name='calendar',
            constraint=models.UniqueConstraint(
                fields=['organization', 'project'],
                condition=models.Q(is_primary=True) & models.Q(is_deleted=False),
                name='unique_primary_calendar_per_project_per_org',
            ),
        ),
    ]
