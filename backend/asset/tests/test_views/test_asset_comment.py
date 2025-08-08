from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from asset.models import Task, Asset, AssetComment
from core.models import Organization, Team

User = get_user_model()


class AssetCommentAPITest(APITestCase):
    """Test Asset Comment endpoints"""
    
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
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Authenticate user1 by default
        self.client.force_authenticate(user=self.user1)
    
    def test_list_asset_comments(self):
        """Test listing asset comments"""
        # Create a comment
        comment = AssetComment.objects.create(
            asset=self.asset,
            user=self.user1,
            body="Test comment"
        )
        
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], comment.id)
        self.assertEqual(response.data['results'][0]['body'], "Test comment")
        self.assertEqual(response.data['results'][0]['user'], self.user1.id)
    
    def test_list_asset_comments_empty(self):
        """Test listing asset comments when no comments exist"""
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_create_asset_comment(self):
        """Test creating asset comment"""
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'body': 'New test comment'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AssetComment.objects.count(), 1)
        self.assertEqual(response.data['body'], 'New test comment')
        self.assertEqual(response.data['user'], self.user1.id)
        self.assertEqual(response.data['asset'], self.asset.id)
    
    def test_create_asset_comment_invalid_data(self):
        """Test creating asset comment with invalid data"""
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'body': ''  # Empty body
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('body', response.data)
    
    def test_create_asset_comment_missing_body(self):
        """Test creating asset comment without body"""
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        data = {}  # No body field
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('body', response.data)
    
    def test_create_asset_comment_nonexistent_asset(self):
        """Test creating comment for non-existent asset"""
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': 99999})
        data = {
            'body': 'Test comment'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_list_asset_comments_nonexistent_asset(self):
        """Test listing comments for non-existent asset"""
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_asset_comment_unauthenticated(self):
        """Test creating comment without authentication"""
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'body': 'Test comment'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_asset_comments_unauthenticated(self):
        """Test listing comments without authentication"""
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_asset_comment_different_user(self):
        """Test creating comment with different authenticated user"""
        self.client.force_authenticate(user=self.user2)
        
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        data = {
            'body': 'Comment from user2'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user'], self.user2.id)  # Should be user2, not user1
        self.assertEqual(AssetComment.objects.count(), 1)
    
    def test_multiple_comments_same_asset(self):
        """Test creating multiple comments for the same asset"""
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        
        # Create first comment
        data1 = {'body': 'First comment'}
        response1 = self.client.post(url, data1, format='json')
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Create second comment
        data2 = {'body': 'Second comment'}
        response2 = self.client.post(url, data2, format='json')
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        
        # List all comments
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Check both comments are present
        comment_bodies = [comment['body'] for comment in response.data['results']]
        self.assertIn('First comment', comment_bodies)
        self.assertIn('Second comment', comment_bodies)
    
    def test_comment_pagination(self):
        """Test that comments are paginated"""
        # Create multiple comments
        for i in range(10):
            AssetComment.objects.create(
                asset=self.asset,
                user=self.user1,
                body=f"Comment {i+1}"
            )
        
        url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 10)
        # Default page size is 5, so should have 5 results on first page
        self.assertEqual(len(response.data['results']), 5)
