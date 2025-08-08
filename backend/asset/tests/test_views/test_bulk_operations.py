from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from asset.models import Asset, AssetVersion
from core.models import Organization, Team

User = get_user_model()


class BulkReviewAPITest(APITestCase):
    """Test Bulk Review endpoint"""
    
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
        from asset.models import Task
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
        
        # Create test assets
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        self.asset2 = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        self.asset3 = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Create versions for all assets
        self._create_and_finalize_version(self.asset)
        self._create_and_finalize_version(self.asset2)
        self._create_and_finalize_version(self.asset3)
        
        # Submit all assets
        self.asset.submit(submitted_by=self.user1)
        self.asset2.submit(submitted_by=self.user1)
        self.asset3.submit(submitted_by=self.user1)
        
        # Authenticate user1 by default
        self.client.force_authenticate(user=self.user1)
    
    def _create_and_finalize_version(self, asset):
        """Helper method to create and finalize a version for an asset"""
        test_file_content = b'test file content'
        from django.core.files.uploadedfile import SimpleUploadedFile
        uploaded_file = SimpleUploadedFile(
            'test_file.txt',
            test_file_content,
            content_type='text/plain'
        )
        
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=1,
            file=uploaded_file,
            uploaded_by=self.user1,
            scan_status=AssetVersion.CLEAN
        )
        
        # Finalize the version
        version.finalize(finalized_by=self.user1)
        version.save()
        
        return version
    
    def test_bulk_approve_assets(self):
        """Test bulk approving assets"""
        # Assets are already in PendingReview from setUp(), just move to UnderReview
        self.asset.start_review(reviewer=self.user1)
        self.asset.save()
        self.asset2.start_review(reviewer=self.user1)
        self.asset2.save()
        
        url = reverse('asset:bulk-review')
        data = {
            'reviews': [
                {
                    'asset_id': self.asset.id,
                    'action': 'approve',
                    'comment': 'Bulk approved'
                },
                {
                    'asset_id': self.asset2.id,
                    'action': 'approve',
                    'comment': 'Bulk approved'
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['successful'], 2)
        self.assertEqual(response.data['summary']['failed'], 0)
        
        # Check assets were approved - avoid FSM field refresh
        asset1 = Asset.objects.get(pk=self.asset.id)
        asset2 = Asset.objects.get(pk=self.asset2.id)
        self.assertEqual(asset1.status, Asset.APPROVED)
        self.assertEqual(asset2.status, Asset.APPROVED)
    
    def test_bulk_reject_assets(self):
        """Test bulk rejecting assets"""
        # Assets are already in PendingReview from setUp(), just move to UnderReview
        self.asset.start_review(reviewer=self.user1)
        self.asset.save()
        self.asset2.start_review(reviewer=self.user1)
        self.asset2.save()
        
        url = reverse('asset:bulk-review')
        data = {
            'reviews': [
                {
                    'asset_id': self.asset.id,
                    'action': 'reject',
                    'comment': 'Bulk rejected'
                },
                {
                    'asset_id': self.asset2.id,
                    'action': 'reject',
                    'comment': 'Bulk rejected'
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['successful'], 2)
        self.assertEqual(response.data['summary']['failed'], 0)
        
        # Check assets were rejected - avoid FSM field refresh
        asset1 = Asset.objects.get(pk=self.asset.id)
        asset2 = Asset.objects.get(pk=self.asset2.id)
        self.assertEqual(asset1.status, Asset.REVISION_REQUIRED)
        self.assertEqual(asset2.status, Asset.REVISION_REQUIRED)
    
    def test_bulk_review_invalid_action(self):
        """Test bulk review with invalid action"""
        url = reverse('asset:bulk-review')
        data = {
            'reviews': [
                {
                    'asset_id': self.asset.id,
                    'action': 'invalid_action'
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['failed'], 1)
    
    def test_bulk_review_empty_reviews(self):
        """Test bulk review with empty reviews"""
        url = reverse('asset:bulk-review')
        data = {
            'reviews': []
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_bulk_review_unauthenticated(self):
        """Test bulk review without authentication"""
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:bulk-review')
        data = {
            'reviews': [
                {
                    'asset_id': self.asset.id,
                    'action': 'approve',
                    'comment': 'Bulk approved'
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_bulk_review_nonexistent_asset(self):
        """Test bulk review with non-existent asset"""
        url = reverse('asset:bulk-review')
        data = {
            'reviews': [
                {
                    'asset_id': 99999,
                    'action': 'approve',
                    'comment': 'Bulk approved'
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['failed'], 1)
    
    def test_bulk_review_mixed_actions(self):
        """Test bulk review with mixed approve and reject actions"""
        # Move assets to UnderReview
        self.asset.start_review(reviewer=self.user1)
        self.asset.save()
        self.asset2.start_review(reviewer=self.user1)
        self.asset2.save()
        
        url = reverse('asset:bulk-review')
        data = {
            'reviews': [
                {
                    'asset_id': self.asset.id,
                    'action': 'approve',
                    'comment': 'Approved'
                },
                {
                    'asset_id': self.asset2.id,
                    'action': 'reject',
                    'comment': 'Rejected'
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['successful'], 2)
        self.assertEqual(response.data['summary']['failed'], 0)
        
        # Check assets have correct status
        asset1 = Asset.objects.get(pk=self.asset.id)
        asset2 = Asset.objects.get(pk=self.asset2.id)
        self.assertEqual(asset1.status, Asset.APPROVED)
        self.assertEqual(asset2.status, Asset.REVISION_REQUIRED) 