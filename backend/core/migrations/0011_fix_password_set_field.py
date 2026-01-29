# Generated manually to fix password_set field for existing users
from django.db import migrations


def fix_password_set_values(apps, schema_editor):
    """
    Fix password_set field for users:
    - Users with usable passwords should have password_set=True
    - Users with unusable passwords and google_registered=True should have password_set=False
    """
    CustomUser = apps.get_model('core', 'CustomUser')
    
    fixed_count = 0
    checked_count = 0
    
    # Fix users with usable passwords but password_set=False
    for user in CustomUser.objects.all():
        checked_count += 1
        # Check if user has a password hash (indicates usable password)
        # Django stores unusable passwords as '!<random_string>'
        has_usable_password = user.password and not user.password.startswith('!')
        
        if has_usable_password and not user.password_set:
            # User has a password but password_set is False - fix it
            user.password_set = True
            user.save(update_fields=['password_set'])
            fixed_count += 1
            print(f"Fixed user {user.email} (ID: {user.id}): Set password_set=True")
        elif not has_usable_password and user.password_set and user.google_registered:
            # Google OAuth user with unusable password but password_set=True - fix it
            user.password_set = False
            user.save(update_fields=['password_set'])
            fixed_count += 1
            print(f"Fixed Google OAuth user {user.email} (ID: {user.id}): Set password_set=False")
    
    print(f"Migration complete: Checked {checked_count} users, fixed {fixed_count} users")


def reverse_migration(apps, schema_editor):
    """
    This migration cannot be reversed as it fixes data inconsistencies.
    Reversing it would reintroduce the bugs.
    """
    print("This migration cannot be reversed - it fixes data inconsistencies")


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_merge_google_oauth_and_approval_fields'),
    ]

    operations = [
        migrations.RunPython(fix_password_set_values, reverse_migration),
    ]
