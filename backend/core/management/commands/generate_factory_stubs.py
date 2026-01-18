"""
Auto-generate factory code stubs for new model fields.
Helps keep factories in sync when models change.

Usage:
    python manage.py generate_factory_stubs campaign.CampaignTask
    python manage.py generate_factory_stubs core.CustomUser --output
    python manage.py generate_factory_stubs campaign.CampaignTask --based-on-validation
"""
from django.core.management.base import BaseCommand, CommandError
from django.apps import apps
from factories.validators import (
    get_model_fields_summary,
    get_missing_fields_from_validation,
    validate_factory
)
from factories.registry import get_factory


class Command(BaseCommand):
    help = 'Generate factory code stubs for missing fields'

    def add_arguments(self, parser):
        parser.add_argument(
            'model',
            type=str,
            nargs='?',
            help='Model in format app.ModelName (e.g., campaign.CampaignTask). If not provided, validates all factories and generates stubs for missing fields.'
        )
        parser.add_argument(
            '--output',
            action='store_true',
            help='Output to file instead of console'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='Output file path (default: factories/{app}_factories.py)'
        )
        parser.add_argument(
            '--based-on-validation',
            action='store_true',
            help='Generate stubs only for missing fields based on validation (default: generate all fields)'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Generate stubs for all factories with missing fields based on validation'
        )
        parser.add_argument(
            '--new-models',
            action='store_true',
            help='Generate complete factory classes for all models that don\'t have factories yet'
        )

    def handle(self, *args, **options):
        based_on_validation = options.get('based_on_validation', False) or options.get('all', False)
        
        # Handle --new-models flag: generate factories for models without factories
        if options.get('new_models', False):
            self._handle_new_models(options)
            return
        
        # Handle --all flag: generate stubs for all factories with missing fields
        if options.get('all', False):
            self._handle_all_factories(options)
            return
        
        # Handle specific model
        model_path = options.get('model')
        if not model_path:
            raise CommandError(
                'Model must be provided (e.g., campaign.CampaignTask) or use --all flag'
            )
        
        # Parse app and model name
        if '.' not in model_path:
            raise CommandError(
                'Model must be in format app.ModelName (e.g., campaign.CampaignTask)'
            )
        
        app_label, model_name = model_path.split('.', 1)
        
        try:
            model_class = apps.get_model(app_label, model_name)
        except LookupError:
            raise CommandError(f"Model {model_path} not found")
        
        # Get factory if it exists
        factory_class = get_factory(model_class)
        
        # Generate stub code based on validation or all fields
        if based_on_validation and factory_class:
            # Generate stubs only for missing fields
            field_info = get_missing_fields_from_validation(factory_class, model_class)
            stub_code = self._generate_missing_fields_stub(model_class, field_info, factory_class)
        else:
            # Generate stub for all fields (original behavior)
            fields_info = get_model_fields_summary(model_class)
            stub_code = self._generate_factory_stub(model_class, fields_info)
        
        if options.get('output', False) or options.get('file'):
            # Write to file
            file_path = options.get('file') or f"factories/{app_label}_factories.py"
            with open(file_path, 'a') as f:
                f.write('\n\n' + stub_code)
            self.stdout.write(
                self.style.SUCCESS(f"Factory stub appended to {file_path}")
            )
        else:
            # Output to console
            self.stdout.write('\n' + '=' * 60)
            if based_on_validation:
                self.stdout.write(f"Missing fields stub for {model_class.__name__}Factory")
            else:
                self.stdout.write(f"Factory stub for {model_class.__name__}")
            self.stdout.write('=' * 60 + '\n')
            self.stdout.write(stub_code)
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write(
                self.style.WARNING(
                    '\nNote: This is a stub. Review and customize field values as needed.'
                )
            )
    
    def _handle_all_factories(self, options):
        """Generate stubs for all factories with missing fields"""
        from factories.validators import validate_all_factories
        
        self.stdout.write('Validating all factories and generating stubs for missing fields...\n')
        
        results = validate_all_factories()
        
        if 'error' in results:
            self.stdout.write(self.style.ERROR(f"Error: {results['error']}"))
            return
        
        generated_count = 0
        for factory_name, result in results.items():
            if not result['warnings'] or not result.get('field_info'):
                continue
            
            field_info = result['field_info']
            missing_required = field_info.get('missing_required', [])
            missing_optional = field_info.get('missing_optional', [])
            
            if missing_required or (missing_optional and options.get('include_optional')):
                model_class = result.get('model_class')
                factory_class = result.get('factory_class')
                
                if model_class and factory_class:
                    stub_code = self._generate_missing_fields_stub(
                        model_class, field_info, factory_class
                    )
                    
                    app_label = model_class._meta.app_label
                    file_path = options.get('file') or f"factories/{app_label}_factories.py"
                    
                    if options.get('output', False) or options.get('file'):
                        with open(file_path, 'a') as f:
                            f.write('\n\n' + stub_code)
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"Generated stub for {factory_name} → {file_path}"
                            )
                        )
                    else:
                        self.stdout.write('\n' + '=' * 60)
                        self.stdout.write(f"Missing fields for {factory_name}")
                        self.stdout.write('=' * 60 + '\n')
                        self.stdout.write(stub_code)
                    
                    generated_count += 1
        
        if generated_count == 0:
            self.stdout.write(self.style.SUCCESS('\n✓ No missing fields found. All factories are up to date!'))
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\n✓ Generated stubs for {generated_count} factory/factories')
            )
    
    def _handle_new_models(self, options):
        """Generate complete factory classes for all models that don't have factories"""
        from factories.registry import get_all_registered_models
        
        self.stdout.write('Finding models without factories...\n')
        
        # Get all registered models (models that have factories)
        registered_models = set(get_all_registered_models())
        
        # Get all Django models
        all_models = []
        for app_config in apps.get_app_configs():
            # Skip proxy models and abstract models
            for model in app_config.get_models():
                if model._meta.abstract or model._meta.proxy:
                    continue
                all_models.append(model)
        
        # Find models without factories
        models_without_factories = [
            model for model in all_models
            if model not in registered_models
        ]
        
        if not models_without_factories:
            self.stdout.write(
                self.style.SUCCESS('\n✓ All models have factories!')
            )
            return
        
        self.stdout.write(
            f'Found {len(models_without_factories)} model(s) without factories:\n'
        )
        for model in models_without_factories:
            self.stdout.write(f'  - {model._meta.app_label}.{model.__name__}')
        
        # Group models by app
        models_by_app = {}
        for model in models_without_factories:
            app_label = model._meta.app_label
            if app_label not in models_by_app:
                models_by_app[app_label] = []
            models_by_app[app_label].append(model)
        
        # Generate factories for each app
        generated_count = 0
        for app_label, models in models_by_app.items():
            self.stdout.write(f'\nGenerating factories for {app_label} app...')
            
            # Generate factory code for all models in this app
            factory_code_lines = [
                '"""',
                f'Factory classes for {app_label} app models.',
                'Auto-generated - review and customize as needed.',
                '"""',
                'import factory',
                'from factory.django import DjangoModelFactory',
                'from faker import Faker',
                'from django.utils import timezone',
                '',
                f'from {app_label}.models import {", ".join([m.__name__ for m in models])}',
                '',
                'fake = Faker()',
                '',
            ]
            
            for model in models:
                fields_info = get_model_fields_summary(model)
                factory_stub = self._generate_factory_stub(model, fields_info)
                # Remove the imports from the stub (we already added them above)
                stub_lines = factory_stub.split('\n')
                # Skip lines with imports and fake/timezone
                relevant_lines = [
                    line for line in stub_lines
                    if not line.startswith('import ') and
                       not line.startswith('from ') and
                       'fake = Faker()' not in line and
                       line.strip()  # Skip empty lines at start
                ]
                factory_code_lines.extend(relevant_lines)
                factory_code_lines.append('')  # Add blank line between factories
            
            factory_code = '\n'.join(factory_code_lines)
            
            # Write to file
            file_path = options.get('file') or f"factories/{app_label}_factories.py"
            
            # Always write for new models
            try:
                # Check if file exists - if not, create it; if yes, append
                import os
                if os.path.exists(file_path):
                    with open(file_path, 'a') as f:
                        f.write('\n\n' + '=' * 60 + '\n')
                        f.write('# Auto-generated factories for new models\n')
                        f.write('=' * 60 + '\n\n')
                        f.write(factory_code)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Appended factories for {len(models)} model(s) → {file_path}"
                        )
                    )
                else:
                    with open(file_path, 'w') as f:
                        f.write(factory_code)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Created factory file with {len(models)} factory/factories → {file_path}"
                        )
                    )
                generated_count += len(models)
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"✗ Failed to write to {file_path}: {str(e)}"
                    )
                )
        
        if generated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n✓ Generated {generated_count} factory/factories for new models!'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    '\nNote: Review generated factories and customize field values as needed.'
                )
            )

    def _generate_factory_stub(self, model_class, fields_info):
        """Generate factory stub code"""
        app_label = model_class._meta.app_label
        model_name = model_class.__name__
        factory_name = f"{model_name}Factory"
        
        lines = [
            f"class {factory_name}(DjangoModelFactory):",
            f'    """Factory for {model_name} model"""',
            "    ",
            "    class Meta:",
            f"        model = {model_name}",
            "    ",
        ]
        
        # Add required fields
        if fields_info['required']:
            lines.append("    # Required fields")
            for field in fields_info['required']:
                field_name = field['name']
                field_type = field['type']
                
                if field_type == 'ForeignKey':
                    lines.append(f"    {field_name} = factory.SubFactory('factories.{app_label}_factories.YourFactory')")
                elif field_type == 'CharField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: fake.sentence())")
                elif field_type == 'TextField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: fake.text())")
                elif field_type == 'EmailField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: fake.email())")
                elif field_type == 'IntegerField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: fake.random_int())")
                elif field_type == 'DecimalField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: fake.pydecimal())")
                elif field_type == 'BooleanField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: fake.boolean())")
                elif field_type == 'DateTimeField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: timezone.now())")
                elif field_type == 'DateField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: fake.date())")
                elif field_type == 'JSONField':
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: {{}})")
                else:
                    lines.append(f"    {field_name} = factory.LazyAttribute(lambda obj: None)  # TODO: Set appropriate value")
                lines.append("")
        
        # Add optional fields as comments
        if fields_info['optional']:
            lines.append("    # Optional fields (uncomment and customize as needed)")
            for field in fields_info['optional'][:10]:  # Limit to first 10
                field_name = field['name']
                lines.append(f"    # {field_name} = factory.LazyAttribute(lambda obj: None)")
            if len(fields_info['optional']) > 10:
                lines.append(f"    # ... and {len(fields_info['optional']) - 10} more optional fields")
            lines.append("")
        
        # Add choice fields info
        if fields_info['choice_fields']:
            lines.append("    # Choice fields - use valid choices:")
            for field in fields_info['choice_fields']:
                field_name = field['name']
                choices = field.get('choices', [])
                if choices:
                    choices_str = ', '.join([f"'{c}'" for c in choices[:5]])
                    if len(choices) > 5:
                        choices_str += f", ... ({len(choices)} total)"
                    lines.append(f"    # {field_name}: {choices_str}")
            lines.append("")
        
        return '\n'.join(lines)
    
    def _generate_missing_fields_stub(self, model_class, field_info, factory_class):
        """
        Generate stub code only for missing fields based on validation.
        
        Args:
            model_class: Django model class
            field_info: Dictionary with missing_required and missing_optional fields
            factory_class: Existing factory class
        """
        app_label = model_class._meta.app_label
        model_name = model_class.__name__
        factory_name = f"{model_name}Factory"
        
        lines = [
            f"# Missing fields for {factory_name}",
            f"# Add these fields to the existing {factory_name} class:",
            "",
        ]
        
        # Generate stubs for missing required fields
        missing_required = field_info.get('missing_required', [])
        if missing_required:
            lines.append("    # Missing required fields:")
            for field in missing_required:
                field_name = field['name']
                field_type = field['type']
                
                stub_line = self._generate_field_stub(
                    field_name, field_type, field, app_label
                )
                lines.append(f"    {stub_line}")
                lines.append("")
        
        # Generate stubs for missing optional fields (as comments)
        missing_optional = field_info.get('missing_optional', [])
        if missing_optional:
            lines.append("    # Missing optional fields (uncomment if needed):")
            for field in missing_optional[:10]:  # Limit to first 10
                field_name = field['name']
                field_type = field['type']
                
                stub_line = self._generate_field_stub(
                    field_name, field_type, field, app_label, comment=True
                )
                lines.append(f"    # {stub_line}")
            if len(missing_optional) > 10:
                lines.append(f"    # ... and {len(missing_optional) - 10} more optional fields")
            lines.append("")
        
        if not missing_required and not missing_optional:
            lines.append("    # No missing fields found. Factory is up to date!")
        
        return '\n'.join(lines)
    
    def _generate_field_stub(self, field_name, field_type, field_info, app_label, comment=False):
        """Generate a single field stub line"""
        # Get related model info for ForeignKey
        related_model = field_info.get('related_model')
        related_app = field_info.get('related_app')
        choices = field_info.get('choices')
        
        if field_type == 'ForeignKey':
            if related_model and related_app:
                # Try to guess factory name (ModelNameFactory)
                factory_ref = f"factories.{related_app}_factories.{related_model}Factory"
                return f"{field_name} = factory.SubFactory({factory_ref})"
            else:
                return f"{field_name} = factory.SubFactory('TODO: Specify factory')"
        elif field_type == 'CharField':
            if choices:
                # Generate choice-based value
                choices_str = ', '.join([f"'{c}'" for c in choices[:3]])
                return f"{field_name} = factory.LazyAttribute(lambda obj: fake.random_element(elements=[{choices_str}]))"
            else:
                return f"{field_name} = factory.LazyAttribute(lambda obj: fake.sentence()[:50])"
        elif field_type == 'TextField':
            return f"{field_name} = factory.LazyAttribute(lambda obj: fake.text())"
        elif field_type == 'EmailField':
            return f"{field_name} = factory.LazyAttribute(lambda obj: fake.email())"
        elif field_type == 'IntegerField':
            if choices:
                choices_str = ', '.join([str(c) for c in choices[:3]])
                return f"{field_name} = factory.LazyAttribute(lambda obj: fake.random_element(elements=[{choices_str}]))"
            else:
                return f"{field_name} = factory.LazyAttribute(lambda obj: fake.random_int())"
        elif field_type == 'DecimalField':
            return f"{field_name} = factory.LazyAttribute(lambda obj: fake.pydecimal(left_digits=5, right_digits=2))"
        elif field_type == 'BooleanField':
            return f"{field_name} = factory.LazyAttribute(lambda obj: fake.boolean())"
        elif field_type == 'DateTimeField':
            return f"{field_name} = factory.LazyAttribute(lambda obj: timezone.now())"
        elif field_type == 'DateField':
            return f"{field_name} = factory.LazyAttribute(lambda obj: fake.date())"
        elif field_type == 'JSONField':
            return f"{field_name} = factory.LazyAttribute(lambda obj: {{}})"
        elif field_type == 'UUIDField':
            import uuid
            return f"{field_name} = factory.LazyFunction(uuid.uuid4)"
        else:
            return f"{field_name} = factory.LazyAttribute(lambda obj: None)  # TODO: Set appropriate value for {field_type}"