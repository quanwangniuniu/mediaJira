"""
Test cases for spreadsheet services (SpreadsheetService only)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from spreadsheet.models import Spreadsheet
from spreadsheet.services import SpreadsheetService
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


# ========== Service Tests ==========

class SpreadsheetServiceTest(TestCase):
    """Test cases for SpreadsheetService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
    
    def test_create_spreadsheet_success(self):
        """Test successful spreadsheet creation"""
        spreadsheet = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='New Spreadsheet'
        )
        
        self.assertIsNotNone(spreadsheet.id)
        self.assertEqual(spreadsheet.name, 'New Spreadsheet')
        self.assertEqual(spreadsheet.project, self.project)
        self.assertFalse(spreadsheet.is_deleted)
    
    def test_create_spreadsheet_duplicate_name(self):
        """Test creating spreadsheet with duplicate name fails"""
        SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Duplicate Name'
        )
        
        with self.assertRaises(ValidationError) as context:
            SpreadsheetService.create_spreadsheet(
                project=self.project,
                name='Duplicate Name'
            )
        
        self.assertIn('already exists', str(context.exception))
    
    def test_create_spreadsheet_different_projects(self):
        """Test creating spreadsheets with same name in different projects"""
        project2 = create_test_project(self.organization, name='Project 2')
        
        spreadsheet1 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Same Name'
        )
        spreadsheet2 = SpreadsheetService.create_spreadsheet(
            project=project2,
            name='Same Name'
        )
        
        self.assertNotEqual(spreadsheet1.id, spreadsheet2.id)
        self.assertEqual(spreadsheet1.name, spreadsheet2.name)
        self.assertNotEqual(spreadsheet1.project, spreadsheet2.project)
    
    def test_create_spreadsheet_after_deleted(self):
        """Test creating spreadsheet with name of deleted spreadsheet"""
        spreadsheet1 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Deleted Name'
        )
        spreadsheet1.is_deleted = True
        spreadsheet1.save()
        
        # Should be able to create another with same name
        spreadsheet2 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Deleted Name'
        )
        
        self.assertNotEqual(spreadsheet1.id, spreadsheet2.id)
        self.assertEqual(spreadsheet2.name, 'Deleted Name')
    
    def test_update_spreadsheet_success(self):
        """Test successful spreadsheet update"""
        spreadsheet = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Original Name'
        )
        
        updated_spreadsheet = SpreadsheetService.update_spreadsheet(
            spreadsheet=spreadsheet,
            name='Updated Name'
        )
        
        self.assertEqual(updated_spreadsheet.name, 'Updated Name')
        self.assertEqual(updated_spreadsheet.id, spreadsheet.id)
        self.assertEqual(updated_spreadsheet.project, self.project)
        
        # Verify it's saved in DB
        spreadsheet.refresh_from_db()
        self.assertEqual(spreadsheet.name, 'Updated Name')
    
    def test_update_spreadsheet_duplicate_name(self):
        """Test updating spreadsheet with duplicate name fails"""
        spreadsheet1 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='First Spreadsheet'
        )
        spreadsheet2 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Second Spreadsheet'
        )
        
        with self.assertRaises(ValidationError) as context:
            SpreadsheetService.update_spreadsheet(
                spreadsheet=spreadsheet2,
                name='First Spreadsheet'
            )
        
        self.assertIn('already exists', str(context.exception))
        
        # Verify spreadsheet2 name unchanged
        spreadsheet2.refresh_from_db()
        self.assertEqual(spreadsheet2.name, 'Second Spreadsheet')
    
    def test_update_spreadsheet_same_name(self):
        """Test updating spreadsheet with same name (should succeed)"""
        spreadsheet = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Same Name'
        )
        
        # Update with same name should succeed
        updated_spreadsheet = SpreadsheetService.update_spreadsheet(
            spreadsheet=spreadsheet,
            name='Same Name'
        )
        
        self.assertEqual(updated_spreadsheet.name, 'Same Name')
        self.assertEqual(updated_spreadsheet.id, spreadsheet.id)
    
    def test_update_spreadsheet_different_project(self):
        """Test updating spreadsheet with name from different project (should succeed)"""
        project2 = create_test_project(self.organization, name='Project 2')
        
        spreadsheet1 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Unique Name'
        )
        spreadsheet2 = SpreadsheetService.create_spreadsheet(
            project=project2,
            name='Different Name'
        )
        
        # Update spreadsheet2 with name from spreadsheet1 (different project) should succeed
        updated_spreadsheet = SpreadsheetService.update_spreadsheet(
            spreadsheet=spreadsheet2,
            name='Unique Name'
        )
        
        self.assertEqual(updated_spreadsheet.name, 'Unique Name')
    
    def test_update_spreadsheet_after_deleted(self):
        """Test updating spreadsheet with name of deleted spreadsheet"""
        spreadsheet1 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Deleted Name'
        )
        spreadsheet1.is_deleted = True
        spreadsheet1.save()
        
        spreadsheet2 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Active Spreadsheet'
        )
        
        # Should be able to update with name of deleted spreadsheet
        updated_spreadsheet = SpreadsheetService.update_spreadsheet(
            spreadsheet=spreadsheet2,
            name='Deleted Name'
        )
        
        self.assertEqual(updated_spreadsheet.name, 'Deleted Name')
    
    def test_delete_spreadsheet_success(self):
        """Test successful spreadsheet deletion (soft delete)"""
        spreadsheet = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='To Be Deleted'
        )
        spreadsheet_id = spreadsheet.id
        
        SpreadsheetService.delete_spreadsheet(spreadsheet)
        
        # Spreadsheet should still exist but marked as deleted
        self.assertTrue(Spreadsheet.objects.filter(id=spreadsheet_id).exists())
        spreadsheet.refresh_from_db()
        self.assertTrue(spreadsheet.is_deleted)
    
    def test_delete_spreadsheet_multiple_times(self):
        """Test deleting already deleted spreadsheet (idempotent)"""
        spreadsheet = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Double Delete'
        )
        
        SpreadsheetService.delete_spreadsheet(spreadsheet)
        self.assertTrue(spreadsheet.is_deleted)
        
        # Delete again should not cause error
        SpreadsheetService.delete_spreadsheet(spreadsheet)
        spreadsheet.refresh_from_db()
        self.assertTrue(spreadsheet.is_deleted)
    
    def test_create_spreadsheet_atomic_transaction(self):
        """Test that spreadsheet creation is atomic"""
        # This test ensures transaction rollback on error
        # If we have validation error, nothing should be created
        
        # Create one spreadsheet
        SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='First'
        )
        
        # Try to create duplicate - should raise ValidationError
        # and nothing should be partially created
        initial_count = Spreadsheet.objects.filter(
            project=self.project,
            is_deleted=False
        ).count()
        
        with self.assertRaises(ValidationError):
            SpreadsheetService.create_spreadsheet(
                project=self.project,
                name='First'
            )
        
        # Count should remain the same
        final_count = Spreadsheet.objects.filter(
            project=self.project,
            is_deleted=False
        ).count()
        
        self.assertEqual(initial_count, final_count)
    
    def test_update_spreadsheet_atomic_transaction(self):
        """Test that spreadsheet update is atomic"""
        spreadsheet1 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='First'
        )
        spreadsheet2 = SpreadsheetService.create_spreadsheet(
            project=self.project,
            name='Second'
        )
        
        original_name = spreadsheet2.name
        
        # Try to update with duplicate name - should raise ValidationError
        # and original name should remain
        with self.assertRaises(ValidationError):
            SpreadsheetService.update_spreadsheet(
                spreadsheet=spreadsheet2,
                name='First'
            )
        
        spreadsheet2.refresh_from_db()
        self.assertEqual(spreadsheet2.name, original_name)

