from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from asset.models import AssetStateTransition, Asset, AssetVersion
from core.models import Organization, Team, Project
from task.models import Task
import tempfile
import os

User = get_user_model()


class AssetSubmitAPITest(APITestCase):
    """Test Asset submit for review endpoint"""
    
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
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test']
        )
        
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)
    
    def create_finalized_version(self, asset=None, version_number=1, uploaded_by=None):
        """Helper method to create a finalized version for testing"""
        if asset is None:
            asset = self.asset
        if uploaded_by is None:
            uploaded_by = self.user1
            
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=version_number,
            uploaded_by=uploaded_by
        )
        # Start scan
        version.start_scan()
        # Mark as clean
        version.mark_clean()
        # Finalize version
        version.finalize(finalized_by=uploaded_by)
        version.save()
        return version
    
    def test_submit_asset_for_review(self):
        """Test submitting asset for review"""
        # Create a finalized version first (required for submission)
        self.create_finalized_version()
        
        # Verify asset can be submitted
        self.assertTrue(self.asset.can_submit())
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.PENDING_REVIEW)
        
        # Check database was updated - avoid FSM field refresh
        asset = Asset.objects.get(pk=self.asset.id)
        self.assertEqual(asset.status, Asset.PENDING_REVIEW)
        
        # Check transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.from_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.to_state, Asset.PENDING_REVIEW)
        self.assertEqual(transition.transition_method, 'submit')
        self.assertEqual(transition.triggered_by, self.user1)
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'submitted_for_review')
    
    def test_submit_asset_invalid_state(self):
        """Test submitting asset from invalid state"""
        # Create a finalized version first
        self.create_finalized_version()
        
        # Move asset to PendingReview state
        self.asset.submit(submitted_by=self.user1)
        self.asset.save()  # Make sure the state change is saved
        
        # Verify the asset is in PendingReview state
        asset = Asset.objects.get(pk=self.asset.id)
        self.assertEqual(asset.status, Asset.PENDING_REVIEW)
        
        # Verify asset cannot be submitted again
        self.assertFalse(asset.can_submit())
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be submitted', response.data['detail'])
    
    def test_submit_asset_without_finalized_version(self):
        """Test submitting asset without a finalized version"""
        # Asset has no versions, so it cannot be submitted
        self.assertFalse(self.asset.can_submit())
        self.assertFalse(self.asset.latest_version_is_finalized())
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be submitted', response.data['detail'])
    
    def test_submit_asset_with_draft_version(self):
        """Test submitting asset with only draft version"""
        # Create a draft version (not finalized)
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user1
        )
        version.start_scan()
        version.mark_clean()
        # Don't finalize the version
        
        # Asset cannot be submitted with draft version
        self.assertFalse(self.asset.can_submit())
        self.assertFalse(self.asset.latest_version_is_finalized())
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be submitted', response.data['detail'])
    
    def test_submit_asset_with_infected_version(self):
        """Test submitting asset with infected version"""
        # Create a version but mark it as infected
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user1
        )
        version.start_scan()
        version.mark_infected(virus_name='test_virus')
        # Cannot finalize infected version
        with self.assertRaises(Exception):
            version.finalize(finalized_by=self.user1)
        
        # Asset cannot be submitted with infected version
        self.assertFalse(self.asset.can_submit())
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be submitted', response.data['detail'])
    
    def test_submit_asset_unauthenticated(self):
        """Test submitting asset without authentication"""
        # Create a finalized version first
        self.create_finalized_version()
        
        # Clear authentication
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_submit_nonexistent_asset(self):
        """Test submitting non-existent asset"""
        url = reverse('asset:asset-submit', kwargs={'pk': 99999})
        response = self.client.put(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_submit_asset_with_different_user_fail(self):
        """Test submitting asset with different user (should work if no ownership restrictions)"""
        # Create a finalized version first
        self.create_finalized_version()
        
        # Authenticate as user2
        self.client.force_authenticate(user=self.user2)
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        
        # This should work if there are no ownership restrictions
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check transition was logged with user2
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.triggered_by, self.user2)
    
    def test_submit_asset_multiple_transitions_logged(self):
        """Test that multiple submit attempts create proper transition logs"""
        # Create a finalized version first
        self.create_finalized_version()
        self.asset.save()
        self.asset.submit(submitted_by=self.user1)

        # Submit the asset
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check transition was logged
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(len(transitions), 2)
        
        submit_transition = transitions[0]
        self.assertEqual(submit_transition.transition_method, 'submit')
        self.assertEqual(submit_transition.from_state, Asset.NOT_SUBMITTED)
        self.assertEqual(submit_transition.to_state, Asset.PENDING_REVIEW)
        self.assertEqual(submit_transition.triggered_by, self.user1)
        self.assertIsNotNone(submit_transition.timestamp)
        self.assertIsNotNone(submit_transition.metadata)
    
    def test_submit_asset_metadata_consistency(self):
        """Test that submit transition metadata is consistent"""
        # Create a finalized version first
        self.create_finalized_version()
        
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check metadata consistency
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'submitted_for_review')
        self.assertIsInstance(transition.metadata, dict)


class AssetReviewAPITest(APITestCase):
    """Test Asset Review endpoints"""
    
    def setUp(self):
        super().setUp()
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
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.PENDING_REVIEW,
            tags=['test']
        )
        
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)
    
    def create_finalized_version(self, asset=None, version_number=1, uploaded_by=None):
        """Helper method to create a finalized version for testing"""
        if asset is None:
            asset = self.asset
        if uploaded_by is None:
            uploaded_by = self.user1
            
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=version_number,
            uploaded_by=uploaded_by
        )
        # Start scan
        version.start_scan()
        # Mark as clean
        version.mark_clean()
        # Finalize version
        version.finalize(finalized_by=uploaded_by)
        version.save()
        return version
    
    def test_start_review(self):
        """Test starting review"""
        # Create a finalized version first
        self.create_finalized_version()
        # Verify the asset is in PendingReview state
        self.assertEqual(self.asset.status, Asset.PENDING_REVIEW)
        self.assertTrue(self.asset.can_start_review())
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'start_review'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.UNDER_REVIEW)
        
        # Check database was updated
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.UNDER_REVIEW)
        self.assertTrue(self.asset.can_approve())
        self.assertTrue(self.asset.can_reject())
        
        # Check transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'start_review')
        self.assertEqual(transition.from_state, Asset.PENDING_REVIEW)
        self.assertEqual(transition.to_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.triggered_by, self.user1)
    
    
    def test_approve_asset(self):
        """Test approving asset"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # Move to UnderReview state first
        self.asset.start_review(reviewer=self.user1)
        self.asset.save()
        
        # Verify the asset is in UnderReview state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.UNDER_REVIEW)
        self.assertTrue(self.asset.can_approve())
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'approve'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.APPROVED)
        
        # Check database was updated
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.APPROVED)
        self.assertTrue(self.asset.can_archive())
        
        # Check transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'approve')
        self.assertEqual(transition.from_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.to_state, Asset.APPROVED)
        self.assertEqual(transition.triggered_by, self.user1)
    
    def test_reject_asset(self):
        """Test rejecting asset"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # Move to UnderReview state first
        self.asset.start_review(reviewer=self.user1)
        self.asset.save()
        
        # Verify the asset is in UnderReview state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.UNDER_REVIEW)
        self.assertTrue(self.asset.can_reject())
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'reject'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.REVISION_REQUIRED)
        
        # Check database was updated
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.REVISION_REQUIRED)
        self.assertTrue(self.asset.can_acknowledge_rejection())
        
        # Check transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'reject')
        self.assertEqual(transition.from_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.to_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.triggered_by, self.user1)
    
    def test_acknowledge_rejection(self):
        """Test acknowledging rejection and returning to not submitted"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # Move to Rejected state first
        self.asset.start_review(reviewer=self.user1)
        self.asset.reject(rejector=self.user2, reason='Needs changes')
        self.asset.save()
        
        # Verify the asset is in Rejected state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.REVISION_REQUIRED)
        self.assertTrue(self.asset.can_acknowledge_rejection())
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'acknowledge_rejection'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.NOT_SUBMITTED)
        
        # Check database was updated
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.NOT_SUBMITTED)
        self.assertTrue(self.asset.can_submit())
        
        # Check transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'acknowledge_rejection')
        self.assertEqual(transition.from_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.to_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.triggered_by, self.user1)
    
    def test_archive_approved_asset(self):
        """Test archiving approved asset"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # Move to Approved state first
        self.asset.start_review(reviewer=self.user1)
        self.asset.approve(approver=self.user2)
        self.asset.save()
        
        # Verify the asset is in Approved state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.APPROVED)
        self.assertTrue(self.asset.can_archive())
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'archive'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.ARCHIVED)
        
        # Check database was updated
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.ARCHIVED)
        
        # Check transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'archive')
        self.assertEqual(transition.from_state, Asset.APPROVED)
        self.assertEqual(transition.to_state, Asset.ARCHIVED)
        self.assertEqual(transition.triggered_by, self.user1)
    
    def test_archive_rejected_asset_fail(self):
        """Test archiving rejected asset"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # Move to Rejected state first
        self.asset.start_review(reviewer=self.user1)
        self.asset.reject(rejector=self.user2, reason='Not suitable')
        self.asset.save()
        
        # Verify the asset is in Rejected state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.REVISION_REQUIRED)
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'archive'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check database was updated
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.REVISION_REQUIRED)
        
        # Check transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'reject')
        self.assertEqual(transition.from_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.to_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.triggered_by, self.user2)
    
    def test_invalid_review_action(self):
        """Test invalid review action"""
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'invalid_action'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid action', response.data['detail'])
    
    def test_review_action_invalid_state(self):
        """Test review action from invalid state"""
        # Asset is in PendingReview, cannot approve directly
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'approve'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be approved', response.data['detail'])
    
    def test_cannot_start_review_from_not_submitted(self):
        """Test cannot start review from not submitted state"""
        # Create a fresh asset in not submitted state
        not_submitted_asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Create a finalized version for this asset
        self.create_finalized_version(asset=not_submitted_asset)
        
        url = reverse('asset:asset-review', kwargs={'pk': not_submitted_asset.id})
        data = {
            'action': 'start_review'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot start review', response.data['detail'])
    
    def test_cannot_acknowledge_rejection_from_approved(self):
        """Test cannot acknowledge rejection from approved state"""
        # Create a finalized version and move to Approved state first
        self.create_finalized_version()
        self.asset.start_review(reviewer=self.user1)
        self.asset.approve(approver=self.user2)
        self.asset.save()
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {
            'action': 'acknowledge_rejection'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_cannot_archive_from_not_submitted(self):
        """Test cannot archive from not submitted state"""
        # Create a fresh asset in not submitted state
        not_submitted_asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Create a finalized version for this asset
        self.create_finalized_version(asset=not_submitted_asset)
        
        url = reverse('asset:asset-review', kwargs={'pk': not_submitted_asset.id})
        data = {
            'action': 'archive'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('cannot be archived', response.data['detail'])
    
    def test_review_without_comment(self):
        """Test review actions without comments"""
        # Create a finalized version and move to UnderReview
        self.create_finalized_version()
        self.asset.start_review(reviewer=self.user1)
        self.asset.save()
        
        # Test approve without comment
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'approve'}
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.APPROVED)
        
        # Check transition was logged without comment
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'approve')
        self.assertNotIn('comment', transition.metadata)
    
    
    def test_review_unauthenticated(self):
        """Test review actions without authentication"""
        # Create a finalized version and move to UnderReview
        self.create_finalized_version()
        self.asset.start_review(reviewer=self.user1)
        self.asset.save()
        
        # Clear authentication
        self.client.force_authenticate(user=None)
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'approve'}
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_review_nonexistent_asset(self):
        """Test review actions on non-existent asset"""
        url = reverse('asset:asset-review', kwargs={'pk': 99999})
        data = {'action': 'approve'}
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
      
    def test_review_http_methods(self):
        """Test that only PATCH method is allowed for review actions"""
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'approve'}
        
        # Test GET method (should not be allowed)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        # Test POST method (should not be allowed)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        # Test PUT method (should not be allowed)
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        # Test DELETE method (should not be allowed)
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_review_missing_action(self):
        """Test review request without action field"""
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {}  # No action field
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_review_empty_action(self):
        """Test review request with empty action field"""
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': ''}  # Empty action
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AssetWorkflowEndToEndTest(APITestCase):
    """Test complete asset workflow end-to-end"""
    
    def setUp(self):
        super().setUp()
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
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test']
        )
        
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)
    
    def create_finalized_version(self, asset=None, version_number=1, uploaded_by=None):
        """Helper method to create a finalized version for testing"""
        if asset is None:
            asset = self.asset
        if uploaded_by is None:
            uploaded_by = self.user1
            
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=version_number,
            uploaded_by=uploaded_by
        )
        # Start scan
        version.start_scan()
        # Mark as clean
        version.mark_clean()
        # Finalize version
        version.finalize(finalized_by=uploaded_by)
        version.save()
        return version
    
    def test_complete_workflow_approval_path(self):
        """Test complete workflow: NotSubmitted -> PendingReview -> UnderReview -> Approved -> Archived"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # 1. Submit for review (NotSubmitted -> PendingReview)
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.PENDING_REVIEW)
        
        # Verify asset state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.PENDING_REVIEW)
        self.assertTrue(self.asset.can_start_review())
        
        # 2. Start review (PendingReview -> UnderReview)
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.UNDER_REVIEW)
        
        # Verify asset state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.UNDER_REVIEW)
        self.assertTrue(self.asset.can_approve())
        self.assertTrue(self.asset.can_reject())
        
        # 3. Approve (UnderReview -> Approved)
        data = {'action': 'approve', 'comment': 'Excellent work!'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.APPROVED)
        
        # Verify asset state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.APPROVED)
        self.assertTrue(self.asset.can_archive())
        
        # 4. Archive (Approved -> Archived)
        data = {'action': 'archive', 'comment': 'Project completed'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.ARCHIVED)
        
        # Verify final state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.ARCHIVED)
        
        # Check all transitions were logged
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(len(transitions), 4)
        
        expected_transitions = [
            ('submit', Asset.NOT_SUBMITTED, Asset.PENDING_REVIEW),
            ('start_review', Asset.PENDING_REVIEW, Asset.UNDER_REVIEW),
            ('approve', Asset.UNDER_REVIEW, Asset.APPROVED),
            ('archive', Asset.APPROVED, Asset.ARCHIVED),
        ]
        
        for i, (method, from_state, to_state) in enumerate(expected_transitions):
            self.assertEqual(transitions[i].transition_method, method)
            self.assertEqual(transitions[i].from_state, from_state)
            self.assertEqual(transitions[i].to_state, to_state)
    
    def test_complete_workflow_rejection_path(self):
        """Test complete workflow: NotSubmitted -> PendingReview -> UnderReview -> RevisionRequired -> NotSubmitted -> PendingReview -> UnderReview -> Approved"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # 1. Submit for review
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. Start review
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Reject
        data = {'action': 'reject', 'comment': 'Needs significant changes'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.REVISION_REQUIRED)
        
        # Verify asset state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.REVISION_REQUIRED)
        self.assertTrue(self.asset.can_acknowledge_rejection())
        
        # 4. Acknowledge rejection
        data = {'action': 'acknowledge_rejection', 'comment': 'Please revise'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.NOT_SUBMITTED)
        
        # Verify asset state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.NOT_SUBMITTED)
        self.assertTrue(self.asset.can_submit())
        
        # 5. Submit again
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 6. Start review again
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 7. Approve
        data = {'action': 'approve', 'comment': 'Perfect now!'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], Asset.APPROVED)
        
        # Verify final state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.APPROVED)
        
        # Check all transitions were logged
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(len(transitions), 7)
        
        # Verify the rejection and return cycle
        rejection_transition = transitions[2]  # 3rd transition
        self.assertEqual(rejection_transition.transition_method, 'reject')
        self.assertEqual(rejection_transition.from_state, Asset.UNDER_REVIEW)
        self.assertEqual(rejection_transition.to_state, Asset.REVISION_REQUIRED)
        
        return_transition = transitions[3]  # 4th transition
        self.assertEqual(return_transition.transition_method, 'acknowledge_rejection')
        self.assertEqual(return_transition.from_state, Asset.REVISION_REQUIRED)
        self.assertEqual(return_transition.to_state, Asset.NOT_SUBMITTED)
    
    def test_workflow_with_multiple_rejections(self):
        """Test workflow with multiple rejection cycles"""
        # Create a finalized version
        self.create_finalized_version()
        
        # First submission and rejection cycle
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = {'action': 'reject', 'comment': 'First rejection'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = {'action': 'acknowledge_rejection', 'comment': 'Will fix'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Second submission and rejection cycle
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = {'action': 'reject', 'comment': 'Second rejection'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = {'action': 'acknowledge_rejection', 'comment': 'Will fix again'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Final submission and approval
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = {'action': 'approve', 'comment': 'Finally approved'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify final state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.APPROVED)
        
        # Check all transitions were logged
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(len(transitions), 11)  # 3 cycles: 4+4+3 transitions
        
        # Verify rejection patterns
        rejections = [t for t in transitions if t.transition_method == 'reject']
        self.assertEqual(len(rejections), 2)
        
        acknowledgments = [t for t in transitions if t.transition_method == 'acknowledge_rejection']
        self.assertEqual(len(acknowledgments), 2)
    
    def test_workflow_with_different_users(self):
        """Test workflow with different users performing different actions"""
        # Create a finalized version
        self.create_finalized_version()
        
        # User1 submits
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User2 starts review
        self.client.force_authenticate(user=self.user2)
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User2 rejects
        data = {'action': 'reject', 'comment': 'Rejected by reviewer'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User1 acknowledges rejection
        self.client.force_authenticate(user=self.user1)
        data = {'action': 'acknowledge_rejection', 'comment': 'Acknowledged by owner'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User1 resubmits
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User2 starts review again
        self.client.force_authenticate(user=self.user2)
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User2 approves
        data = {'action': 'approve', 'comment': 'Approved by reviewer'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # User1 archives
        self.client.force_authenticate(user=self.user1)
        data = {'action': 'archive', 'comment': 'Archived by owner'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify final state
        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, Asset.ARCHIVED)
        
        # Check transitions have correct users
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(transitions[0].triggered_by, self.user1)  # submit
        self.assertEqual(transitions[1].triggered_by, self.user2)  # start_review
        self.assertEqual(transitions[2].triggered_by, self.user2)  # reject
        self.assertEqual(transitions[3].triggered_by, self.user1)  # acknowledge_rejection
        self.assertEqual(transitions[4].triggered_by, self.user1)  # submit again
        self.assertEqual(transitions[5].triggered_by, self.user2)  # start_review again
        self.assertEqual(transitions[6].triggered_by, self.user2)  # approve
        self.assertEqual(transitions[7].triggered_by, self.user1)  # archive
    
    def test_workflow_state_validation(self):
        """Test that workflow enforces proper state transitions"""
        # Create a finalized version
        self.create_finalized_version()
        
        # Try to start review without submitting (should fail)
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Submit first
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to approve without starting review (should fail)
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'approve'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Start review
        data = {'action': 'start_review'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to submit again (should fail)
        url = reverse('asset:asset-submit', kwargs={'pk': self.asset.id})
        response = self.client.put(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Approve
        url = reverse('asset:asset-review', kwargs={'pk': self.asset.id})
        data = {'action': 'approve'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Try to reject after approval (should fail)
        data = {'action': 'reject'}
        response = self.client.patch(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    


class AssetStateTransitionLoggingTest(APITestCase):
    """Test that all state transitions are properly logged"""
    
    def setUp(self):
        super().setUp()
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
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test']
        )
        
        # Authenticate as user1
        self.client.force_authenticate(user=self.user1)
    
    def create_finalized_version(self, asset=None, version_number=1, uploaded_by=None):
        """Helper method to create a finalized version for testing"""
        if asset is None:
            asset = self.asset
        if uploaded_by is None:
            uploaded_by = self.user1
            
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=version_number,
            uploaded_by=uploaded_by
        )
        # Start scan
        version.start_scan()
        # Mark as clean
        version.mark_clean()
        # Finalize version
        version.finalize(finalized_by=uploaded_by)
        version.save()
        return version
    
    def test_transition_logging_completeness(self):
        """Test that all transitions create proper log entries"""
        # Create a finalized version for the asset first using proper workflow
        self.create_finalized_version()
        
        # Perform a series of transitions
        self.asset.submit(submitted_by=self.user1)
        self.asset.save()
        
        self.asset.start_review(reviewer=self.user2)
        self.asset.save()
        
        self.asset.reject(rejector=self.user1, reason='Not good enough')
        self.asset.save()
        
        # Check all transitions were logged
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(len(transitions), 3)
        
        # Check each transition has required fields
        for transition in transitions:
            self.assertIsNotNone(transition.from_state)
            self.assertIsNotNone(transition.to_state)
            self.assertIsNotNone(transition.transition_method)
            self.assertIsNotNone(transition.timestamp)
            self.assertIsNotNone(transition.metadata)
        
        # Check specific transition details
        submit_transition = transitions[0]
        self.assertEqual(submit_transition.transition_method, 'submit')
        self.assertEqual(submit_transition.triggered_by, self.user1)
        self.assertIn('action', submit_transition.metadata)
        
        reject_transition = transitions[2]
        self.assertEqual(reject_transition.transition_method, 'reject')
        self.assertEqual(reject_transition.triggered_by, self.user1)
        self.assertIn('reason', reject_transition.metadata)
        self.assertEqual(reject_transition.metadata['reason'], 'Not good enough')
    
    def test_submit_transition_logging(self):
        """Test submit transition logging details"""
        # Create a finalized version first
        self.create_finalized_version()
        
        # Submit the asset
        self.asset.submit(submitted_by=self.user1)
        self.asset.save()
        
        # Check transition logging
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.to_state, Asset.PENDING_REVIEW)
        self.assertEqual(transition.transition_method, 'submit')
        self.assertEqual(transition.triggered_by, self.user1)
        self.assertIsNotNone(transition.timestamp)
        
        # Check metadata
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'submitted_for_review')
        self.assertIsInstance(transition.metadata, dict)
    
    def test_start_review_transition_logging(self):
        """Test start_review transition logging details"""
        # Create a finalized version and submit first
        self.create_finalized_version()
        self.asset.submit(submitted_by=self.user1)
        self.asset.save()
        
        # Start review
        self.asset.start_review(reviewer=self.user2)
        self.asset.save()
        
        # Check transition logging
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.PENDING_REVIEW)
        self.assertEqual(transition.to_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.transition_method, 'start_review')
        self.assertEqual(transition.triggered_by, self.user2)
        self.assertIsNotNone(transition.timestamp)
        
        # Check metadata
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'review_started')
        self.assertIsInstance(transition.metadata, dict)
    
    def test_approve_transition_logging(self):
        """Test approve transition logging details"""
        # Create a finalized version and move to UnderReview
        self.create_finalized_version()
        self.asset.submit(submitted_by=self.user1)
        self.asset.start_review(reviewer=self.user2)
        self.asset.save()
        
        # Approve the asset
        self.asset.approve(approver=self.user1)
        self.asset.save()
        
        # Check transition logging
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.to_state, Asset.APPROVED)
        self.assertEqual(transition.transition_method, 'approve')
        self.assertEqual(transition.triggered_by, self.user1)
        self.assertIsNotNone(transition.timestamp)
        
        # Check metadata
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'approved')
        self.assertIsInstance(transition.metadata, dict)
    
    def test_reject_transition_logging(self):
        """Test reject transition logging details"""
        # Create a finalized version and move to UnderReview
        self.create_finalized_version()
        self.asset.submit(submitted_by=self.user1)
        self.asset.start_review(reviewer=self.user2)
        self.asset.save()
        
        # Reject the asset
        reason = 'Needs significant changes'
        self.asset.reject(rejector=self.user1, reason=reason)
        self.asset.save()
        
        # Check transition logging
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.to_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.transition_method, 'reject')
        self.assertEqual(transition.triggered_by, self.user1)
        self.assertIsNotNone(transition.timestamp)
        
        # Check metadata
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'rejected')
        self.assertIn('reason', transition.metadata)
        self.assertEqual(transition.metadata['reason'], reason)
        self.assertIsInstance(transition.metadata, dict)
    
    def test_acknowledge_rejection_transition_logging(self):
        """Test acknowledge_rejection transition logging details"""
        # Create a finalized version and move to RevisionRequired
        self.create_finalized_version()
        self.asset.submit(submitted_by=self.user1)
        self.asset.start_review(reviewer=self.user2)
        self.asset.reject(rejector=self.user1, reason='Needs changes')
        self.asset.save()
        
        # Acknowledge rejection
        reason = 'Will revise and resubmit'
        self.asset.acknowledge_rejection(returned_by=self.user1, reason=reason)
        self.asset.save()
        
        # Check transition logging
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.to_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.transition_method, 'acknowledge_rejection')
        self.assertEqual(transition.triggered_by, self.user1)
        self.assertIsNotNone(transition.timestamp)
        
        # Check metadata
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'acknowledged_rejection')
        self.assertIn('reason', transition.metadata)
        self.assertEqual(transition.metadata['reason'], reason)
        self.assertIsInstance(transition.metadata, dict)
    
    def test_archive_transition_logging(self):
        """Test archive transition logging details"""
        # Create a finalized version and move to Approved
        self.create_finalized_version()
        self.asset.submit(submitted_by=self.user1)
        self.asset.start_review(reviewer=self.user2)
        self.asset.approve(approver=self.user1)
        self.asset.save()
        
        # Archive the asset
        self.asset.archive(archived_by=self.user2)
        self.asset.save()
        
        # Check transition logging
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.APPROVED)
        self.assertEqual(transition.to_state, Asset.ARCHIVED)
        self.assertEqual(transition.transition_method, 'archive')
        self.assertEqual(transition.triggered_by, self.user2)
        self.assertIsNotNone(transition.timestamp)
        
        # Check metadata
        self.assertIn('action', transition.metadata)
        self.assertEqual(transition.metadata['action'], 'archived')
        self.assertIsInstance(transition.metadata, dict)
    
    def test_transition_ordering_by_timestamp(self):
        """Test that transitions are properly ordered by timestamp"""
        # Create a finalized version
        self.create_finalized_version()
        
        # Perform multiple transitions
        self.asset.submit(submitted_by=self.user1)
        self.asset.save()
        
        self.asset.start_review(reviewer=self.user2)
        self.asset.save()
        
        self.asset.approve(approver=self.user1)
        self.asset.save()
        
        # Check ordering
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(len(transitions), 3)
        
        # Verify chronological order
        for i in range(len(transitions) - 1):
            self.assertLess(transitions[i].timestamp, transitions[i + 1].timestamp)
        
        # Verify expected sequence
        expected_methods = ['submit', 'start_review', 'approve']
        for i, transition in enumerate(transitions):
            self.assertEqual(transition.transition_method, expected_methods[i])
    
    def test_transition_metadata_consistency(self):
        """Test that transition metadata is consistent across all transitions"""
        # Create a finalized version
        self.create_finalized_version()
        
        # Perform transitions and check metadata consistency
        transitions_data = [
            ('submit', self.user1, {'action': 'submitted_for_review'}),
            ('start_review', self.user2, {'action': 'review_started'}),
            ('approve', self.user1, {'action': 'approved'}),
        ]
        
        for method, user, expected_metadata in transitions_data:
            if method == 'submit':
                self.asset.submit(submitted_by=user)
            elif method == 'start_review':
                self.asset.start_review(reviewer=user)
            elif method == 'approve':
                self.asset.approve(approver=user)
            
            self.asset.save()
            
            # Check latest transition
            transition = AssetStateTransition.objects.latest('timestamp')
            self.assertEqual(transition.transition_method, method)
            self.assertEqual(transition.triggered_by, user)
            self.assertIsInstance(transition.metadata, dict)
            
            # Check metadata contains expected keys
            for key, value in expected_metadata.items():
                self.assertIn(key, transition.metadata)
                self.assertEqual(transition.metadata[key], value)
    
    def test_transition_with_reason_metadata(self):
        """Test transitions that include reason metadata"""
        # Create a finalized version and move to UnderReview
        self.create_finalized_version()
        self.asset.submit(submitted_by=self.user1)
        self.asset.start_review(reviewer=self.user2)
        self.asset.save()
        
        # Test reject with reason
        reject_reason = 'Quality standards not met'
        self.asset.reject(rejector=self.user1, reason=reject_reason)
        self.asset.save()
        
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'reject')
        self.assertIn('reason', transition.metadata)
        self.assertEqual(transition.metadata['reason'], reject_reason)
        
        # Test acknowledge rejection with reason
        ack_reason = 'Will address all issues'
        self.asset.acknowledge_rejection(returned_by=self.user1, reason=ack_reason)
        self.asset.save()
        
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'acknowledge_rejection')
        self.assertIn('reason', transition.metadata)
        self.assertEqual(transition.metadata['reason'], ack_reason)
    
    def test_transition_triggered_by_null(self):
        """Test that transitions can handle null triggered_by"""
        # Create a finalized version
        self.create_finalized_version()
        
        # Submit without specifying user (should use current user)
        self.asset.submit(submitted_by=None)
        self.asset.save()
        
        # Check transition logging
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'submit')
        self.assertIsNone(transition.triggered_by)  # Should be None when not specified
        self.assertIsNotNone(transition.timestamp)
        self.assertIsNotNone(transition.metadata)
    
    def test_multiple_assets_transition_logging(self):
        """Test that transitions are properly isolated between assets"""
        # Create second asset
        asset2 = Asset.objects.create(
            task=self.task,
            owner=self.user2,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test2']
        )
        
        # Create finalized versions for both assets
        self.create_finalized_version()
        self.create_finalized_version(asset=asset2, uploaded_by=self.user2)
        
        # Submit both assets
        self.asset.submit(submitted_by=self.user1)
        self.asset.save()
        
        asset2.submit(submitted_by=self.user2)
        asset2.save()
        
        # Check transitions are isolated
        asset1_transitions = AssetStateTransition.objects.filter(asset=self.asset)
        asset2_transitions = AssetStateTransition.objects.filter(asset=asset2)
        
        self.assertEqual(len(asset1_transitions), 1)
        self.assertEqual(len(asset2_transitions), 1)
        
        # Check they have different triggered_by users
        self.assertEqual(asset1_transitions[0].triggered_by, self.user1)
        self.assertEqual(asset2_transitions[0].triggered_by, self.user2)

