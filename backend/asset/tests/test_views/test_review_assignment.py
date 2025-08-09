from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from asset.models import Asset, ReviewAssignment
from core.models import Organization, Team

User = get_user_model()


class ReviewAssignmentAPITest(APITestCase):
    """Test Review Assignment endpoints"""
    
    def setUp(self):
        # Create test users
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='testpass123'
        )
        
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            username='user2',
            password='testpass123'
        )
        
        self.user3 = User.objects.create_user(
            email='user3@example.com',
            username='user3',
            password='testpass123'
        )
        
   
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

                # Create test task
        from core.models import Project, Task
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(name="Test Task", project=self.project)
     
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Authenticate user1 by default
        self.client.force_authenticate(user=self.user1)
    
    def test_list_review_assignments(self):
        """Test listing review assignments"""
        # Create an assignment
        assignment = ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1
        )
        
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], assignment.id)
        self.assertEqual(response.data['results'][0]['user'], self.user2.id)
        self.assertEqual(response.data['results'][0]['role'], 'reviewer')
        self.assertEqual(response.data['results'][0]['assigned_by'], self.user1.id)
    
    def test_list_review_assignments_empty(self):
        """Test listing review assignments when none exist"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_create_review_assignment(self):
        """Test creating review assignment"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'user': self.user2.id,
            'role': 'reviewer'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ReviewAssignment.objects.count(), 1)
        self.assertEqual(response.data['user'], self.user2.id)
        self.assertEqual(response.data['role'], 'reviewer')
        self.assertEqual(response.data['assigned_by'], self.user1.id)
        self.assertEqual(response.data['asset'], self.asset.id)
    
    def test_create_review_assignment_approver(self):
        """Test creating approver assignment"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'user': self.user3.id,
            'role': 'approver'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'approver')
        self.assertEqual(response.data['user'], self.user3.id)
    
    def test_create_duplicate_assignment(self):
        """Test creating duplicate review assignment"""
        # Create first assignment
        ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1
        )
        
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'user': self.user2.id,
            'role': 'reviewer'
        }
        
        response = self.client.post(url, data, format='json')
        
        # The view should handle the unique constraint and return 400
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_assignment_invalid_role(self):
        """Test creating assignment with invalid role"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'user': self.user2.id,
            'role': 'invalid_role'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_assignment_nonexistent_user(self):
        """Test creating assignment with non-existent user"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'user': 99999,
            'role': 'reviewer'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_assignment_nonexistent_asset(self):
        """Test creating assignment for non-existent asset"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': 99999})
        data = {
            'user': self.user2.id,
            'role': 'reviewer'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_list_assignments_nonexistent_asset(self):
        """Test listing assignments for non-existent asset"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_assignment_unauthenticated(self):
        """Test creating assignment without authentication"""
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'user': self.user2.id,
            'role': 'reviewer'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_assignments_unauthenticated(self):
        """Test listing assignments without authentication"""
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_assignment_different_user(self):
        """Test creating assignment with different authenticated user"""
        self.client.force_authenticate(user=self.user2)
        
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'user': self.user3.id,
            'role': 'reviewer'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['assigned_by'], self.user2.id)  # Should be user2, not user1
    
    def test_multiple_assignments_same_asset(self):
        """Test creating multiple assignments for the same asset"""
        url = reverse('asset:review-assignment-list', kwargs={'asset_id': self.asset.id})
        
        # Create first assignment
        data1 = {
            'user': self.user2.id,
            'role': 'reviewer'
        }
        response1 = self.client.post(url, data1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Create second assignment with different user
        data2 = {
            'user': self.user3.id,
            'role': 'approver'
        }
        response2 = self.client.post(url, data2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        
        # List all assignments
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Check both assignments are present
        user_ids = [assignment['user'] for assignment in response.data['results']]
        self.assertIn(self.user2.id, user_ids)
        self.assertIn(self.user3.id, user_ids)
