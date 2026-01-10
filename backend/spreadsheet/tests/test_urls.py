"""
Test cases for spreadsheet URL routing (Spreadsheet URLs only)
"""
from django.test import TestCase
from django.urls import reverse, resolve
from django.contrib.auth import get_user_model

from spreadsheet.views import (
    SpreadsheetListView,
    SpreadsheetDetailView
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

