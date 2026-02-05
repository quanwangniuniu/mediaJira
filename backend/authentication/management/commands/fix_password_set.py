"""
Management command to inspect and fix password_set field for existing users.

This command helps identify and fix users who have usable passwords but 
password_set=False, which prevents them from logging in.

Usage:
    python manage.py fix_password_set --check  # Check for issues only
    python manage.py fix_password_set --fix    # Fix identified issues
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Inspect and fix password_set field for users with usable passwords'

    def add_arguments(self, parser):
        parser.add_argument(
            '--check',
            action='store_true',
            help='Check for users with inconsistent password_set values',
        )
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Fix users with inconsistent password_set values',
        )

    def handle(self, *args, **options):
        check_mode = options['check']
        fix_mode = options['fix']

        if not check_mode and not fix_mode:
            self.stdout.write(
                self.style.WARNING(
                    'Please specify either --check or --fix option'
                )
            )
            return

        self.stdout.write(self.style.SUCCESS('\n=== Password Set Field Analysis ===\n'))

        # Find all users
        all_users = User.objects.all()
        self.stdout.write(f'Total users in database: {all_users.count()}')

        # Find users with usable passwords but password_set=False
        inconsistent_users = []
        for user in all_users:
            if user.has_usable_password() and not user.password_set:
                inconsistent_users.append(user)

        # Find users with unusable passwords but password_set=True
        google_only_inconsistent = []
        for user in all_users:
            if not user.has_usable_password() and user.password_set and user.google_registered:
                google_only_inconsistent.append(user)

        self.stdout.write(f'\nUsers with usable password but password_set=False: {len(inconsistent_users)}')
        if inconsistent_users:
            self.stdout.write(self.style.ERROR('\n  Affected users:'))
            for user in inconsistent_users:
                self.stdout.write(
                    f'    - {user.email} (ID: {user.id}, username: {user.username}, '
                    f'google_registered: {user.google_registered}, google_id: {user.google_id or "None"})'
                )

        self.stdout.write(f'\nGoogle OAuth users with unusable password but password_set=True: {len(google_only_inconsistent)}')
        if google_only_inconsistent:
            self.stdout.write(self.style.WARNING('\n  Affected users (should have password_set=False):'))
            for user in google_only_inconsistent:
                self.stdout.write(
                    f'    - {user.email} (ID: {user.id}, username: {user.username})'
                )

        # Statistics
        users_with_password = sum(1 for u in all_users if u.has_usable_password())
        users_password_set_true = all_users.filter(password_set=True).count()
        google_registered_users = all_users.filter(google_registered=True).count()

        self.stdout.write(f'\n=== Statistics ===')
        self.stdout.write(f'Users with usable password: {users_with_password}')
        self.stdout.write(f'Users with password_set=True: {users_password_set_true}')
        self.stdout.write(f'Google registered users: {google_registered_users}')

        if fix_mode:
            if inconsistent_users:
                self.stdout.write(self.style.WARNING(f'\n=== Fixing {len(inconsistent_users)} users ==='))
                fixed_count = 0
                for user in inconsistent_users:
                    user.password_set = True
                    user.save(update_fields=['password_set'])
                    fixed_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Fixed {user.email}')
                    )
                self.stdout.write(
                    self.style.SUCCESS(f'\nSuccessfully fixed {fixed_count} users')
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('\n✓ No users need fixing!')
                )

            if google_only_inconsistent:
                self.stdout.write(
                    self.style.WARNING(
                        f'\n=== Fixing {len(google_only_inconsistent)} Google OAuth users ===')
                )
                fixed_count = 0
                for user in google_only_inconsistent:
                    user.password_set = False
                    user.save(update_fields=['password_set'])
                    fixed_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Fixed {user.email}')
                    )
                self.stdout.write(
                    self.style.SUCCESS(f'\nSuccessfully fixed {fixed_count} Google OAuth users')
                )

        elif check_mode:
            if inconsistent_users or google_only_inconsistent:
                self.stdout.write(
                    self.style.WARNING(
                        f'\n⚠ Found {len(inconsistent_users) + len(google_only_inconsistent)} users with inconsistent password_set values'
                    )
                )
                self.stdout.write(
                    self.style.WARNING(
                        'Run with --fix to correct these issues'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS('\n✓ All users have consistent password_set values!')
                )

        self.stdout.write(self.style.SUCCESS('\n=== Analysis Complete ===\n'))
