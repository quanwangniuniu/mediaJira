"""
Management command wrapper that runs makemigrations and then validates factories.

Usage:
    python manage.py makemigrations_and_validate
    python manage.py makemigrations_and_validate --auto-generate-stubs
"""
from django.core.management.base import BaseCommand, CommandError
from django.core.management import call_command
import sys


class Command(BaseCommand):
    help = 'Run makemigrations and validate factories afterwards'

    def add_arguments(self, parser):
        parser.add_argument(
            'app_label',
            nargs='*',
            help='App labels (optional, passed to makemigrations)'
        )
        parser.add_argument(
            '--name',
            type=str,
            help='Migration name (passed to makemigrations)'
        )
        parser.add_argument(
            '--empty',
            action='store_true',
            help='Create empty migration (passed to makemigrations)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show migrations without creating them (passed to makemigrations)'
        )
        parser.add_argument(
            '--merge',
            action='store_true',
            help='Merge migration branches (passed to makemigrations)'
        )
        parser.add_argument(
            '--auto-generate-stubs',
            action='store_true',
            help='Automatically generate stubs for missing factory fields'
        )
        parser.add_argument(
            '--no-validate',
            action='store_true',
            help='Skip factory validation after makemigrations'
        )

    def handle(self, *args, **options):
        # Prepare makemigrations options
        makemigrations_opts = {}
        if options.get('name'):
            makemigrations_opts['name'] = options['name']
        if options.get('empty'):
            makemigrations_opts['empty'] = True
        if options.get('dry_run'):
            makemigrations_opts['dry_run'] = True
        if options.get('merge'):
            makemigrations_opts['merge'] = True
        
        app_labels = options.get('app_label', [])
        
        # Run makemigrations
        self.stdout.write('Running makemigrations...')
        try:
            if app_labels:
                call_command('makemigrations', *app_labels, **makemigrations_opts)
            else:
                call_command('makemigrations', **makemigrations_opts)
        except SystemExit:
            # makemigrations exits if no changes
            self.stdout.write(self.style.WARNING('No migrations to create.'))
            return
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error running makemigrations: {e}')
            )
            raise CommandError(f'makemigrations failed: {e}')
        
        # Run factory validation if not skipped
        if not options.get('no_validate'):
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write('Validating factories after migration...')
            self.stdout.write('=' * 60 + '\n')
            
            validate_opts = {}
            if options.get('auto_generate_stubs'):
                validate_opts['auto_generate_stubs'] = True
            
            try:
                call_command('validate_factories', **validate_opts)
            except SystemExit as e:
                # validate_factories exits with code 1 if there are issues
                # This is expected, so we don't fail the command
                if e.code == 1:
                    self.stdout.write(
                        self.style.WARNING(
                            '\n⚠ Some factories need attention. '
                            'Run with --auto-generate-stubs to auto-fix them.'
                        )
                    )
                else:
                    raise
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'\nError validating factories: {e}')
                )
                # Don't fail the command, just warn
                self.stdout.write(
                    self.style.WARNING(
                        'Migration created successfully, but factory validation failed. '
                        'Run python manage.py validate_factories manually.'
                    )
                )
