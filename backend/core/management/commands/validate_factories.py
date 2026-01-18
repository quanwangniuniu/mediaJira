"""
Management command to validate factories against models.
Run this after model migrations to catch factory issues.

Usage:
    python manage.py validate_factories
"""
from django.core.management.base import BaseCommand
from factories.validators import validate_all_factories


class Command(BaseCommand):
    help = 'Validate that all factories are in sync with their models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed information for all factories',
        )
        parser.add_argument(
            '--auto-generate-stubs',
            action='store_true',
            help='Automatically generate stubs for missing fields based on validation results',
        )

    def handle(self, *args, **options):
        verbose = options['verbose']
        self.stdout.write('Validating factories...\n')
        
        results = validate_all_factories()
        
        if 'error' in results:
            self.stdout.write(
                self.style.ERROR(f"Error: {results['error']}")
            )
            return
        
        all_valid = True
        valid_count = 0
        invalid_count = 0
        
        for factory_name, result in results.items():
            if result['warnings']:
                all_valid = False
                invalid_count += 1
                self.stdout.write(
                    self.style.WARNING(f"\n{factory_name} ({result['model']}):")
                )
                for warning in result['warnings']:
                    self.stdout.write(f"  ⚠ {warning}")
            else:
                valid_count += 1
                if verbose:
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ {factory_name} ({result['model']}): OK")
                    )
        
        # Summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(f"Summary: {valid_count} valid, {invalid_count} need attention")
        
        if all_valid:
            self.stdout.write(self.style.SUCCESS('\n✓ All factories are valid!'))
        else:
            self.stdout.write(
                self.style.ERROR('\n✗ Some factories need attention. See warnings above.')
            )
            self.stdout.write(
                self.style.WARNING(
                    '\nTip: Use model_bakery as fallback or update factories to include new fields.'
                )
            )
            
            # Auto-generate stubs if requested
            if options['auto_generate_stubs']:
                self.stdout.write('\n' + '=' * 60)
                self.stdout.write('Auto-generating stubs for missing fields...')
                self.stdout.write('=' * 60 + '\n')
                
                from core.management.commands.generate_factory_stubs import Command as GenerateStubsCommand
                stub_command = GenerateStubsCommand()
                stub_command.stdout = self.stdout
                stub_options = {'all': True, 'output': True, 'file': None}
                stub_command.handle(**stub_options)
            else:
                self.stdout.write(
                    self.style.WARNING(
                        '\nTip: Run with --auto-generate-stubs to automatically generate stubs for missing fields.'
                    )
                )
            exit(1)
