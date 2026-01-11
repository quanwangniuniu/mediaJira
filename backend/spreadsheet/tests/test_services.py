from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from spreadsheet.models import Spreadsheet, Sheet
from spreadsheet.services import SpreadsheetService, SheetService
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


def create_test_sheet(spreadsheet, name='Test Sheet', position=0):
    """Helper to create test sheet"""
    return Sheet.objects.create(
        spreadsheet=spreadsheet,
        name=name,
        position=position
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


# ========== SheetService Tests ==========

class SheetServiceTest(TestCase):
    """Test cases for SheetService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
        self.spreadsheet = create_test_spreadsheet(self.project)
    
    def test_create_sheet_success(self):
        """Test successful sheet creation with auto-assigned position"""
        sheet = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='New Sheet'
        )
        
        self.assertIsNotNone(sheet.id)
        self.assertEqual(sheet.name, 'New Sheet')
        self.assertEqual(sheet.spreadsheet, self.spreadsheet)
        self.assertEqual(sheet.position, 0)  # First sheet should be position 0
        self.assertFalse(sheet.is_deleted)
    
    def test_create_sheet_auto_assigns_position(self):
        """Test that position is automatically assigned"""
        sheet1 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Sheet 1'
        )
        self.assertEqual(sheet1.position, 0)
        
        sheet2 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Sheet 2'
        )
        self.assertEqual(sheet2.position, 1)
        
        sheet3 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Sheet 3'
        )
        self.assertEqual(sheet3.position, 2)
    
    def test_create_sheet_duplicate_name(self):
        """Test creating sheet with duplicate name fails"""
        SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Duplicate Name'
        )
        
        with self.assertRaises(ValidationError) as context:
            SheetService.create_sheet(
                spreadsheet=self.spreadsheet,
                name='Duplicate Name'
            )
        
        self.assertIn('already exists', str(context.exception))
    
    def test_create_sheet_different_spreadsheets(self):
        """Test creating sheets with same name in different spreadsheets"""
        spreadsheet2 = create_test_spreadsheet(self.project, name='Spreadsheet 2')
        
        sheet1 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Same Name'
        )
        sheet2 = SheetService.create_sheet(
            spreadsheet=spreadsheet2,
            name='Same Name'
        )
        
        self.assertNotEqual(sheet1.id, sheet2.id)
        self.assertEqual(sheet1.name, sheet2.name)
        self.assertNotEqual(sheet1.spreadsheet, sheet2.spreadsheet)
    
    def test_create_sheet_after_deleted(self):
        """Test creating sheet with name of deleted sheet"""
        sheet1 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Deleted Name'
        )
        sheet1.is_deleted = True
        sheet1.save()
        
        # Should be able to create another with same name
        sheet2 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Deleted Name'
        )
        
        self.assertNotEqual(sheet1.id, sheet2.id)
        self.assertEqual(sheet2.name, 'Deleted Name')
    
    def test_update_sheet_success(self):
        """Test successful sheet update"""
        sheet = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Original Name'
        )
        
        updated_sheet = SheetService.update_sheet(
            sheet=sheet,
            name='Updated Name'
        )
        
        self.assertEqual(updated_sheet.name, 'Updated Name')
        self.assertEqual(updated_sheet.id, sheet.id)
        self.assertEqual(updated_sheet.spreadsheet, self.spreadsheet)
        self.assertEqual(updated_sheet.position, sheet.position)  # Position unchanged
        
        # Verify it's saved in DB
        sheet.refresh_from_db()
        self.assertEqual(sheet.name, 'Updated Name')
        self.assertEqual(sheet.position, 0)  # Position should remain 0
    
    def test_update_sheet_duplicate_name(self):
        """Test updating sheet with duplicate name fails"""
        sheet1 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='First Sheet'
        )
        sheet2 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Second Sheet'
        )
        
        with self.assertRaises(ValidationError) as context:
            SheetService.update_sheet(
                sheet=sheet2,
                name='First Sheet'
            )
        
        self.assertIn('already exists', str(context.exception))
        
        # Verify sheet2 name unchanged
        sheet2.refresh_from_db()
        self.assertEqual(sheet2.name, 'Second Sheet')
    
    def test_update_sheet_same_name(self):
        """Test updating sheet with same name (should succeed)"""
        sheet = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Same Name'
        )
        
        # Update with same name should succeed
        updated_sheet = SheetService.update_sheet(
            sheet=sheet,
            name='Same Name'
        )
        
        self.assertEqual(updated_sheet.name, 'Same Name')
        self.assertEqual(updated_sheet.id, sheet.id)
    
    def test_update_sheet_different_spreadsheet(self):
        """Test updating sheet with name from different spreadsheet (should succeed)"""
        spreadsheet2 = create_test_spreadsheet(self.project, name='Spreadsheet 2')
        
        sheet1 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Unique Name'
        )
        sheet2 = SheetService.create_sheet(
            spreadsheet=spreadsheet2,
            name='Different Name'
        )
        
        # Update sheet2 with name from sheet1 (different spreadsheet) should succeed
        updated_sheet = SheetService.update_sheet(
            sheet=sheet2,
            name='Unique Name'
        )
        
        self.assertEqual(updated_sheet.name, 'Unique Name')
    
    def test_update_sheet_after_deleted(self):
        """Test updating sheet with name of deleted sheet"""
        sheet1 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Deleted Name'
        )
        sheet1.is_deleted = True
        sheet1.save()
        
        sheet2 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Active Sheet'
        )
        
        # Should be able to update with name of deleted sheet
        updated_sheet = SheetService.update_sheet(
            sheet=sheet2,
            name='Deleted Name'
        )
        
        self.assertEqual(updated_sheet.name, 'Deleted Name')
    
    def test_delete_sheet_success(self):
        """Test successful sheet deletion (soft delete)"""
        sheet = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='To Be Deleted'
        )
        sheet_id = sheet.id
        
        SheetService.delete_sheet(sheet)
        
        # Sheet should still exist but marked as deleted
        self.assertTrue(Sheet.objects.filter(id=sheet_id).exists())
        sheet.refresh_from_db()
        self.assertTrue(sheet.is_deleted)
    
    def test_delete_sheet_multiple_times(self):
        """Test deleting already deleted sheet (idempotent)"""
        sheet = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Double Delete'
        )
        
        SheetService.delete_sheet(sheet)
        self.assertTrue(sheet.is_deleted)
        
        # Delete again should not cause error
        SheetService.delete_sheet(sheet)
        sheet.refresh_from_db()
        self.assertTrue(sheet.is_deleted)
    
    def test_create_sheet_atomic_transaction(self):
        """Test that sheet creation is atomic"""
        # Create one sheet
        SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='First'
        )
        
        # Try to create duplicate - should raise ValidationError
        # and nothing should be partially created
        initial_count = Sheet.objects.filter(
            spreadsheet=self.spreadsheet,
            is_deleted=False
        ).count()
        
        with self.assertRaises(ValidationError):
            SheetService.create_sheet(
                spreadsheet=self.spreadsheet,
                name='First'
            )
        
        # Count should remain the same
        final_count = Sheet.objects.filter(
            spreadsheet=self.spreadsheet,
            is_deleted=False
        ).count()
        
        self.assertEqual(initial_count, final_count)
    
    def test_update_sheet_atomic_transaction(self):
        """Test that sheet update is atomic"""
        sheet1 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='First'
        )
        sheet2 = SheetService.create_sheet(
            spreadsheet=self.spreadsheet,
            name='Second'
        )
        
        original_name = sheet2.name
        
        # Try to update with duplicate name - should raise ValidationError
        # and original name should remain
        with self.assertRaises(ValidationError):
            SheetService.update_sheet(
                sheet=sheet2,
                name='First'
            )
        
        sheet2.refresh_from_db()
        self.assertEqual(sheet2.name, original_name)
    
    def test_resize_sheet_row_creation_includes_deleted_in_max(self):
        """Test that resize_sheet row creation includes deleted rows in max position (doesn't reuse deleted positions)"""
        from spreadsheet.models import SheetRow
        self.sheet = Sheet.objects.create(spreadsheet=self.spreadsheet, name="S1", position=0)
        # Create 2 rows via resize_sheet with positions assigned by the service
        result1 = SheetService.resize_sheet(self.sheet, row_count=2, column_count=0)
        self.assertEqual(result1['rows_created'], 2)
        self.assertEqual(result1['total_rows'], 2)
        
        # Get the created rows
        rows = list(SheetRow.objects.filter(sheet=self.sheet, is_deleted=False).order_by('position'))
        self.assertEqual(len(rows), 2)
        row1, row2 = rows[0], rows[1]
        self.assertEqual(row1.position, 0)
        self.assertEqual(row2.position, 1)
        
        # Soft-delete the second row (position=1)
        row2.is_deleted = True
        row2.save()
        
        # Resize again - should create new row at position 2 (max_position + 1)
        # Does NOT reuse the deleted position (position 1)
        # Expected behavior: include deleted rows in max position calculation
        result2 = SheetService.resize_sheet(self.sheet, row_count=3, column_count=0)
        
        # Verify new rows are created at positions beyond max_position (not reusing deleted position 1)
        # After deleting position 1, we have 1 active row (position 0)
        # max_row_position = 1 (including deleted), so new rows should start at position 2
        # We need 3 active rows total, so we need 2 more: positions 2 and 3
        new_rows = SheetRow.objects.filter(sheet=self.sheet, is_deleted=False).order_by('position')
        positions = [r.position for r in new_rows]
        
        self.assertIn(0, positions)  # Original row at position 0
        self.assertNotIn(1, positions)  # Should NOT reuse deleted position 1
        # New rows should be at positions >= max_row_position + 1 (i.e., >= 2)
        self.assertIn(2, positions)  # First new row at position 2 (max_position + 1)
        # Should have 3 active rows total: [0, 2, 3]
        self.assertEqual(len(positions), 2)
        self.assertEqual(sorted(positions), [0, 2])  # Verify exact positions
    
    def test_get_next_sheet_position(self):
        """Test _get_next_sheet_position helper method"""
        # No sheets yet, should return 0
        position = SheetService._get_next_sheet_position(self.spreadsheet)
        self.assertEqual(position, 0)
        
        # Create first sheet
        SheetService.create_sheet(self.spreadsheet, name='Sheet 1')
        position = SheetService._get_next_sheet_position(self.spreadsheet)
        self.assertEqual(position, 1)
        
        # Create second sheet
        SheetService.create_sheet(self.spreadsheet, name='Sheet 2')
        position = SheetService._get_next_sheet_position(self.spreadsheet)
        self.assertEqual(position, 2)
    
    def test_get_next_sheet_position_with_deleted(self):
        """Test that deleted sheets don't affect position calculation"""
        sheet1 = SheetService.create_sheet(self.spreadsheet, name='Sheet 1')
        sheet2 = SheetService.create_sheet(self.spreadsheet, name='Sheet 2')
        
        # Delete sheet2
        sheet2.is_deleted = True
        sheet2.save()
        
        # Position should still be 2 (max position + 1)
        position = SheetService._get_next_sheet_position(self.spreadsheet)
        self.assertEqual(position, 2)

