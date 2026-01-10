"""
Test cases for spreadsheet models (Spreadsheet only)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from spreadsheet.models import Spreadsheet
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


# ========== Model Tests ==========

class SpreadsheetModelTest(TestCase):
    """Test cases for Spreadsheet model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
    
    def test_create_spreadsheet(self):
        """Test creating a spreadsheet"""
        spreadsheet = create_test_spreadsheet(self.project)
        
        self.assertEqual(spreadsheet.name, 'Test Spreadsheet')
        self.assertEqual(spreadsheet.project, self.project)
        self.assertFalse(spreadsheet.is_deleted)
        self.assertIsNotNone(spreadsheet.created_at)
        self.assertIsNotNone(spreadsheet.updated_at)
    
    def test_spreadsheet_string_representation(self):
        """Test spreadsheet string representation"""
        spreadsheet = create_test_spreadsheet(self.project, name='My Spreadsheet')
        expected_str = f"My Spreadsheet (Project: {self.project.name})"
        self.assertEqual(str(spreadsheet), expected_str)
    
    def test_unique_spreadsheet_name_per_project(self):
        """Test that spreadsheet names must be unique per project (when not deleted)"""
        create_test_spreadsheet(self.project, name='Unique Name')
        
        # Try to create another with same name - should fail
        with self.assertRaises(IntegrityError):
            create_test_spreadsheet(self.project, name='Unique Name')
    
    def test_duplicate_name_allowed_when_deleted(self):
        """Test that deleted spreadsheets don't block duplicate names"""
        spreadsheet1 = create_test_spreadsheet(self.project, name='Duplicate Name')
        spreadsheet1.is_deleted = True
        spreadsheet1.save()
        
        # Should be able to create another with same name
        spreadsheet2 = create_test_spreadsheet(self.project, name='Duplicate Name')
        self.assertIsNotNone(spreadsheet2)
        self.assertEqual(spreadsheet2.name, 'Duplicate Name')
    
    def test_spreadsheet_can_have_same_name_in_different_projects(self):
        """Test that same name is allowed in different projects"""
        project2 = create_test_project(self.organization, name='Project 2')
        
        spreadsheet1 = create_test_spreadsheet(self.project, name='Same Name')
        spreadsheet2 = create_test_spreadsheet(project2, name='Same Name')
        
        self.assertEqual(spreadsheet1.name, spreadsheet2.name)
        self.assertNotEqual(spreadsheet1.project, spreadsheet2.project)
    
    def test_spreadsheet_ordering(self):
        """Test that spreadsheets are ordered by created_at descending"""
        spreadsheet1 = create_test_spreadsheet(self.project, name='First')
        spreadsheet2 = create_test_spreadsheet(self.project, name='Second')
        spreadsheet3 = create_test_spreadsheet(self.project, name='Third')
        
        spreadsheets = list(Spreadsheet.objects.filter(project=self.project, is_deleted=False))
        
        # Should be ordered by -created_at, so newest first
        self.assertEqual(spreadsheets[0].name, 'Third')
        self.assertEqual(spreadsheets[1].name, 'Second')
        self.assertEqual(spreadsheets[2].name, 'First')
    
    def test_spreadsheet_project_relationship(self):
        """Test spreadsheet-project foreign key relationship"""
        spreadsheet = create_test_spreadsheet(self.project)
        
        self.assertEqual(spreadsheet.project, self.project)
        self.assertIn(spreadsheet, self.project.spreadsheets.all())
    
    def test_cascade_delete_spreadsheet_when_project_deleted(self):
        """Test that spreadsheet is deleted when project is deleted"""
        spreadsheet = create_test_spreadsheet(self.project)
        spreadsheet_id = spreadsheet.id
        
        self.project.delete()
        
        # Spreadsheet should be deleted (hard delete with CASCADE)
        self.assertFalse(Spreadsheet.objects.filter(id=spreadsheet_id).exists())
    
    def test_spreadsheet_name_max_length(self):
        """Test spreadsheet name max length constraint"""
        long_name = 'A' * 200  # Max length is 200
        spreadsheet = create_test_spreadsheet(self.project, name=long_name)
        
        self.assertEqual(len(spreadsheet.name), 200)
        
        # Try to exceed max length
        too_long_name = 'A' * 201
        spreadsheet.name = too_long_name
        with self.assertRaises(ValidationError):
            spreadsheet.full_clean()
    
    def test_spreadsheet_name_empty_string(self):
        """Test that empty string name is allowed by model (validation in serializer)"""
        spreadsheet = Spreadsheet.objects.create(
            project=self.project,
            name=''
        )
        self.assertEqual(spreadsheet.name, '')
    
    def test_spreadsheet_indexes(self):
        """Test that indexes are properly set up for performance"""
        # Create spreadsheets to test index usage
        create_test_spreadsheet(self.project, name='Test 1')
        create_test_spreadsheet(self.project, name='Test 2')
        
        # Query using indexed fields
        spreadsheets = Spreadsheet.objects.filter(
            project=self.project,
            is_deleted=False
        )
        
        self.assertEqual(spreadsheets.count(), 2)

