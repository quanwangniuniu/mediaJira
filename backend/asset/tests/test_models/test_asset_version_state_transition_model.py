from django.test import TestCase
from django.contrib.auth import get_user_model
from asset.models import Task, Asset, AssetVersion, AssetVersionStateTransition
from core.models import Organization, Team

User = get_user_model()


class AssetVersionStateTransitionModelTest(TestCase):
    """Test cases for AssetVersionStateTransition model"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
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
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        
        # Create test asset version
        self.version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
    
    def test_state_transition_creation(self):
        """Test basic state transition creation"""
        transition = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            from_version_status=AssetVersion.DRAFT,
            to_version_status=AssetVersion.FINALIZED,
            from_scan_status=AssetVersion.PENDING,
            to_scan_status=AssetVersion.CLEAN,
            transition_method='finalize',
            triggered_by=self.user,
            metadata={'action': 'version_finalized'}
        )
        
        self.assertEqual(transition.asset_version, self.version)
        self.assertEqual(transition.from_version_status, AssetVersion.DRAFT)
        self.assertEqual(transition.to_version_status, AssetVersion.FINALIZED)
        self.assertEqual(transition.from_scan_status, AssetVersion.PENDING)
        self.assertEqual(transition.to_scan_status, AssetVersion.CLEAN)
        self.assertEqual(transition.transition_method, 'finalize')
        self.assertEqual(transition.triggered_by, self.user)
        self.assertEqual(transition.metadata, {'action': 'version_finalized'})
        self.assertIsNotNone(transition.timestamp)
    
    def test_state_transition_string_representation(self):
        """Test state transition string representation"""
        # Test version status change only
        transition1 = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            from_version_status=AssetVersion.DRAFT,
            to_version_status=AssetVersion.FINALIZED,
            transition_method='finalize',
            triggered_by=self.user
        )
        expected1 = f"AssetVersion {self.version.id}: Draft → Finalized"
        self.assertEqual(str(transition1), expected1)
        
        # Test scan status change only
        transition2 = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            from_scan_status=AssetVersion.PENDING,
            to_scan_status=AssetVersion.CLEAN,
            transition_method='mark_clean',
            triggered_by=self.user
        )
        expected2 = f"AssetVersion {self.version.id}: pending → clean"
        self.assertEqual(str(transition2), expected2)
        
        # Test both changes
        transition3 = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            from_version_status=AssetVersion.DRAFT,
            to_version_status=AssetVersion.FINALIZED,
            from_scan_status=AssetVersion.PENDING,
            to_scan_status=AssetVersion.CLEAN,
            transition_method='finalize_and_clean',
            triggered_by=self.user
        )
        expected3 = f"AssetVersion {self.version.id}: Draft → Finalized, pending → clean"
        self.assertEqual(str(transition3), expected3)
        
        # Test no changes
        transition4 = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            transition_method='no_change',
            triggered_by=self.user
        )
        expected4 = f"AssetVersion {self.version.id}: no_change"
        self.assertEqual(str(transition4), expected4)
    
    def test_state_transition_table_name(self):
        """Test state transition table name"""
        transition = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            from_version_status=AssetVersion.DRAFT,
            to_version_status=AssetVersion.FINALIZED,
            transition_method='finalize',
            triggered_by=self.user
        )
        self.assertEqual(transition._meta.db_table, 'asset_version_state_transitions')
    
    def test_state_transition_without_triggered_by(self):
        """Test state transition without triggered_by user"""
        transition = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            from_scan_status=AssetVersion.PENDING,
            to_scan_status=AssetVersion.SCANNING,
            transition_method='start_scan'
        )
        
        self.assertIsNone(transition.triggered_by)
    
    def test_state_transition_metadata(self):
        """Test state transition metadata handling"""
        metadata = {
            'action': 'scan_infected',
            'virus_name': 'TestVirus',
            'scan_engine': 'ClamAV'
        }
        
        transition = AssetVersionStateTransition.objects.create(
            asset_version=self.version,
            from_scan_status=AssetVersion.SCANNING,
            to_scan_status=AssetVersion.INFECTED,
            transition_method='mark_infected',
            triggered_by=self.user,
            metadata=metadata
        )
        
        self.assertEqual(transition.metadata, metadata)
    
    def test_version_status_transition_logging(self):
        """Test that version status transitions are logged"""
        initial_count = AssetVersionStateTransition.objects.count()
        
        # Set scan status to clean first (required for finalization)
        self.version.start_scan()
        self.version.mark_clean()
        
        # Finalize the version
        self.version.finalize(finalized_by=self.user)
        
        # Check that transition was logged
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 3)  # start_scan + mark_clean + finalize
        
        transition = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset_version, self.version)
        self.assertEqual(transition.from_version_status, AssetVersion.DRAFT)
        self.assertEqual(transition.to_version_status, AssetVersion.FINALIZED)
        self.assertEqual(transition.transition_method, 'finalize')
        self.assertEqual(transition.triggered_by, self.user)
    
    def test_scan_status_transition_logging(self):
        """Test that scan status transitions are logged"""
        initial_count = AssetVersionStateTransition.objects.count()
        
        # Start scan
        self.version.start_scan()
        
        # Check that transition was logged
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 1)
        
        transition = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset_version, self.version)
        self.assertEqual(transition.from_scan_status, AssetVersion.PENDING)
        self.assertEqual(transition.to_scan_status, AssetVersion.SCANNING)
        self.assertEqual(transition.transition_method, 'start_scan')
        self.assertIsNone(transition.triggered_by)  # System triggered
        
        # Mark as clean
        self.version.mark_clean()
        
        # Check that another transition was logged
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 2)
        
        transition2 = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition2.asset_version, self.version)
        self.assertEqual(transition2.from_scan_status, AssetVersion.SCANNING)
        self.assertEqual(transition2.to_scan_status, AssetVersion.CLEAN)
        self.assertEqual(transition2.transition_method, 'mark_clean')
    
    def test_scan_infected_transition_logging(self):
        """Test that infected scan transitions are logged with virus name"""
        # Start scan first
        self.version.start_scan()
        
        # Mark as infected
        virus_name = "TestVirus.123"
        self.version.mark_infected(virus_name=virus_name)
        
        transition = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset_version, self.version)
        self.assertEqual(transition.from_scan_status, AssetVersion.SCANNING)
        self.assertEqual(transition.to_scan_status, AssetVersion.INFECTED)
        self.assertEqual(transition.transition_method, 'mark_infected')
        self.assertEqual(transition.metadata['virus_name'], virus_name)
    
    def test_scan_error_transition_logging(self):
        """Test that error scan transitions are logged with error message"""
        # Start scan first
        self.version.start_scan()
        
        # Mark as error
        error_message = "Scan failed: Connection timeout"
        self.version.mark_error(error_message=error_message)
        
        transition = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset_version, self.version)
        self.assertEqual(transition.from_scan_status, AssetVersion.SCANNING)
        self.assertEqual(transition.to_scan_status, AssetVersion.ERROR)
        self.assertEqual(transition.transition_method, 'mark_error')
        self.assertEqual(transition.metadata['error_message'], error_message)
    
    def test_multiple_transitions_logging(self):
        """Test that multiple transitions are logged correctly"""
        initial_count = AssetVersionStateTransition.objects.count()
        
        # Perform multiple transitions
        self.version.start_scan()
        self.version.mark_clean()
        self.version.finalize(finalized_by=self.user)
        
        # Check that all transitions were logged
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 3)
        
        # Check transitions in order
        transitions = AssetVersionStateTransition.objects.filter(
            asset_version=self.version
        ).order_by('timestamp')
        self.assertEqual(len(transitions), 3)
        
        self.assertEqual(transitions[0].transition_method, 'start_scan')
        self.assertEqual(transitions[0].from_scan_status, AssetVersion.PENDING)
        self.assertEqual(transitions[0].to_scan_status, AssetVersion.SCANNING)
        
        self.assertEqual(transitions[1].transition_method, 'mark_clean')
        self.assertEqual(transitions[1].from_scan_status, AssetVersion.SCANNING)
        self.assertEqual(transitions[1].to_scan_status, AssetVersion.CLEAN)
        
        self.assertEqual(transitions[2].transition_method, 'finalize')
        self.assertEqual(transitions[2].from_version_status, AssetVersion.DRAFT)
        self.assertEqual(transitions[2].to_version_status, AssetVersion.FINALIZED) 