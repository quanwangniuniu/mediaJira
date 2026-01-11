from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from spreadsheet.models import Spreadsheet, Sheet, SheetRow
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


def create_test_sheet_row(sheet, position=0):
    """Helper to create test sheet row"""
    return SheetRow.objects.create(
        sheet=sheet,
        position=position
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


# ========== Sheet Model Tests ==========

class SheetModelTest(TestCase):
    """Test cases for Sheet model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
        self.spreadsheet = create_test_spreadsheet(self.project)
    
    def test_create_sheet(self):
        """Test creating a sheet"""
        sheet = create_test_sheet(self.spreadsheet, name='My Sheet', position=0)
        
        self.assertEqual(sheet.name, 'My Sheet')
        self.assertEqual(sheet.position, 0)
        self.assertEqual(sheet.spreadsheet, self.spreadsheet)
        self.assertFalse(sheet.is_deleted)
        self.assertIsNotNone(sheet.created_at)
        self.assertIsNotNone(sheet.updated_at)
    
    def test_sheet_string_representation(self):
        """Test sheet string representation"""
        sheet = create_test_sheet(self.spreadsheet, name='My Sheet')
        expected_str = f"My Sheet (in {self.spreadsheet.name})"
        self.assertEqual(str(sheet), expected_str)
    
    def test_unique_sheet_name_per_spreadsheet(self):
        """Test that sheet names must be unique per spreadsheet (when not deleted)"""
        create_test_sheet(self.spreadsheet, name='Unique Name', position=0)
        
        # Try to create another with same name - should fail
        with self.assertRaises(IntegrityError):
            create_test_sheet(self.spreadsheet, name='Unique Name', position=1)
    
    def test_unique_sheet_position_per_spreadsheet(self):
        """Test that sheet positions must be unique per spreadsheet (when not deleted)"""
        create_test_sheet(self.spreadsheet, name='Sheet 1', position=0)
        
        # Try to create another with same position - should fail
        with self.assertRaises(IntegrityError):
            create_test_sheet(self.spreadsheet, name='Sheet 2', position=0)
    
    def test_duplicate_name_allowed_when_deleted(self):
        """Test that deleted sheets don't block duplicate names"""
        sheet1 = create_test_sheet(self.spreadsheet, name='Duplicate Name', position=0)
        sheet1.is_deleted = True
        sheet1.save()
        
        # Should be able to create another with same name
        sheet2 = create_test_sheet(self.spreadsheet, name='Duplicate Name', position=1)
        self.assertIsNotNone(sheet2)
        self.assertEqual(sheet2.name, 'Duplicate Name')
    
    def test_duplicate_position_allowed_when_deleted(self):
        """Test that deleted sheets don't block duplicate positions"""
        sheet1 = create_test_sheet(self.spreadsheet, name='Sheet 1', position=0)
        sheet1.is_deleted = True
        sheet1.save()
        
        # Should be able to create another with same position
        sheet2 = create_test_sheet(self.spreadsheet, name='Sheet 2', position=0)
        self.assertIsNotNone(sheet2)
        self.assertEqual(sheet2.position, 0)
    
    def test_sheet_can_have_same_name_in_different_spreadsheets(self):
        """Test that same name is allowed in different spreadsheets"""
        spreadsheet2 = create_test_spreadsheet(self.project, name='Spreadsheet 2')
        
        sheet1 = create_test_sheet(self.spreadsheet, name='Same Name', position=0)
        sheet2 = create_test_sheet(spreadsheet2, name='Same Name', position=0)
        
        self.assertEqual(sheet1.name, sheet2.name)
        self.assertNotEqual(sheet1.spreadsheet, sheet2.spreadsheet)
    
    def test_sheet_ordering(self):
        """Test that sheets are ordered by position then created_at"""
        sheet1 = create_test_sheet(self.spreadsheet, name='First', position=0)
        sheet2 = create_test_sheet(self.spreadsheet, name='Second', position=1)
        sheet3 = create_test_sheet(self.spreadsheet, name='Third', position=2)
        
        sheets = list(Sheet.objects.filter(spreadsheet=self.spreadsheet, is_deleted=False))
        
        # Should be ordered by position, then created_at
        self.assertEqual(sheets[0].name, 'First')
        self.assertEqual(sheets[1].name, 'Second')
        self.assertEqual(sheets[2].name, 'Third')
    
    def test_sheet_spreadsheet_relationship(self):
        """Test sheet-spreadsheet foreign key relationship"""
        sheet = create_test_sheet(self.spreadsheet)
        
        self.assertEqual(sheet.spreadsheet, self.spreadsheet)
        self.assertIn(sheet, self.spreadsheet.sheets.all())
    
    def test_cascade_delete_sheet_when_spreadsheet_deleted(self):
        """Test that sheet is deleted when spreadsheet is deleted"""
        sheet = create_test_sheet(self.spreadsheet)
        sheet_id = sheet.id
        
        self.spreadsheet.delete()
        
        # Sheet should be deleted (hard delete with CASCADE)
        self.assertFalse(Sheet.objects.filter(id=sheet_id).exists())
    
    def test_sheet_name_max_length(self):
        """Test sheet name max length constraint"""
        long_name = 'A' * 200  # Max length is 200
        sheet = create_test_sheet(self.spreadsheet, name=long_name, position=0)
        
        self.assertEqual(len(sheet.name), 200)
        
        # Try to exceed max length
        too_long_name = 'A' * 201
        sheet.name = too_long_name
        with self.assertRaises(ValidationError):
            sheet.full_clean()
    
    def test_sheet_position_non_negative(self):
        """Test that sheet position must be non-negative"""
        # Valid position
        sheet = create_test_sheet(self.spreadsheet, name='Valid', position=0)
        self.assertEqual(sheet.position, 0)
        
        # Negative position should fail constraint check
        sheet.position = -1
        with self.assertRaises(IntegrityError):
            sheet.save()
    
    def test_sheet_indexes(self):
        """Test that indexes are properly set up for performance"""
        create_test_sheet(self.spreadsheet, name='Sheet 1', position=0)
        create_test_sheet(self.spreadsheet, name='Sheet 2', position=1)
        
        # Query using indexed fields
        sheets = Sheet.objects.filter(
            spreadsheet=self.spreadsheet,
            is_deleted=False
        )
        
        self.assertEqual(sheets.count(), 2)


# ========== SheetRow Model Tests ==========

class SheetRowModelTest(TestCase):
    """Test cases for SheetRow model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
        self.spreadsheet = create_test_spreadsheet(self.project)
        self.sheet = create_test_sheet(self.spreadsheet)
    
    def test_create_sheet_row(self):
        """Test creating a sheet row"""
        row = create_test_sheet_row(self.sheet, position=0)
        
        self.assertEqual(row.position, 0)
        self.assertEqual(row.sheet, self.sheet)
        self.assertFalse(row.is_deleted)
        self.assertIsNotNone(row.created_at)
        self.assertIsNotNone(row.updated_at)
    
    def test_sheet_row_string_representation(self):
        """Test sheet row string representation"""
        row = create_test_sheet_row(self.sheet, position=5)
        expected_str = f"Row 5 (in {self.sheet.name})"
        self.assertEqual(str(row), expected_str)
    
    def test_unique_row_position_per_sheet(self):
        """Test that row positions must be unique per sheet (when not deleted)"""
        create_test_sheet_row(self.sheet, position=0)
        
        # Try to create another with same position - should fail
        with self.assertRaises(IntegrityError):
            create_test_sheet_row(self.sheet, position=0)
    
    def test_duplicate_position_allowed_when_deleted(self):
        """Test that deleted rows don't block duplicate positions"""
        row1 = create_test_sheet_row(self.sheet, position=0)
        row1.is_deleted = True
        row1.save()
        
        # Should be able to create another with same position
        row2 = create_test_sheet_row(self.sheet, position=0)
        self.assertIsNotNone(row2)
        self.assertEqual(row2.position, 0)
        self.assertFalse(row2.is_deleted)
    
    def test_row_can_have_same_position_in_different_sheets(self):
        """Test that same position is allowed in different sheets"""
        sheet2 = create_test_sheet(self.spreadsheet, name='Sheet 2', position=1)
        
        row1 = create_test_sheet_row(self.sheet, position=0)
        row2 = create_test_sheet_row(sheet2, position=0)
        
        self.assertEqual(row1.position, row2.position)
        self.assertNotEqual(row1.sheet, row2.sheet)
    
    def test_row_ordering(self):
        """Test that rows are ordered by position"""
        row1 = create_test_sheet_row(self.sheet, position=0)
        row2 = create_test_sheet_row(self.sheet, position=1)
        row3 = create_test_sheet_row(self.sheet, position=2)
        
        rows = list(SheetRow.objects.filter(sheet=self.sheet, is_deleted=False))
        
        # Should be ordered by position ascending
        self.assertEqual(rows[0].position, 0)
        self.assertEqual(rows[1].position, 1)
        self.assertEqual(rows[2].position, 2)
    
    def test_row_sheet_relationship(self):
        """Test row-sheet foreign key relationship"""
        row = create_test_sheet_row(self.sheet)
        
        self.assertEqual(row.sheet, self.sheet)
        self.assertIn(row, self.sheet.rows.all())
    
    def test_cascade_delete_row_when_sheet_deleted(self):
        """Test that row is deleted when sheet is deleted"""
        row = create_test_sheet_row(self.sheet)
        row_id = row.id
        
        self.sheet.delete()
        
        # Row should be deleted (hard delete with CASCADE)
        self.assertFalse(SheetRow.objects.filter(id=row_id).exists())
    
    def test_row_position_non_negative(self):
        """Test that row position must be non-negative"""
        # Valid position
        row = create_test_sheet_row(self.sheet, position=0)
        self.assertEqual(row.position, 0)
        
        # Negative position should fail constraint check at DB level
        row = SheetRow(sheet=self.sheet, position=-1)
        with self.assertRaises(IntegrityError):
            row.save()
    
    def test_row_position_unique_per_sheet_active(self):
        """Test that two active rows in same sheet with same position must raise IntegrityError"""
        create_test_sheet_row(self.sheet, position=0)
        
        # Try to create another active row with same position - should fail
        with self.assertRaises(IntegrityError):
            create_test_sheet_row(self.sheet, position=0)
    
    def test_row_position_can_duplicate_when_deleted(self):
        """Test that a deleted row may share position with an active row (conditional UniqueConstraint)"""
        row1 = create_test_sheet_row(self.sheet, position=0)
        row1.is_deleted = True
        row1.save()
        
        # Should be able to create another active row with same position
        row2 = create_test_sheet_row(self.sheet, position=0)
        self.assertIsNotNone(row2)
        self.assertEqual(row2.position, 0)
        self.assertFalse(row2.is_deleted)
    
    def test_row_indexes(self):
        """Test that indexes are properly set up for performance"""
        create_test_sheet_row(self.sheet, position=0)
        create_test_sheet_row(self.sheet, position=1)
        
        # Query using indexed fields
        rows = SheetRow.objects.filter(
            sheet=self.sheet,
            is_deleted=False
        )
        
        self.assertEqual(rows.count(), 2)
