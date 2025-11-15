from django.test import TestCase
from django.contrib.auth import get_user_model
from django_fsm import TransitionNotAllowed
from django.core.exceptions import ValidationError
from asset.models import Asset, AssetStateTransition
from core.models import Organization, Team, Project
from task.models import Task

User = get_user_model()


class AssetCreationTest(TestCase):
    """Test cases for Asset model creation and basic properties"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
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
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
    
    def test_asset_creation(self):
        """Test basic asset creation"""
        self.assertEqual(self.asset.task, self.task)
        self.assertEqual(self.asset.owner, self.user)
        self.assertEqual(self.asset.team, self.team)
        self.assertEqual(self.asset.status, Asset.NOT_SUBMITTED)
        self.assertEqual(self.asset.tags, ['test', 'asset'])
        self.assertIsNotNone(self.asset.created_at)
        self.assertIsNotNone(self.asset.updated_at)
    
    def test_asset_string_representation(self):
        """Test asset string representation"""
        expected = f"Asset {self.asset.id} - Not Submitted"
        self.assertEqual(str(self.asset), expected)
    
    def test_asset_table_name(self):
        """Test asset table name"""
        self.assertEqual(self.asset._meta.db_table, 'assets')
    
    def test_asset_default_status(self):
        """Test asset default status is NotSubmitted"""
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team
        )
        self.assertEqual(new_asset.status, Asset.NOT_SUBMITTED)


class AssetTransitionTest(TestCase):
    """Test cases for Asset FSM transitions"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
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
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_asset_fsm_transitions(self):
        """Test all FSM transitions"""
        # Test submit transition - need a finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        self.assertEqual(version.scan_status, AssetVersion.CLEAN)
        
        version.finalize(finalized_by=self.user)
        version.save()
        self.assertEqual(version.version_status, AssetVersion.FINALIZED)
        
        self.assertTrue(self.asset.can_submit())
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.PENDING_REVIEW)
        
        # Test start_review transition
        self.assertTrue(self.asset.can_start_review())
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.UNDER_REVIEW)
        
        # Test approve transition
        self.assertTrue(self.asset.can_approve())
        self.asset.approve(approver=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.APPROVED)
        
        # Test archive transition
        self.assertTrue(self.asset.can_archive())
        self.asset.archive(archived_by=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.ARCHIVED)
    
    def test_start_scan_transition_only(self):
        """Test just the start_scan transition to isolate the issue"""
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        version.start_scan()
        version.save()
        
        self.assertEqual(version.scan_status, AssetVersion.SCANNING)
    
    def test_asset_reject_and_acknowledge_rejection_transitions(self):
        """Test reject and acknowledge_rejection transitions, including transition logging"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        version.save()
        
        # Reject asset
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.assertTrue(self.asset.can_reject())
        self.asset.reject(rejector=self.user, reason="Test rejection")
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.REVISION_REQUIRED)

        # Acknowledge rejection
        self.assertTrue(self.asset.can_acknowledge_rejection())
        self.asset.acknowledge_rejection(returned_by=self.user, reason="Returning for revision")
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.NOT_SUBMITTED)

        # Verify the transition was logged
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'acknowledge_rejection')
        self.assertEqual(transition.from_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.to_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.triggered_by, self.user)
        self.assertEqual(transition.metadata['reason'], "Returning for revision")
    
class AssetInvalidTransitionTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="pass")
        self.org = Organization.objects.create(name="Test Org")
        self.team = Team.objects.create(name="Team A", organization=self.org)
        self.project = Project.objects.create(name="Test Project", organization=self.org)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        self.asset = Asset.objects.create(task=self.task, owner=self.user, team=self.team)

    def _create_revision_required_asset(self):
        from asset.models import AssetVersion

        asset = Asset.objects.create(task=self.task, owner=self.user, team=self.team)
        version = AssetVersion.objects.create(
            asset=asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN,
        )
        version.finalize(finalized_by=self.user)
        version.save()

        asset.submit(submitted_by=self.user)
        asset.save()
        asset.start_review(reviewer=self.user)
        asset.save()
        asset.reject(rejector=self.user, reason="Test")
        asset.save()
        return asset

    def test_invalid_transitions_from_not_submitted(self):
        self.assertEqual(self.asset.status, Asset.NOT_SUBMITTED)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.approve(approver=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.reject(rejector=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.start_review(reviewer=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.archive(archived_by=self.user)

    def test_invalid_transitions_from_pending_review(self):
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.PENDING_REVIEW)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.approve(approver=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.reject(rejector=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.archive(archived_by=self.user)

    def test_invalid_transitions_from_under_review(self):
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        # Refresh asset to get updated version status
        # self.asset.refresh_from_db()

        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.UNDER_REVIEW)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.submit(submitted_by=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.start_review(reviewer=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.archive(archived_by=self.user)

    def test_invalid_transitions_from_approved(self):
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.asset.approve(approver=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.APPROVED)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.submit(submitted_by=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.start_review(reviewer=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.approve(approver=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.reject(rejector=self.user)

    def test_invalid_transitions_from_revision_required(self):
        revision_required_asset = self._create_revision_required_asset()
        self.assertEqual(revision_required_asset.status, Asset.REVISION_REQUIRED)
        
        # Test invalid transitions from RevisionRequired state
        with self.assertRaises(TransitionNotAllowed):
            revision_required_asset.start_review(reviewer=self.user)
        with self.assertRaises(TransitionNotAllowed):
            revision_required_asset.approve(approver=self.user)
        with self.assertRaises(TransitionNotAllowed):
            revision_required_asset.reject(rejector=self.user)

        # Asset can resubmit after addressing feedback
        self.assertTrue(revision_required_asset.can_submit())
        revision_required_asset.submit(submitted_by=self.user)
        revision_required_asset.save()
        self.assertEqual(revision_required_asset.status, Asset.PENDING_REVIEW)

        # Create another asset to validate acknowledge_rejection remains valid
        ack_asset = self._create_revision_required_asset()
        self.assertTrue(ack_asset.can_acknowledge_rejection())
        ack_asset.acknowledge_rejection(returned_by=self.user, reason="Returning for revision")
        ack_asset.save()
        self.assertEqual(ack_asset.status, Asset.NOT_SUBMITTED)

    def test_invalid_transitions_from_archived(self):
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.asset.approve(approver=self.user)
        self.asset.save()
        self.asset.archive(archived_by=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.ARCHIVED)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.submit(submitted_by=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.start_review(reviewer=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.approve(approver=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.reject(rejector=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.archive(archived_by=self.user)


class AssetHelperMethodTest(TestCase):
    """Test cases for Asset helper methods"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
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
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_asset_helper_methods_from_not_submitted(self):
        """Test helper methods from NotSubmitted state without versions"""
        # From NotSubmitted state without any versions
        self.assertFalse(self.asset.can_submit())  # No finalized version yet
        self.assertFalse(self.asset.can_start_review())
        self.assertFalse(self.asset.can_approve())
        self.assertFalse(self.asset.can_reject())
        self.assertFalse(self.asset.can_acknowledge_rejection())
        self.assertFalse(self.asset.can_archive())
        
        # Version-related methods
        self.assertFalse(self.asset.has_draft_version())
        self.assertFalse(self.asset.latest_version_is_finalized())
        self.assertTrue(self.asset.can_create_version())  # Can create first version
    
    def test_asset_helper_methods_after_submit(self):
        """Test helper methods after submit"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        version.save()
        
        # After submit
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.assertFalse(self.asset.can_submit())
        self.assertTrue(self.asset.can_start_review())
        self.assertFalse(self.asset.can_approve())
        self.assertFalse(self.asset.can_reject())
        self.assertFalse(self.asset.can_acknowledge_rejection())
        self.assertFalse(self.asset.can_archive())
    
    def test_asset_helper_methods_after_start_review(self):
        """Test helper methods after start review"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        version.save()
        
        # After start review
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.assertFalse(self.asset.can_submit())
        self.assertFalse(self.asset.can_start_review())
        self.assertTrue(self.asset.can_approve())
        self.assertTrue(self.asset.can_reject())
        self.assertFalse(self.asset.can_acknowledge_rejection())
        self.assertFalse(self.asset.can_archive())
    
    def test_asset_helper_methods_after_approve(self):
        """Test helper methods after approve"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        # # Refresh asset to get updated version status
        # self.asset.refresh_from_db()
        
        # After approve
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.asset.approve(approver=self.user)
        self.asset.save()
        self.assertFalse(self.asset.can_submit())
        self.assertFalse(self.asset.can_start_review())
        self.assertFalse(self.asset.can_approve())
        self.assertFalse(self.asset.can_reject())
        self.assertFalse(self.asset.can_acknowledge_rejection())
        self.assertTrue(self.asset.can_archive())
    
    def test_asset_helper_methods_after_reject(self):
        """Test helper methods after reject"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        # Refresh asset to get updated version status
        self.asset.refresh_from_db()
        
        # After reject
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.asset.reject(rejector=self.user, reason="Test")
        # Asset enters RevisionRequired and should now be able to resubmit
        self.assertTrue(self.asset.can_submit())
        self.assertFalse(self.asset.can_start_review())
        self.assertFalse(self.asset.can_approve())
        self.assertFalse(self.asset.can_reject())
        self.assertTrue(self.asset.can_acknowledge_rejection())
        self.assertFalse(self.asset.can_archive())
    
    def test_can_acknowledge_rejection_across_all_states(self):
        """Test can_acknowledge_rejection() method across all asset states"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        # Refresh asset to get updated version status
        self.asset.refresh_from_db()
        
        # NotSubmitted state
        self.assertFalse(self.asset.can_acknowledge_rejection())
        
        # PendingReview state
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.assertFalse(self.asset.can_acknowledge_rejection())
        
        # UnderReview state
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.assertFalse(self.asset.can_acknowledge_rejection())
        
        # Approved state
        self.asset.approve(approver=self.user)
        self.asset.save()
        self.assertFalse(self.asset.can_acknowledge_rejection())
        
        # RevisionRequired state (should be True)
        # Create a new asset to test RevisionRequired state
        revision_required_asset = Asset.objects.create(task=self.task, owner=self.user, team=self.team)
        revision_version = AssetVersion.objects.create(
            asset=revision_required_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        revision_version.finalize(finalized_by=self.user)
        revision_version.save()
        
        # Refresh asset to get updated version status
        revision_required_asset.refresh_from_db()
        
        revision_required_asset.submit(submitted_by=self.user)
        revision_required_asset.save()
        revision_required_asset.start_review(reviewer=self.user)
        revision_required_asset.save()
        revision_required_asset.reject(rejector=self.user, reason="Test")
        revision_required_asset.save()
        self.assertTrue(revision_required_asset.can_acknowledge_rejection())
        
        # Archived state
        self.asset.archive(archived_by=self.user)
        self.asset.save()
        self.assertFalse(self.asset.can_acknowledge_rejection())


class AssetLoggingTest(TestCase):
    """Test cases for Asset state transition logging"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
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
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_asset_state_transition_logging(self):
        """Test that state transitions are logged"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        # Refresh asset to get updated version status
        self.asset.refresh_from_db()
        
        initial_count = AssetStateTransition.objects.count()
        
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        
        # Check that transition was logged
        self.assertEqual(AssetStateTransition.objects.count(), initial_count + 1)
        
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.to_state, Asset.PENDING_REVIEW)
        self.assertEqual(transition.transition_method, 'submit')
        self.assertEqual(transition.triggered_by, self.user)
    
    def test_asset_multiple_transitions_logging(self):
        """Test that multiple transitions are logged correctly"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        # Refresh asset to get updated version status
        self.asset.refresh_from_db()
        
        initial_count = AssetStateTransition.objects.count()
        
        # Perform multiple transitions
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.asset.approve(approver=self.user)
        self.asset.save()
        
        # Check that all transitions were logged
        self.assertEqual(AssetStateTransition.objects.count(), initial_count + 3)
        
        # Check transitions in order
        transitions = AssetStateTransition.objects.filter(asset=self.asset).order_by('timestamp')
        self.assertEqual(len(transitions), 3)
        
        self.assertEqual(transitions[0].transition_method, 'submit')
        self.assertEqual(transitions[0].from_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transitions[0].to_state, Asset.PENDING_REVIEW)
        
        self.assertEqual(transitions[1].transition_method, 'start_review')
        self.assertEqual(transitions[1].from_state, Asset.PENDING_REVIEW)
        self.assertEqual(transitions[1].to_state, Asset.UNDER_REVIEW)
        
        self.assertEqual(transitions[2].transition_method, 'approve')
        self.assertEqual(transitions[2].from_state, Asset.UNDER_REVIEW)
        self.assertEqual(transitions[2].to_state, Asset.APPROVED)
    
    def test_asset_transition_metadata_logging(self):
        """Test that transition metadata is logged correctly"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.asset.start_review(reviewer=self.user)
        self.asset.save()
        self.asset.reject(rejector=self.user, reason="Test rejection reason")
        
        # Check metadata for reject transition
        transition = AssetStateTransition.objects.filter(
            transition_method='reject'
        ).latest('timestamp')
        
        self.assertEqual(transition.metadata['action'], 'rejected')
        self.assertEqual(transition.metadata['reason'], 'Test rejection reason')
    
    def test_asset_transition_without_user(self):
        """Test transition logging without user"""
        # Create finalized version first
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        version.finalize(finalized_by=self.user)
        version.save()
        
        # Refresh asset to get updated version status
        self.asset.refresh_from_db()
        
        self.asset.submit(submitted_by=None)
        
        transition = AssetStateTransition.objects.latest('timestamp')
        self.assertIsNone(transition.triggered_by)
        self.assertEqual(transition.transition_method, 'submit')

    def test_multiple_invalid_transitions_do_not_create_logs(self):
        """Multiple illegal transitions should not create any transition logs"""
        count_before = AssetStateTransition.objects.count()

        # Test multiple invalid transitions from NotSubmitted state
        with self.assertRaises(TransitionNotAllowed):
            self.asset.approve(approver=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.reject(rejector=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.start_review(reviewer=self.user)
        with self.assertRaises(TransitionNotAllowed):
            self.asset.archive(archived_by=self.user)
    
        count_after = AssetStateTransition.objects.count()
        self.assertEqual(count_before, count_after)


class AssetVersionRelatedTest(TestCase):
    """Test cases for Asset version-related methods"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
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
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_has_draft_version(self):
        """Test has_draft_version method"""
        # Initially no versions
        self.assertFalse(self.asset.has_draft_version())
        
        # Add a draft version
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        self.assertTrue(self.asset.has_draft_version())
        
        # Change to finalized (need to set scan_status to CLEAN first)
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        version.finalize(finalized_by=self.user)
        version.save()
        self.assertFalse(self.asset.has_draft_version())
    
    def test_latest_version_is_finalized(self):
        """Test latest_version_is_finalized method"""
        # Initially no versions
        self.assertFalse(self.asset.latest_version_is_finalized())
        
        # Add a draft version
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        self.assertFalse(self.asset.latest_version_is_finalized())
        
        # Change to finalized (need to set scan_status to CLEAN first)
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        version.finalize(finalized_by=self.user)
        version.save()
        self.asset.refresh_from_db()
        self.assertTrue(self.asset.latest_version_is_finalized())
        
        # Add another draft version (on a new asset since first version is finalized)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        version2 = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        self.assertFalse(new_asset.latest_version_is_finalized())
    
    def test_can_create_version(self):
        """Test can_create_version method"""
        # Initially no versions, should be able to create
        self.assertTrue(self.asset.can_create_version())
        
        # Add a draft version, should not be able to create
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        self.assertFalse(self.asset.can_create_version())
        
        # Change to finalized, should be able to create
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        version.finalize(finalized_by=self.user)
        version.save()
        self.assertTrue(self.asset.can_create_version())
    
    def test_validate_can_create_version(self):
        """Test validate_can_create_version method"""
        # Initially should not raise exception
        self.asset.validate_can_create_version()
        
        # Add a draft version, should raise exception
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        
        with self.assertRaises(ValidationError):
            self.asset.validate_can_create_version()
    
    def test_asset_after_deleting_all_versions(self):
        """Test asset behavior after all versions are deleted"""
        # Create a draft version first (can be deleted)
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        
        # Should be able to submit (but not with draft version)
        self.assertFalse(self.asset.can_submit())
        
        # Delete the draft version
        version.delete()
        
        # Now should behave like asset without versions
        self.assertFalse(self.asset.has_draft_version())
        self.assertFalse(self.asset.latest_version_is_finalized())
        self.assertTrue(self.asset.can_create_version())
        self.assertFalse(self.asset.can_submit())
        
        # Try to submit, should raise ValidationError
        with self.assertRaises(ValidationError):
            self.asset.submit(submitted_by=self.user)
    
    def test_asset_without_versions(self):
        """Test asset behavior when it has no versions"""
        # Initially no versions
        self.assertFalse(self.asset.has_draft_version())
        self.assertFalse(self.asset.latest_version_is_finalized())
        self.assertTrue(self.asset.can_create_version())  # Can create first version
        
        # Cannot submit without any versions
        self.assertFalse(self.asset.can_submit())
        
        # Try to submit, should raise ValidationError
        with self.assertRaises(ValidationError):
            self.asset.submit(submitted_by=self.user)
    
    def test_asset_without_versions_helper_methods(self):
        """Test helper methods when asset has no versions"""
        # All version-related methods should return False or None
        self.assertFalse(self.asset.has_draft_version())
        self.assertFalse(self.asset.latest_version_is_finalized())
        self.assertTrue(self.asset.can_create_version())
        
        # Status should remain NotSubmitted
        self.assertEqual(self.asset.status, Asset.NOT_SUBMITTED)
        
        # Cannot perform any transitions that require versions
        self.assertFalse(self.asset.can_submit())
        self.assertFalse(self.asset.can_start_review())
        self.assertFalse(self.asset.can_approve())
        self.assertFalse(self.asset.can_reject())
        self.assertFalse(self.asset.can_acknowledge_rejection())
        self.assertFalse(self.asset.can_archive())
    
    def test_cannot_submit_with_draft_version(self):
        """Test that asset cannot be submitted when it has a draft version"""
        # Initially no versions, cannot submit
        self.assertFalse(self.asset.can_submit())
        
        # Add a draft version, still cannot submit
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        self.assertFalse(self.asset.can_submit())
        
        # Change to finalized, now can submit
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        version.finalize(finalized_by=self.user)
        version.save()

        
        self.assertTrue(self.asset.can_submit())
        
        # Add another draft version, cannot submit again (on a new asset)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        version2 = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        self.assertFalse(new_asset.can_submit())
    
    def test_submit_transition_with_draft_version_raises_exception(self):
        """Test that submit transition raises exception when asset has draft version"""
        # Add a draft version
        from asset.models import AssetVersion
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT
        )
        
        # Try to submit, should raise ValidationError
        with self.assertRaises(ValidationError):
            self.asset.submit(submitted_by=self.user)
        
        # Change to finalized, should be able to submit
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        version.finalize(finalized_by=self.user)
        version.save()
        
        self.asset.submit(submitted_by=self.user)
        self.asset.save()
        self.assertEqual(self.asset.status, Asset.PENDING_REVIEW)