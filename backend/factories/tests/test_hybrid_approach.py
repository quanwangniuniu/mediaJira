"""
Tests for hybrid factory approach (Factory Boy + model_bakery).
"""
from django.test import TestCase
from model_bakery import baker
from factories.utils import make_instance, prepare_instance
from factories.validators import validate_factory, validate_all_factories
from factories.registry import get_factory, get_all_registered_models
from factories.core_factories import CustomUserFactory, OrganizationFactory
from core.models import CustomUser, Organization


class HybridFactoryTest(TestCase):
    """Test hybrid factory approach"""
    
    def test_make_instance_with_factory(self):
        """Test make_instance with Factory Boy factory"""
        user = make_instance(CustomUser, CustomUserFactory)
        self.assertIsNotNone(user)
        self.assertIsNotNone(user.email)
        self.assertIsNotNone(user.organization)
    
    def test_make_instance_with_model_bakery(self):
        """Test make_instance with model_bakery fallback"""
        user = make_instance(CustomUser)
        self.assertIsNotNone(user)
        self.assertIsNotNone(user.email)
    
    def test_make_instance_with_overrides(self):
        """Test make_instance with field overrides"""
        email = 'test@example.com'
        user = make_instance(CustomUser, CustomUserFactory, email=email)
        self.assertEqual(user.email, email)
    
    def test_prepare_instance(self):
        """Test prepare_instance (unsaved)"""
        user = prepare_instance(CustomUser, CustomUserFactory)
        self.assertIsNotNone(user)
        self.assertIsNone(user.pk)  # Not saved
        
        # Save related objects first (if they exist and are unsaved)
        if hasattr(user, 'organization') and user.organization and user.organization.pk is None:
            user.organization.save()
        
        user.save()
        self.assertIsNotNone(user.pk)


class FactoryValidationTest(TestCase):
    """Test factory validation utilities"""
    
    def test_validate_factory(self):
        """Test factory validation"""
        is_valid, warnings, field_info = validate_factory(CustomUserFactory, CustomUser)
        # Should be valid (factory covers required fields)
        self.assertTrue(is_valid or len(warnings) == 0)
    
    def test_validate_all_factories(self):
        """Test validation of all factories"""
        results = validate_all_factories()
        self.assertIsInstance(results, dict)
        self.assertGreater(len(results), 0)
        
        # Check that results have expected structure
        for factory_name, result in results.items():
            self.assertIn('valid', result)
            self.assertIn('warnings', result)
            self.assertIn('model', result)


class FactoryRegistryTest(TestCase):
    """Test factory registry"""
    
    def test_get_factory(self):
        """Test getting factory from registry"""
        factory = get_factory(CustomUser)
        self.assertEqual(factory, CustomUserFactory)
    
    def test_get_all_registered_models(self):
        """Test getting all registered models"""
        models = get_all_registered_models()
        self.assertGreater(len(models), 0)
        self.assertIn(CustomUser, models)
        self.assertIn(Organization, models)


class ModelBakeryFallbackTest(TestCase):
    """Test model_bakery fallback behavior"""
    
    def test_baker_make_works(self):
        """Test that model_bakery works directly"""
        user = baker.make(CustomUser)
        self.assertIsNotNone(user)
        self.assertIsNotNone(user.email)
    
    def test_baker_make_with_organization(self):
        """Test model_bakery with relationships"""
        org = baker.make(Organization)
        user = baker.make(CustomUser, organization=org)
        self.assertEqual(user.organization, org)
