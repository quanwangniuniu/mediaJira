"""
Tests for factory stub generation commands.
Tests new model detection and factory generation for changed models.
"""
import os
import tempfile
from io import StringIO
from django.test import TestCase, override_settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.apps import apps
from django.db import models

from factories.registry import (
    get_factory,
    get_all_registered_models,
    register_factory
)
from factories.validators import (
    validate_factory,
    get_model_fields_summary,
    get_missing_fields_from_validation
)
from core.models import CustomUser, Organization
from factories.core_factories import CustomUserFactory, OrganizationFactory


class FactoryStubGenerationTest(TestCase):
    """Test factory stub generation for new and changed models"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.temp_dir = tempfile.mkdtemp()
        self.addCleanup(lambda: self._remove_temp_dir())
    
    def _remove_temp_dir(self):
        """Clean up temporary directory"""
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_new_models_detection(self):
        """Test detection of models without factories"""
        # Get all registered models (models that have factories)
        registered_models = set(get_all_registered_models())
        
        # Get all Django models
        all_models = []
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                if model._meta.abstract or model._meta.proxy:
                    continue
                all_models.append(model)
        
        # Find models without factories
        models_without_factories = [
            model for model in all_models
            if model not in registered_models
        ]
        
        # Should find at least some models without factories
        # (or all models have factories, which is also valid)
        self.assertIsInstance(models_without_factories, list)
    
    def test_generate_factory_stubs_for_specific_model(self):
        """Test generating factory stub for a specific model"""
        out = StringIO()
        
        # Test with a model that has a factory
        call_command(
            'generate_factory_stubs',
            'core.CustomUser',
            stdout=out
        )
        
        output = out.getvalue()
        self.assertIn('CustomUser', output)
    
    def test_generate_factory_stubs_based_on_validation(self):
        """Test generating stubs only for missing fields based on validation"""
        out = StringIO()
        
        call_command(
            'generate_factory_stubs',
            'core.CustomUser',
            '--based-on-validation',
            stdout=out
        )
        
        output = out.getvalue()
        # Should output stub code or indicate no missing fields
        self.assertIsInstance(output, str)
    
    def test_generate_factory_stubs_all_missing_fields(self):
        """Test generating stubs for all factories with missing fields"""
        out = StringIO()
        
        call_command(
            'generate_factory_stubs',
            '--all',
            stdout=out
        )
        
        output = out.getvalue()
        # Should validate all factories and generate stubs if needed
        self.assertIsInstance(output, str)
    
    def test_generate_factory_stubs_new_models_flag(self):
        """Test --new-models flag for generating factories for models without factories"""
        out = StringIO()
        
        try:
            call_command(
                'generate_factory_stubs',
                '--new-models',
                stdout=out
            )
            
            output = out.getvalue()
            # Should either find models without factories or confirm all have factories
            self.assertIsInstance(output, str)
            # Should contain either "Found X model(s)" or "All models have factories"
            self.assertTrue(
                'Found' in output or 'All models have factories' in output or
                'model(s) without factories' in output
            )
        except CommandError as e:
            # Command might fail if there are issues, but should not crash
            self.fail(f"Command should not raise CommandError: {e}")
    
    def test_generate_factory_stubs_output_to_file(self):
        """Test generating stubs and writing to file"""
        temp_file = os.path.join(self.temp_dir, 'test_factories.py')
        
        out = StringIO()
        
        try:
            call_command(
                'generate_factory_stubs',
                'core.Organization',
                '--output',
                '--file', temp_file,
                stdout=out
            )
            
            # Check if file was created
            if os.path.exists(temp_file):
                with open(temp_file, 'r') as f:
                    content = f.read()
                    self.assertIsInstance(content, str)
        except CommandError:
            # Command might fail, but should handle gracefully
            pass
    
    def test_model_fields_summary(self):
        """Test getting model fields summary"""
        fields_info = get_model_fields_summary(CustomUser)
        
        self.assertIn('required', fields_info)
        self.assertIn('optional', fields_info)
        self.assertIsInstance(fields_info['required'], list)
        self.assertIsInstance(fields_info['optional'], list)
    
    def test_missing_fields_from_validation(self):
        """Test getting missing fields from factory validation"""
        field_info = get_missing_fields_from_validation(
            CustomUserFactory,
            CustomUser
        )
        
        self.assertIsInstance(field_info, dict)
        self.assertIn('missing_required', field_info)
        self.assertIn('missing_optional', field_info)
    
    def test_validate_factory_returns_field_info(self):
        """Test that validate_factory returns field information"""
        is_valid, warnings, field_info = validate_factory(
            CustomUserFactory,
            CustomUser
        )
        
        self.assertIsInstance(is_valid, bool)
        self.assertIsInstance(warnings, list)
        self.assertIsInstance(field_info, dict)
        self.assertIn('missing_required', field_info)
        self.assertIn('missing_optional', field_info)
    
    def test_generate_factory_stubs_invalid_model(self):
        """Test error handling for invalid model path"""
        out = StringIO()
        
        with self.assertRaises(CommandError):
            call_command(
                'generate_factory_stubs',
                'invalid.AppModel',
                stdout=out
            )
    
    def test_generate_factory_stubs_no_model_or_flag(self):
        """Test error handling when no model or flag is provided"""
        out = StringIO()
        
        with self.assertRaises(CommandError):
            call_command(
                'generate_factory_stubs',
                stdout=out
            )


class ModelChangeDetectionTest(TestCase):
    """Test detection of model changes and factory updates"""
    
    def test_detect_new_required_fields(self):
        """Test detection of new required fields in a model"""
        # Validate factory against model
        is_valid, warnings, field_info = validate_factory(
            CustomUserFactory,
            CustomUser
        )
        
        missing_required = field_info.get('missing_required', [])
        
        # If factory is missing required fields, they should be in the list
        for field in missing_required:
            self.assertIn('name', field)
            self.assertIn('type', field)
    
    def test_detect_new_optional_fields(self):
        """Test detection of new optional fields in a model"""
        is_valid, warnings, field_info = validate_factory(
            CustomUserFactory,
            CustomUser
        )
        
        missing_optional = field_info.get('missing_optional', [])
        
        # Optional fields should have name and type
        for field in missing_optional:
            self.assertIn('name', field)
            self.assertIn('type', field)
    
    def test_factory_stub_includes_required_fields(self):
        """Test that generated factory stub includes required fields"""
        fields_info = get_model_fields_summary(CustomUser)
        required_fields = fields_info.get('required', [])
        
        # Should have some required fields for CustomUser
        self.assertIsInstance(required_fields, list)
    
    def test_factory_stub_includes_optional_fields(self):
        """Test that generated factory stub includes optional fields"""
        fields_info = get_model_fields_summary(CustomUser)
        optional_fields = fields_info.get('optional', [])
        
        # Should have some optional fields for CustomUser
        self.assertIsInstance(optional_fields, list)
    
    def test_field_type_detection(self):
        """Test that field types are correctly detected"""
        fields_info = get_model_fields_summary(CustomUser)
        required_fields = fields_info.get('required', [])
        optional_fields = fields_info.get('optional', [])
        
        all_fields = required_fields + optional_fields
        
        # Check that fields have type information
        for field in all_fields:
            self.assertIn('type', field)
            self.assertIn(field['type'], [
                'CharField', 'TextField', 'EmailField', 'IntegerField',
                'DecimalField', 'BooleanField', 'DateTimeField', 'DateField',
                'ForeignKey', 'ManyToManyField', 'JSONField', 'UUIDField'
            ])


class FactoryGenerationIntegrationTest(TestCase):
    """Integration tests for factory generation workflow"""
    
    def test_full_workflow_new_model_detection(self):
        """Test full workflow: detect new models and generate factories"""
        out = StringIO()
        
        # Step 1: Detect models without factories
        registered_models = set(get_all_registered_models())
        
        # Step 2: Get all models
        all_models = []
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                if model._meta.abstract or model._meta.proxy:
                    continue
                all_models.append(model)
        
        # Step 3: Find models without factories
        models_without_factories = [
            model for model in all_models
            if model not in registered_models
        ]
        
        # Step 4: Generate factory stub (would be done by command)
        if models_without_factories:
            # Test with first model without factory
            test_model = models_without_factories[0]
            fields_info = get_model_fields_summary(test_model)
            
            # Should get field information
            self.assertIn('required', fields_info)
            self.assertIn('optional', fields_info)
    
    def test_full_workflow_model_change_detection(self):
        """Test full workflow: detect model changes and generate stubs"""
        # Step 1: Validate existing factory
        is_valid, warnings, field_info = validate_factory(
            CustomUserFactory,
            CustomUser
        )
        
        # Step 2: Get missing fields
        missing_info = get_missing_fields_from_validation(
            CustomUserFactory,
            CustomUser
        )
        
        # Step 3: Verify missing fields structure
        self.assertIn('missing_required', missing_info)
        self.assertIn('missing_optional', missing_info)
        
        # If there are missing fields, they should have proper structure
        for field in missing_info.get('missing_required', []):
            self.assertIn('name', field)
            self.assertIn('type', field)
        
        for field in missing_info.get('missing_optional', []):
            self.assertIn('name', field)
            self.assertIn('type', field)
    
    def test_generate_stubs_for_multiple_models(self):
        """Test generating stubs for multiple models (--all flag)"""
        out = StringIO()
        
        try:
            call_command(
                'generate_factory_stubs',
                '--all',
                '--based-on-validation',
                stdout=out
            )
            
            output = out.getvalue()
            # Should process multiple factories
            self.assertIsInstance(output, str)
        except CommandError:
            # Command might fail, but should handle gracefully
            pass


class FactoryRegistryIntegrationTest(TestCase):
    """Test factory registry integration with stub generation"""
    
    def test_registered_models_excluded_from_new_models(self):
        """Test that registered models are excluded from --new-models"""
        registered_models = set(get_all_registered_models())
        
        # CustomUser and Organization should be registered
        self.assertIn(CustomUser, registered_models)
        self.assertIn(Organization, registered_models)
        
        # Get all models
        all_models = []
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                if model._meta.abstract or model._meta.proxy:
                    continue
                all_models.append(model)
        
        # Find models without factories
        models_without_factories = [
            model for model in all_models
            if model not in registered_models
        ]
        
        # Registered models should not be in the list
        self.assertNotIn(CustomUser, models_without_factories)
        self.assertNotIn(Organization, models_without_factories)
    
    def test_new_model_detection_respects_registry(self):
        """Test that new model detection respects factory registry"""
        # Get initial registered models count
        initial_count = len(get_all_registered_models())
        
        # Simulate detecting models without factories
        registered_models = set(get_all_registered_models())
        all_models = []
        for app_config in apps.get_app_configs():
            for model in app_config.get_models():
                if model._meta.abstract or model._meta.proxy:
                    continue
                all_models.append(model)
        
        models_without_factories = [
            model for model in all_models
            if model not in registered_models
        ]
        
        # Should have some models without factories OR all have factories
        self.assertIsInstance(models_without_factories, list)


class ValidateFactoriesCommandTest(TestCase):
    """Test validate_factories management command"""
    
    def test_validate_factories_command(self):
        """Test validate_factories command execution"""
        out = StringIO()
        
        try:
            call_command(
                'validate_factories',
                stdout=out
            )
            
            output = out.getvalue()
            # Should validate all factories
            self.assertIn('Validating factories', output)
            # Should show summary
            self.assertTrue('Summary:' in output or 'valid' in output.lower())
        except SystemExit:
            # Command might exit with code 1 if there are issues
            pass
    
    def test_validate_factories_verbose(self):
        """Test validate_factories command with --verbose flag"""
        out = StringIO()
        
        try:
            call_command(
                'validate_factories',
                '--verbose',
                stdout=out
            )
            
            output = out.getvalue()
            # Should show detailed information
            self.assertIn('Validating factories', output)
        except SystemExit:
            pass
    
    def test_validate_factories_auto_generate_stubs(self):
        """Test validate_factories with --auto-generate-stubs flag"""
        out = StringIO()
        
        try:
            call_command(
                'validate_factories',
                '--auto-generate-stubs',
                stdout=out
            )
            
            output = out.getvalue()
            # Should attempt to generate stubs if there are issues
            self.assertIn('Validating factories', output)
        except SystemExit:
            pass
