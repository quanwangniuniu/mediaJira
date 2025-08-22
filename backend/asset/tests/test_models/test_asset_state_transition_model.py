from django.test import TestCase
from django.contrib.auth import get_user_model
from asset.models import Asset, AssetStateTransition
from core.models import Organization, Team, Project
from task.models import Task

User = get_user_model()


class AssetStateTransitionModelTest(TestCase):
    """Test cases for AssetStateTransition model"""
    
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
    
    def test_state_transition_creation(self):
        """Test basic state transition creation"""
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.NOT_SUBMITTED,
            to_state=Asset.PENDING_REVIEW,
            transition_method='submit',
            triggered_by=self.user,
            metadata={'action': 'submitted_for_review'}
        )
        
        self.assertEqual(transition.asset, self.asset)
        self.assertEqual(transition.from_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.to_state, Asset.PENDING_REVIEW)
        self.assertEqual(transition.transition_method, 'submit')
        self.assertEqual(transition.triggered_by, self.user)
        self.assertEqual(transition.metadata, {'action': 'submitted_for_review'})
        self.assertIsNotNone(transition.timestamp)
    
    def test_state_transition_string_representation(self):
        """Test state transition string representation"""
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.NOT_SUBMITTED,
            to_state=Asset.PENDING_REVIEW,
            transition_method='submit',
            triggered_by=self.user
        )
        expected = f"Asset {self.asset.id}: Not Submitted → Pending Review"
        self.assertEqual(str(transition), expected)
    
    def test_state_transition_table_name(self):
        """Test state transition table name"""
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.NOT_SUBMITTED,
            to_state=Asset.PENDING_REVIEW,
            transition_method='submit',
            triggered_by=self.user
        )
        self.assertEqual(transition._meta.db_table, 'asset_state_transitions')
    
    def test_state_transition_without_triggered_by(self):
        """Test state transition without triggered_by user"""
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.NOT_SUBMITTED,
            to_state=Asset.PENDING_REVIEW,
            transition_method='submit'
        )
        
        self.assertIsNone(transition.triggered_by)
    
    def test_state_transition_metadata(self):
        """Test state transition metadata handling"""
        metadata = {
            'action': 'submitted_for_review',
            'comment': 'Ready for review',
            'priority': 'high'
        }
        
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.NOT_SUBMITTED,
            to_state=Asset.PENDING_REVIEW,
            transition_method='submit',
            triggered_by=self.user,
            metadata=metadata
        )
        
        self.assertEqual(transition.metadata, metadata)
    
    def test_revision_required_transition(self):
        """Test transition to RevisionRequired state"""
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.UNDER_REVIEW,
            to_state=Asset.REVISION_REQUIRED,
            transition_method='reject',
            triggered_by=self.user,
            metadata={'action': 'rejected', 'reason': 'Need improvements'}
        )
        
        self.assertEqual(transition.from_state, Asset.UNDER_REVIEW)
        self.assertEqual(transition.to_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.transition_method, 'reject')
        self.assertEqual(transition.metadata['reason'], 'Need improvements')
    
    def test_acknowledge_rejection_transition(self):
        """Test acknowledge_rejection transition"""
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.REVISION_REQUIRED,
            to_state=Asset.NOT_SUBMITTED,
            transition_method='acknowledge_rejection',
            triggered_by=self.user,
            metadata={'action': 'acknowledged_rejection', 'reason': 'Will revise'}
        )
        
        self.assertEqual(transition.from_state, Asset.REVISION_REQUIRED)
        self.assertEqual(transition.to_state, Asset.NOT_SUBMITTED)
        self.assertEqual(transition.transition_method, 'acknowledge_rejection')
        self.assertEqual(transition.metadata['reason'], 'Will revise')
    
    def test_archive_transition_from_approved(self):
        """Test archive transition from Approved state"""
        transition = AssetStateTransition.objects.create(
            asset=self.asset,
            from_state=Asset.APPROVED,
            to_state=Asset.ARCHIVED,
            transition_method='archive',
            triggered_by=self.user,
            metadata={'action': 'archived'}
        )
        
        self.assertEqual(transition.from_state, Asset.APPROVED)
        self.assertEqual(transition.to_state, Asset.ARCHIVED)
        self.assertEqual(transition.transition_method, 'archive') 