# Generated migration to populate default roles

from django.db import migrations


# Default roles used in the UI for project member invitations
DEFAULT_ROLES = [
    {"name": "Super Administrator", "level": 1},
    {"name": "Organization Admin", "level": 2},
    {"name": "Team Leader", "level": 3},
    {"name": "Campaign Manager", "level": 4},
    {"name": "Budget Controller", "level": 5},
    {"name": "Approver", "level": 6},
    {"name": "Reviewer", "level": 7},
    {"name": "Data Analyst", "level": 8},
    {"name": "Senior Media Buyer", "level": 9},
    {"name": "Specialist Media Buyer", "level": 10},
    {"name": "Junior Media Buyer", "level": 11},
    {"name": "Designer", "level": 12},
    {"name": "Copywriter", "level": 13},
]


def populate_default_roles(apps, schema_editor):
    """
    Create default roles for all existing organizations.
    These roles are required for the project member invitation UI.
    """
    Role = apps.get_model("core", "Role")
    Organization = apps.get_model("core", "Organization")
    
    # Get all existing organizations
    organizations = Organization.objects.filter(is_deleted=False)
    
    for org in organizations:
        for role_data in DEFAULT_ROLES:
            Role.objects.get_or_create(
                organization=org,
                name=role_data["name"],
                defaults={"level": role_data["level"]},
            )
    
    # Also create global roles (organization=None) for super admin purposes
    for role_data in DEFAULT_ROLES:
        Role.objects.get_or_create(
            organization=None,
            name=role_data["name"],
            defaults={"level": role_data["level"]},
        )


def reverse_populate_default_roles(apps, schema_editor):
    """
    Remove default roles. Only removes roles that were auto-created.
    """
    Role = apps.get_model("core", "Role")
    role_names = [r["name"] for r in DEFAULT_ROLES]
    Role.objects.filter(name__in=role_names).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0011_fix_password_set_field"),
    ]

    operations = [
        migrations.RunPython(
            populate_default_roles,
            reverse_code=reverse_populate_default_roles,
        ),
    ]
