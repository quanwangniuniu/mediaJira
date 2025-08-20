from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from asset.models import Asset, AssetVersion
from core.models import Organization, Team

User = get_user_model()


class AssetHistoryAPITest(APITestCase):
    """Test Asset History endpoints"""
    
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
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

        # Create project and task
        from core.models import Project
        from task.models import Task
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Authenticate user1 by default
        self.client.force_authenticate(user=self.user1)
    
    def test_list_asset_history(self):
        """Test listing asset state transitions"""
        # Create a version first (required for submit)
        test_file_content = b'test file content'
        from django.core.files.uploadedfile import SimpleUploadedFile
        uploaded_file = SimpleUploadedFile(
            'test_file.txt',
            test_file_content,
            content_type='text/plain'
        )
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=uploaded_file,
            uploaded_by=self.user1,
            scan_status=AssetVersion.CLEAN
        )
        
        # Finalize the version
        version.finalize(finalized_by=self.user1)
        version.save()
        
        # Create some transitions
        self.asset.submit(submitted_by=self.user1)
        self.asset.start_review(reviewer=self.user2)
        
        url = reverse('asset:asset-history', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        
        # Should have history items: asset_created, version_created, version_finalized, submit transition, start_review transition
        # The exact count may vary depending on the implementation
        self.assertGreater(len(response.data['results']), 0)
        
        # Check that all items have required fields
        history_items = response.data['results']
        for item in history_items:
            self.assertIn('type', item)
            self.assertIn('timestamp', item)
            self.assertIn('user_id', item)
            self.assertIn('details', item)
        
        # Check that we have the expected types
        types = [item['type'] for item in history_items]
        self.assertIn('asset_created', types)
        self.assertIn('state_transition', types)
        
        # Should have state transitions
        state_transitions = [item for item in history_items if item['type'] == 'state_transition']
        self.assertGreater(len(state_transitions), 0)
    
    def test_list_asset_history_empty(self):
        """Test listing asset history when no transitions exist"""
        url = reverse('asset:asset-history', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        
        # Should have at least the asset_created entry
        self.assertGreater(len(response.data['results']), 0)
        
        # Check that we have the asset_created type
        history_items = response.data['results']
        types = [item['type'] for item in history_items]
        self.assertIn('asset_created', types)
    
    def test_list_asset_history_nonexistent_asset(self):
        """Test listing history for non-existent asset"""
        url = reverse('asset:asset-history', kwargs={'asset_id': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_list_asset_history_unauthenticated(self):
        """Test listing history without authentication"""
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:asset-history', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_asset_history_different_user(self):
        """Test listing history with different authenticated user"""
        self.client.force_authenticate(user=self.user2)
        
        url = reverse('asset:asset-history', kwargs={'asset_id': self.asset.id})
        response = self.client.get(url)
        
        # Should be able to view history (authentication is sufficient)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
