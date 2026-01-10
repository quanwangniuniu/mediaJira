"""
Test cases for spreadsheet API views (Spreadsheet views only)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import time

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


# ========== View Tests ==========

class SpreadsheetListViewTest(TestCase):
    """Test cases for SpreadsheetListView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create test spreadsheets
        self.spreadsheet1 = create_test_spreadsheet(self.project, name='Spreadsheet 1')
        self.spreadsheet2 = create_test_spreadsheet(self.project, name='Spreadsheet 2')
    
    def test_list_spreadsheets_success(self):
        """Test successful spreadsheet list retrieval"""
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {'project_id': self.project.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('page', response.data)
        self.assertIn('page_size', response.data)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_list_spreadsheets_missing_project_id(self):
        """Test list spreadsheets without project_id parameter"""
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('project_id', response.data)
    
    def test_list_spreadsheets_invalid_project_id(self):
        """Test list spreadsheets with non-existent project_id"""
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {'project_id': 99999})
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_list_spreadsheets_pagination(self):
        """Test spreadsheet list pagination"""
        # Create more spreadsheets
        for i in range(3, 23):
            create_test_spreadsheet(self.project, name=f'Spreadsheet {i}')
        
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {
            'project_id': self.project.id,
            'page': 1,
            'page_size': 10
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 22)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 10)
        self.assertEqual(len(response.data['results']), 10)
    
    def test_list_spreadsheets_search(self):
        """Test spreadsheet list with search parameter"""
        create_test_spreadsheet(self.project, name='Searchable Name')
        create_test_spreadsheet(self.project, name='Other Name')
        
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {
            'project_id': self.project.id,
            'search': 'Searchable'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data['count'], 1)
        self.assertTrue(
            any('Searchable' in result['name'] for result in response.data['results'])
        )
    
    def test_list_spreadsheets_order_by_created_at(self):
        """Test spreadsheet list ordering by created_at"""
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {
            'project_id': self.project.id,
            'order_by': 'created_at'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        # Should be ordered descending (newest first)
        if len(results) > 1:
            self.assertGreaterEqual(
                results[0]['created_at'],
                results[1]['created_at']
            )
    
    def test_list_spreadsheets_order_by_name(self):
        """Test spreadsheet list ordering by name"""
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {
            'project_id': self.project.id,
            'order_by': 'name'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data['results']
        # Should be ordered ascending by name
        if len(results) > 1:
            names = [r['name'] for r in results]
            self.assertEqual(names, sorted(names))
    
    def test_list_spreadsheets_excludes_deleted(self):
        """Test that deleted spreadsheets are excluded from list"""
        deleted_spreadsheet = create_test_spreadsheet(self.project, name='Deleted')
        deleted_spreadsheet.is_deleted = True
        deleted_spreadsheet.save()
        
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {'project_id': self.project.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)  # Only non-deleted
        spreadsheet_ids = [s['id'] for s in response.data['results']]
        self.assertNotIn(deleted_spreadsheet.id, spreadsheet_ids)
    
    def test_create_spreadsheet_success(self):
        """Test successful spreadsheet creation"""
        url = f'/api/spreadsheet/spreadsheets/?project_id={self.project.id}'
        data = {'name': 'New Spreadsheet'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Spreadsheet')
        self.assertEqual(response.data['project'], self.project.id)
        self.assertFalse(response.data['is_deleted'])
        
        # Verify in database
        self.assertTrue(
            Spreadsheet.objects.filter(
                project=self.project,
                name='New Spreadsheet',
                is_deleted=False
            ).exists()
        )
    
    def test_create_spreadsheet_missing_project_id(self):
        """Test create spreadsheet without project_id parameter"""
        url = '/api/spreadsheet/spreadsheets/'
        data = {'name': 'New Spreadsheet'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('project_id', response.data)
    
    def test_create_spreadsheet_invalid_project_id(self):
        """Test create spreadsheet with non-existent project_id"""
        url = '/api/spreadsheet/spreadsheets/?project_id=99999'
        data = {'name': 'New Spreadsheet'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_spreadsheet_duplicate_name(self):
        """Test creating spreadsheet with duplicate name fails"""
        url = f'/api/spreadsheet/spreadsheets/?project_id={self.project.id}'
        data = {'name': 'Duplicate Name'}
        
        # Create first spreadsheet
        response1 = self.client.post(url, data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Try to create duplicate
        response2 = self.client.post(url, data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response2.data)
    
    def test_create_spreadsheet_missing_name(self):
        """Test creating spreadsheet without name field"""
        url = f'/api/spreadsheet/spreadsheets/?project_id={self.project.id}'
        data = {}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_create_spreadsheet_empty_name(self):
        """Test creating spreadsheet with empty name"""
        url = f'/api/spreadsheet/spreadsheets/?project_id={self.project.id}'
        data = {'name': ''}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_create_spreadsheet_authentication_required(self):
        """Test that authentication is required for creating spreadsheet"""
        self.client.logout()
        
        url = f'/api/spreadsheet/spreadsheets/?project_id={self.project.id}'
        data = {'name': 'Unauthenticated'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_spreadsheets_authentication_required(self):
        """Test that authentication is required for listing spreadsheets"""
        self.client.logout()
        
        url = '/api/spreadsheet/spreadsheets/'
        response = self.client.get(url, {'project_id': self.project.id})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SpreadsheetDetailViewTest(TestCase):
    """Test cases for SpreadsheetDetailView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.spreadsheet = create_test_spreadsheet(self.project, name='Test Spreadsheet')
    
    def test_retrieve_spreadsheet_success(self):
        """Test successful spreadsheet retrieval"""
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.spreadsheet.id)
        self.assertEqual(response.data['name'], 'Test Spreadsheet')
        self.assertEqual(response.data['project'], self.project.id)
    
    def test_retrieve_spreadsheet_not_found(self):
        """Test retrieving non-existent spreadsheet"""
        url = '/api/spreadsheet/spreadsheets/99999/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_retrieve_deleted_spreadsheet(self):
        """Test that deleted spreadsheet returns 404"""
        self.spreadsheet.is_deleted = True
        self.spreadsheet.save()
        
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_spreadsheet_success(self):
        """Test successful spreadsheet update"""
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        data = {'name': 'Updated Spreadsheet'}
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Spreadsheet')
        self.assertEqual(response.data['id'], self.spreadsheet.id)
        
        # Verify in database
        self.spreadsheet.refresh_from_db()
        self.assertEqual(self.spreadsheet.name, 'Updated Spreadsheet')
    
    def test_update_spreadsheet_updates_timestamp(self):
        """Test that updating spreadsheet name updates the updated_at timestamp"""
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        

        original_updated_at = self.spreadsheet.updated_at
        time.sleep(0.1)
        
        data = {'name': 'Updated Name'}
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Name')
        
        self.spreadsheet.refresh_from_db()
        self.assertGreater(self.spreadsheet.updated_at, original_updated_at)
    
    def test_update_spreadsheet_duplicate_name(self):
        """Test updating spreadsheet with duplicate name fails"""
        spreadsheet2 = create_test_spreadsheet(self.project, name='Other Name')
        
        url = f'/api/spreadsheet/spreadsheets/{spreadsheet2.id}/'
        data = {'name': 'Test Spreadsheet'}  # Same as self.spreadsheet.name
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_update_spreadsheet_not_found(self):
        """Test updating non-existent spreadsheet"""
        url = '/api/spreadsheet/spreadsheets/99999/'
        data = {'name': 'Updated Name'}
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_spreadsheet_empty_name(self):
        """Test updating spreadsheet with empty name"""
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        data = {'name': ''}
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data)
    
    def test_delete_spreadsheet_success(self):
        """Test successful spreadsheet deletion (soft delete)"""
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify soft deleted in database
        self.spreadsheet.refresh_from_db()
        self.assertTrue(self.spreadsheet.is_deleted)
        
        # Verify cannot retrieve after deletion
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_spreadsheet_not_found(self):
        """Test deleting non-existent spreadsheet"""
        url = '/api/spreadsheet/spreadsheets/99999/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_spreadsheet_authentication_required(self):
        """Test that authentication is required for updating spreadsheet"""
        self.client.logout()
        
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        data = {'name': 'Unauthenticated Update'}
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_delete_spreadsheet_authentication_required(self):
        """Test that authentication is required for deleting spreadsheet"""
        self.client.logout()
        
        url = f'/api/spreadsheet/spreadsheets/{self.spreadsheet.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

