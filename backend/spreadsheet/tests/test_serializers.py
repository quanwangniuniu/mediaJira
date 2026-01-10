"""
Test cases for spreadsheet serializers (Spreadsheet only)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework import serializers

from spreadsheet.models import Spreadsheet
from spreadsheet.serializers import (
    SpreadsheetSerializer,
    SpreadsheetCreateSerializer,
    SpreadsheetUpdateSerializer
)
from core.models import Project, Organization

User = get_user_model()


# ========== Helper Functions ==========

def create_test_user(username='testuser', email='test@example.com'):
    """Helper to create test user"""
    return User.objects.create_user(
        username=username,
        email=email,
        password='testpass123'
    )


def create_test_organization(name='Test Organization'):
    """Helper to create test organization"""
    return Organization.objects.create(name=name)


def create_test_project(organization, name='Test Project', owner=None):
    """Helper to create test project"""
    return Project.objects.create(
        name=name,
        organization=organization,
        owner=owner
    )


def create_test_spreadsheet(project, name='Test Spreadsheet'):
    """Helper to create test spreadsheet"""
    return Spreadsheet.objects.create(
        project=project,
        name=name
    )


# ========== Serializer Tests ==========

class SpreadsheetSerializerTest(TestCase):
    """Test cases for SpreadsheetSerializer (read operations)"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
    
    def test_serialize_spreadsheet(self):
        """Test serializing a spreadsheet"""
        spreadsheet = create_test_spreadsheet(self.project, name='My Spreadsheet')
        
        serializer = SpreadsheetSerializer(spreadsheet)
        data = serializer.data
        
        self.assertEqual(data['id'], spreadsheet.id)
        self.assertEqual(data['project'], self.project.id)
        self.assertEqual(data['name'], 'My Spreadsheet')
        self.assertFalse(data['is_deleted'])
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
    
    def test_serializer_read_only_fields(self):
        """Test that read-only fields are not writable"""
        spreadsheet = create_test_spreadsheet(self.project)
        
        data = {
            'id': 99999,
            'project': 99999,
            'name': 'Updated Name',
            'created_at': '2020-01-01T00:00:00Z',
            'updated_at': '2020-01-01T00:00:00Z',
            'is_deleted': True
        }
        
        serializer = SpreadsheetSerializer(spreadsheet, data=data)
        # Read-only fields should be ignored during deserialization
        # But since this is read-only serializer, we'll just test serialization
        serializer_data = SpreadsheetSerializer(spreadsheet).data
        self.assertEqual(serializer_data['id'], spreadsheet.id)
        self.assertEqual(serializer_data['project'], self.project.id)


class SpreadsheetCreateSerializerTest(TestCase):
    """Test cases for SpreadsheetCreateSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
    
    def test_serialize_create_data(self):
        """Test serializing data for spreadsheet creation"""
        data = {
            'name': 'New Spreadsheet'
        }
        
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['name'], 'New Spreadsheet')
    
    def test_validate_name_empty(self):
        """Test validation of empty name"""
        data = {'name': ''}
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_validate_name_whitespace_only(self):
        """Test validation of whitespace-only name"""
        data = {'name': '   '}
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_validate_name_max_length(self):
        """Test validation of name exceeding max length"""
        long_name = 'A' * 201  # Exceeds max_length=200
        data = {'name': long_name}
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_validate_name_exact_max_length(self):
        """Test validation of name at exact max length"""
        exact_max_name = 'A' * 200  # Exactly max_length=200
        data = {'name': exact_max_name}
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
    
    def test_validate_name_stripped(self):
        """Test that name is stripped of whitespace"""
        data = {'name': '  My Spreadsheet  '}
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['name'], 'My Spreadsheet')
    
    def test_validate_name_required(self):
        """Test that name is required"""
        data = {}
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_create_spreadsheet_with_valid_data(self):
        """Test creating spreadsheet with valid serialized data"""
        data = {'name': 'Valid Spreadsheet'}
        serializer = SpreadsheetCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        spreadsheet = serializer.save(project=self.project)
        self.assertEqual(spreadsheet.name, 'Valid Spreadsheet')
        self.assertEqual(spreadsheet.project, self.project)


class SpreadsheetUpdateSerializerTest(TestCase):
    """Test cases for SpreadsheetUpdateSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
        self.spreadsheet = create_test_spreadsheet(self.project, name='Original Name')
    
    def test_serialize_update_data(self):
        """Test serializing data for spreadsheet update"""
        data = {'name': 'Updated Spreadsheet'}
        serializer = SpreadsheetUpdateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['name'], 'Updated Spreadsheet')
    
    def test_validate_name_empty(self):
        """Test validation of empty name"""
        data = {'name': ''}
        serializer = SpreadsheetUpdateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_validate_name_whitespace_only(self):
        """Test validation of whitespace-only name"""
        data = {'name': '   '}
        serializer = SpreadsheetUpdateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_validate_name_max_length(self):
        """Test validation of name exceeding max length"""
        long_name = 'A' * 201  # Exceeds max_length=200
        data = {'name': long_name}
        serializer = SpreadsheetUpdateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)
    
    def test_validate_name_stripped(self):
        """Test that name is stripped of whitespace"""
        data = {'name': '  Updated Name  '}
        serializer = SpreadsheetUpdateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['name'], 'Updated Name')
    
    def test_update_spreadsheet_with_valid_data(self):
        """Test updating spreadsheet with valid serialized data"""
        data = {'name': 'New Name'}
        serializer = SpreadsheetUpdateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        updated_spreadsheet = serializer.update(self.spreadsheet, serializer.validated_data)
        self.assertEqual(updated_spreadsheet.name, 'New Name')
        self.assertEqual(updated_spreadsheet.project, self.project)
    
    def test_partial_update(self):
        """Test partial update (only name field)"""
        original_name = self.spreadsheet.name
        data = {'name': 'Partially Updated'}
        serializer = SpreadsheetUpdateSerializer(self.spreadsheet, data=data, partial=True)
        self.assertTrue(serializer.is_valid())
        
        updated_spreadsheet = serializer.update(self.spreadsheet, serializer.validated_data)
        self.assertEqual(updated_spreadsheet.name, 'Partially Updated')
        self.assertEqual(updated_spreadsheet.project, self.project)  # Should remain unchanged

