from django.test import TestCase
from django.urls import reverse, resolve
from django.contrib.auth import get_user_model

from spreadsheet.views import (
    SpreadsheetListView,
    SpreadsheetDetailView,
    SheetListView,
    SheetDetailView,
    SheetRowListView,
    SheetColumnListView
)

User = get_user_model()


class SpreadsheetUrlsTest(TestCase):
    """Test cases for spreadsheet URL routing"""
    
    def test_spreadsheet_list_url_resolves(self):
        """Test that spreadsheet list URL resolves to correct view"""
        url = reverse('spreadsheet:spreadsheet-list')
        self.assertEqual(url, '/api/spreadsheet/spreadsheets/')
        
        resolved = resolve(url)
        self.assertEqual(resolved.func.view_class, SpreadsheetListView)
    
    def test_spreadsheet_detail_url_resolves(self):
        """Test that spreadsheet detail URL resolves to correct view"""
        url = reverse('spreadsheet:spreadsheet-detail', kwargs={'id': 1})
        self.assertEqual(url, '/api/spreadsheet/spreadsheets/1/')
        
        resolved = resolve(url)
        self.assertEqual(resolved.func.view_class, SpreadsheetDetailView)
    
    def test_spreadsheet_list_url_name(self):
        """Test spreadsheet list URL name"""
        url = reverse('spreadsheet:spreadsheet-list')
        self.assertIn('spreadsheets', url)
        self.assertTrue(url.endswith('/'))
    
    def test_spreadsheet_detail_url_name(self):
        """Test spreadsheet detail URL name"""
        url = reverse('spreadsheet:spreadsheet-detail', kwargs={'id': 123})
        self.assertIn('spreadsheets/123', url)
        self.assertTrue(url.endswith('/'))
    
    def test_app_name(self):
        """Test that app_name is set correctly"""
        from spreadsheet.urls import app_name
        self.assertEqual(app_name, 'spreadsheet')


class SheetUrlsTest(TestCase):
    """Test cases for Sheet URL routing"""
    
    def test_sheet_list_url_resolves(self):
        """Test that sheet list URL resolves to correct view"""
        url = reverse('spreadsheet:sheet-list', kwargs={'spreadsheet_id': 1})
        self.assertEqual(url, '/api/spreadsheet/spreadsheets/1/sheets/')
        
        resolved = resolve(url)
        self.assertEqual(resolved.func.view_class, SheetListView)
    
    def test_sheet_detail_url_resolves(self):
        """Test that sheet detail URL resolves to correct view"""
        url = reverse('spreadsheet:sheet-detail', kwargs={'spreadsheet_id': 1, 'id': 2})
        self.assertEqual(url, '/api/spreadsheet/spreadsheets/1/sheets/2/')
        
        resolved = resolve(url)
        self.assertEqual(resolved.func.view_class, SheetDetailView)
    
    def test_sheet_list_url_name(self):
        """Test sheet list URL name"""
        url = reverse('spreadsheet:sheet-list', kwargs={'spreadsheet_id': 123})
        self.assertIn('spreadsheets/123/sheets', url)
        self.assertTrue(url.endswith('/'))
    
    def test_sheet_detail_url_name(self):
        """Test sheet detail URL name"""
        url = reverse('spreadsheet:sheet-detail', kwargs={'spreadsheet_id': 123, 'id': 456})
        self.assertIn('spreadsheets/123/sheets/456', url)
        self.assertTrue(url.endswith('/'))


class SheetRowUrlsTest(TestCase):
    """Test cases for SheetRow URL routing"""
    
    def test_sheet_row_list_url_resolves(self):
        """Test that sheet row list URL resolves to correct view"""
        url = reverse('spreadsheet:sheet-row-list', kwargs={'spreadsheet_id': 1, 'sheet_id': 1})
        self.assertEqual(url, '/api/spreadsheet/spreadsheets/1/sheets/1/rows/')
        
        resolved = resolve(url)
        self.assertEqual(resolved.func.view_class, SheetRowListView)
    
    def test_sheet_row_list_url_name(self):
        """Test sheet row list URL name"""
        url = reverse('spreadsheet:sheet-row-list', kwargs={'spreadsheet_id': 123, 'sheet_id': 456})
        self.assertIn('spreadsheets/123/sheets/456/rows', url)
        self.assertTrue(url.endswith('/'))


class SheetColumnUrlsTest(TestCase):
    """Test cases for SheetColumn URL routing"""
    
    def test_sheet_column_list_url_resolves(self):
        """Test that sheet column list URL resolves to correct view"""
        url = reverse('spreadsheet:sheet-column-list', kwargs={'spreadsheet_id': 1, 'sheet_id': 1})
        self.assertEqual(url, '/api/spreadsheet/spreadsheets/1/sheets/1/columns/')
        
        resolved = resolve(url)
        self.assertEqual(resolved.func.view_class, SheetColumnListView)
    
    def test_sheet_column_list_url_name(self):
        """Test sheet column list URL name"""
        url = reverse('spreadsheet:sheet-column-list', kwargs={'spreadsheet_id': 123, 'sheet_id': 456})
        self.assertIn('spreadsheets/123/sheets/456/columns', url)
        self.assertTrue(url.endswith('/'))
