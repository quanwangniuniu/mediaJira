import tempfile
import shutil

from django.test import TestCase, override_settings
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.core.exceptions import ValidationError

from asset.models import Task, Asset, AssetVersion
from core.models import Organization, Team

User = get_user_model()


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class AssetVersionModelTest(TestCase):
    """Test cases for AssetVersion model"""

    @classmethod
    def tearDownClass(cls):
        # Clean up temporary upload folder
        shutil.rmtree(settings.MEDIA_ROOT, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.task = Task.objects.create(title="Test Task", description="Test task description")
        self.organization = Organization.objects.create(name="Test Organization")
        self.team = Team.objects.create(organization=self.organization, name="Test Team")
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
        self.test_file = SimpleUploadedFile(
            "test_file.txt",
            b"test file content",
            content_type="text/plain"
        )

    def test_asset_version_creation(self):
        version = AssetVersion()
        version.create_new_version(
            file_obj=self.test_file,
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        self.assertEqual(version.asset, self.asset)
        self.assertEqual(version.version_number, 1)
        self.assertEqual(version.uploaded_by, self.user)
        self.assertEqual(version.scan_status, AssetVersion.PENDING)
        self.assertEqual(version.version_status, AssetVersion.DRAFT)
        self.assertIsNotNone(version.created_at)

    def test_asset_version_string_representation(self):
        version = AssetVersion()
        version.create_new_version(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        expected = f"Asset {self.asset.id} v1 (Draft)"
        self.assertEqual(str(version), expected)
        version.version_status = AssetVersion.FINALIZED
        version.save()
        expected_finalized = f"Asset {self.asset.id} v1 (Finalized)"
        self.assertEqual(str(version), expected_finalized)

    def test_asset_version_table_name(self):
        version = AssetVersion()
        version.create_new_version(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        self.assertEqual(version._meta.db_table, 'asset_versions')

    def test_asset_version_unique_constraint(self):
        # Create first version
        version = AssetVersion()
        version.create_new_version(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        # Finalize the first version so we can create a second one with same version number
        version.start_scan()
        version.save()
        version.mark_clean()
        version.save()
        version.finalize(finalized_by=self.user)
        version.save()
        
        # Now try to create another version with the same version number - should fail with IntegrityError
        with self.assertRaises(IntegrityError):
            new_version = AssetVersion()
            new_version.create_new_version(
                asset=self.asset,
                version_number=1,
                uploaded_by=self.user
            )

    def test_asset_version_scan_status_constants(self):
        self.assertEqual(AssetVersion.PENDING, 'pending')
        self.assertEqual(AssetVersion.SCANNING, 'scanning')
        self.assertEqual(AssetVersion.CLEAN, 'clean')
        self.assertEqual(AssetVersion.INFECTED, 'infected')
        self.assertEqual(AssetVersion.ERROR, 'error')

    def test_asset_version_status_helpers(self):
        version = AssetVersion()
        version.create_new_version(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        self.assertTrue(version.is_draft())
        self.assertFalse(version.is_finalized())
        self.assertFalse(version.can_be_finalized())  # scan_status is not CLEAN
        
        # Use proper transition methods
        version.start_scan()
        version.mark_clean()
        self.assertTrue(version.can_be_finalized())
        
        version.finalize(finalized_by=self.user)
        self.assertTrue(version.is_finalized())
        self.assertFalse(version.is_draft())

    def test_asset_version_scan_status_helpers(self):
        version = AssetVersion()
        version.create_new_version(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        self.assertTrue(version.can_start_scan())
        
        # Use proper transition methods
        version.start_scan()
        self.assertTrue(version.can_mark_clean())
        self.assertTrue(version.can_mark_infected())
        self.assertTrue(version.can_mark_error())
        
        version.mark_error(error_message="Test error")
        self.assertFalse(version.can_start_scan())
        self.assertFalse(version.can_mark_clean())
        self.assertFalse(version.can_mark_infected())
        self.assertFalse(version.can_mark_error())

    def test_asset_version_get_file_name(self):
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=self.test_file,
            uploaded_by=self.user
        )
        file_name = version.get_file_name()
        self.assertIsNotNone(file_name)
        # Django adds random suffix to avoid filename conflicts
        # So we check if the filename starts with "test_file" and ends with ".txt"
        self.assertTrue(file_name.startswith("assets/"))
        self.assertIn("test_file", file_name)
        self.assertTrue(file_name.endswith(".txt"))

    def test_asset_version_get_file_url(self):
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=self.test_file,
            uploaded_by=self.user
        )
        file_url = version.get_file_url()
        self.assertIsNotNone(file_url)
        self.assertIn("test_file", file_url)

        # Test with no file - use the same version but remove file
        version.file = None
        version.save()
        self.assertIsNone(version.get_file_url())

    def test_asset_version_get_file_url_none(self):
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        self.assertIsNone(version.get_file_url())

    def test_asset_version_calculate_checksum(self):
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            file=self.test_file,
            uploaded_by=self.user
        )
        checksum = version.compute_checksum(self.test_file)
        self.assertIsNotNone(checksum)
        self.assertEqual(len(checksum), 64)
        self.assertEqual(checksum, version.compute_checksum(self.test_file))

    def test_finalize_only_when_clean(self):
        """Test that finalize() can only be called when scan_status is CLEAN"""
        # Test with PENDING status
        asset1 = Asset.objects.create(task=self.task, owner=self.user, status=Asset.NOT_SUBMITTED)
        pending_version = AssetVersion.objects.create(
            asset=asset1,
            version_number=1,
            uploaded_by=self.user
        )
        self.assertFalse(pending_version.can_be_finalized())
        with self.assertRaises(ValidationError):
            pending_version.finalize(finalized_by=self.user)

        # Test with SCANNING status
        asset2 = Asset.objects.create(task=self.task, owner=self.user, status=Asset.NOT_SUBMITTED)
        scanning_version = AssetVersion.objects.create(
            asset=asset2,
            version_number=1,
            uploaded_by=self.user
        )
        scanning_version.start_scan()
        self.assertFalse(scanning_version.can_be_finalized())
        with self.assertRaises(ValidationError):
            scanning_version.finalize(finalized_by=self.user)

        # Test with INFECTED status
        asset3 = Asset.objects.create(task=self.task, owner=self.user, status=Asset.NOT_SUBMITTED)
        infected_version = AssetVersion.objects.create(
            asset=asset3,
            version_number=1,
            uploaded_by=self.user
        )
        infected_version.start_scan()
        infected_version.mark_infected(virus_name="TestVirus")
        self.assertFalse(infected_version.can_be_finalized())
        with self.assertRaises(ValidationError):
            infected_version.finalize(finalized_by=self.user)

        # Test with ERROR status
        asset4 = Asset.objects.create(task=self.task, owner=self.user, status=Asset.NOT_SUBMITTED)
        error_version = AssetVersion.objects.create(
            asset=asset4,
            version_number=1,
            uploaded_by=self.user
        )
        error_version.start_scan()
        error_version.mark_error(error_message="Test error")
        self.assertFalse(error_version.can_be_finalized())
        with self.assertRaises(ValidationError):
            error_version.finalize(finalized_by=self.user)

        # Test with CLEAN status - should be able to finalize
        asset5 = Asset.objects.create(task=self.task, owner=self.user, status=Asset.NOT_SUBMITTED)
        clean_version = AssetVersion()
        clean_version.create_new_version(
            asset=asset5,
            version_number=1,
            uploaded_by=self.user
        )
        clean_version.start_scan()
        clean_version.save()
        clean_version.mark_clean()
        clean_version.save()
        self.assertTrue(clean_version.can_be_finalized())
        clean_version.finalize(finalized_by=self.user)
        clean_version.save()
        self.assertEqual(clean_version.version_status, AssetVersion.FINALIZED)

    def test_scan_status_transitions(self):
        """Test scan status transitions and their logging"""
        from asset.models import AssetVersionStateTransition
        
        version = AssetVersion()
        version.create_new_version(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        initial_count = AssetVersionStateTransition.objects.count()
        
        # Test start_scan transition
        version.start_scan()
        self.assertEqual(version.scan_status, AssetVersion.SCANNING)
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 1)
        
        # Test mark_clean transition
        version.mark_clean()
        self.assertEqual(version.scan_status, AssetVersion.CLEAN)
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 2)
        
        # Test finalize transition (should work now that scan_status is CLEAN)
        version.finalize(finalized_by=self.user)
        self.assertEqual(version.version_status, AssetVersion.FINALIZED)
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 3)

    def test_scan_infected_transition(self):
        """Test mark_infected transition with virus name"""
        from asset.models import AssetVersionStateTransition
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        # Start scan first
        version.start_scan()
        
        # Mark as infected with virus name
        virus_name = "TestVirus.123"
        version.mark_infected(virus_name=virus_name)
        self.assertEqual(version.scan_status, AssetVersion.INFECTED)
        
        # Check that transition was logged with virus name
        transition = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'mark_infected')
        self.assertEqual(transition.metadata['virus_name'], virus_name)

    def test_scan_error_transition(self):
        """Test mark_error transition with error message"""
        from asset.models import AssetVersionStateTransition
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        # Start scan first
        version.start_scan()
        
        # Mark as error with error message
        error_message = "Scan failed: Connection timeout"
        version.mark_error(error_message=error_message)
        self.assertEqual(version.scan_status, AssetVersion.ERROR)
        
        # Check that transition was logged with error message
        transition = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.transition_method, 'mark_error')
        self.assertEqual(transition.metadata['error_message'], error_message)

    def test_invalid_scan_transitions(self):
        """Test that invalid scan transitions are prevented"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        # Cannot mark_clean from PENDING state
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.mark_clean()
        
        # Cannot mark_infected from PENDING state
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.mark_infected()
        
        # Cannot mark_error from PENDING state
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.mark_error()
        
        # Start scan to get to SCANNING state
        version.start_scan()
        
        # Cannot start_scan from SCANNING state
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.start_scan()
        
        # Mark as clean to get to CLEAN state
        version.mark_clean()
        
        # Cannot perform scan transitions from CLEAN state
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.start_scan()
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.mark_clean()
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.mark_infected()
        with self.assertRaises(Exception):  # FSM will prevent transition
            version.mark_error()

    def test_version_status_transition_logging(self):
        """Test that version status transitions are properly logged"""
        from asset.models import AssetVersionStateTransition
        
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        # Set scan_status to CLEAN so we can finalize
        version.scan_status = AssetVersion.CLEAN
        version.save()
        
        initial_count = AssetVersionStateTransition.objects.count()
        
        # Finalize the version
        version.finalize(finalized_by=self.user)
        
        # Check that transition was logged
        self.assertEqual(AssetVersionStateTransition.objects.count(), initial_count + 1)
        
        transition = AssetVersionStateTransition.objects.latest('timestamp')
        self.assertEqual(transition.asset_version, version)
        self.assertEqual(transition.from_version_status, AssetVersion.DRAFT)
        self.assertEqual(transition.to_version_status, AssetVersion.FINALIZED)
        self.assertEqual(transition.transition_method, 'finalize')
        self.assertEqual(transition.triggered_by, self.user)
        self.assertEqual(transition.metadata['action'], 'version_finalized')


class AssetVersionDeleteTest(TestCase):
    """Test AssetVersion delete functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title='Test Task',
            description='Test task description'
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_delete_draft_version_success(self):
        """Test that draft version can be deleted successfully"""
        # Create a draft version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Verify version exists
        self.assertTrue(AssetVersion.objects.filter(id=version.id).exists())
        
        # Delete the version
        version.delete()
        
        # Verify version is deleted
        self.assertFalse(AssetVersion.objects.filter(id=version.id).exists())
    
    def test_delete_finalized_version_fails(self):
        """Test that finalized version cannot be deleted"""
        # Create a finalized version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Verify version exists
        self.assertTrue(AssetVersion.objects.filter(id=version.id).exists())
        
        # Try to delete the version - should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            version.delete()
        
        # Verify error message
        self.assertIn("Cannot delete a finalized version", str(context.exception))
        
        # Verify version still exists
        self.assertTrue(AssetVersion.objects.filter(id=version.id).exists())
    
    def test_can_be_deleted_method(self):
        """Test the can_be_deleted helper method"""
        # Create draft version
        draft_version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Create finalized version
        finalized_version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=2,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Test can_be_deleted method
        self.assertTrue(draft_version.can_be_deleted())
        self.assertFalse(finalized_version.can_be_deleted())
    
    def test_validate_can_be_deleted_method(self):
        """Test the validate_can_be_deleted helper method"""
        # Create finalized version
        finalized_version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Test validate_can_be_deleted method - should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            finalized_version.validate_can_be_deleted()
        
        # Verify error message
        self.assertIn("Cannot delete a finalized version", str(context.exception))


class AssetVersionStateTransitionTest(TestCase):
    """Test AssetVersion state transitions"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.task = Task.objects.create(
            title='Test Task',
            description='Test task description'
        )
        
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_finalize_version_success(self):
        """Test successful version finalization"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        
        # Finalize the version
        version.finalize(finalized_by=self.user)
        
        # Check version status changed
        self.assertEqual(version.version_status, AssetVersion.FINALIZED)
        
        # Check transition was logged
        transition = version.state_transitions.first()
        self.assertIsNotNone(transition)
        self.assertEqual(transition.transition_method, 'finalize')
        self.assertEqual(transition.triggered_by, self.user)
        self.assertEqual(transition.metadata['action'], 'version_finalized')
    
    def test_finalize_version_fails_wrong_status(self):
        """Test finalization fails when version is not in Draft status"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Try to finalize already finalized version - should fail
        with self.assertRaises(Exception):  # FSM will prevent this
            version.finalize(finalized_by=self.user)
    
    def test_finalize_version_fails_wrong_scan_status(self):
        """Test finalization fails when scan status is not Clean"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Try to finalize version with pending scan - should fail
        with self.assertRaises(Exception):  # FSM will prevent this
            version.finalize(finalized_by=self.user)


class AssetVersionScanStatusTest(TestCase):
    """Test AssetVersion scan status transitions"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.task = Task.objects.create(
            title='Test Task',
            description='Test task description'
        )
        
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_scan_status_transitions(self):
        """Test scan status transitions"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Start scan
        version.start_scan()
        self.assertEqual(version.scan_status, AssetVersion.SCANNING)
        
        # Mark as clean
        version.mark_clean()
        self.assertEqual(version.scan_status, AssetVersion.CLEAN)
    
    def test_mark_infected(self):
        """Test marking version as infected"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.SCANNING
        )
        
        virus_name = "TestVirus"
        version.mark_infected(virus_name=virus_name)
        
        self.assertEqual(version.scan_status, AssetVersion.INFECTED)
        
        # Check transition was logged with virus name
        transition = version.state_transitions.first()
        self.assertEqual(transition.metadata['virus_name'], virus_name)
    
    def test_mark_error(self):
        """Test marking scan as error"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.SCANNING
        )
        
        error_message = "Scan failed due to timeout"
        version.mark_error(error_message=error_message)
        
        self.assertEqual(version.scan_status, AssetVersion.ERROR)
        
        # Check transition was logged with error message
        transition = version.state_transitions.first()
        self.assertEqual(transition.metadata['error_message'], error_message)


class AssetVersionHelperMethodsTest(TestCase):
    """Test AssetVersion helper methods"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.task = Task.objects.create(
            title='Test Task',
            description='Test task description'
        )
        
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_can_be_finalized(self):
        """Test can_be_finalized method"""
        # Draft + Clean = can be finalized
        version1 = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN
        )
        self.assertTrue(version1.can_be_finalized())
        
        # Draft + Pending = cannot be finalized
        version2 = AssetVersion.objects.create(
            asset=self.asset,
            version_number=2,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        self.assertFalse(version2.can_be_finalized())
        
        # Finalized + Clean = cannot be finalized (on a new asset)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        version3 = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        self.assertFalse(version3.can_be_finalized())
    
    def test_scan_status_helper_methods(self):
        """Test scan status helper methods"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Test can_start_scan
        self.assertTrue(version.can_start_scan())
        
        # Start scan
        version.start_scan()
        self.assertFalse(version.can_start_scan())
        self.assertTrue(version.can_mark_clean())
        self.assertTrue(version.can_mark_infected())
        self.assertTrue(version.can_mark_error())
        
        # Mark as clean
        version.mark_clean()
        self.assertFalse(version.can_mark_clean())
        self.assertFalse(version.can_mark_infected())
        self.assertFalse(version.can_mark_error())
    
    def test_version_status_helper_methods(self):
        """Test version status helper methods"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Test is_draft
        self.assertTrue(version.is_draft())
        self.assertFalse(version.is_finalized())
        
        # Set scan status to clean first, then finalize
        version.start_scan()
        version.mark_clean()
        version.finalize(finalized_by=self.user)
        
        # Test is_finalized
        self.assertFalse(version.is_draft())
        self.assertTrue(version.is_finalized())
    
    def test_can_be_updated(self):
        """Test can_be_updated method"""
        # Draft version can be updated
        draft_version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        self.assertTrue(draft_version.can_be_updated())
        
        # Finalized version cannot be updated (on a new asset)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        finalized_version = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        self.assertFalse(finalized_version.can_be_updated())
    
    def test_validate_can_be_updated(self):
        """Test validate_can_be_updated method"""
        finalized_version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            finalized_version.validate_can_be_updated()
        
        self.assertIn("Cannot update a finalized version", str(context.exception))


class AssetVersionFileMethodsTest(TestCase):
    """Test AssetVersion file-related methods"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.task = Task.objects.create(
            title='Test Task',
            description='Test task description'
        )
        
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_get_file_url_and_name(self):
        """Test get_file_url and get_file_name methods"""
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # No file uploaded
        self.assertIsNone(version.get_file_url())
        self.assertIsNone(version.get_file_name())
        
        # With file (mock)
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("test.txt", b"test content")
        version.file = test_file
        
        # Should have file URL and name
        self.assertIsNotNone(version.get_file_url())
        self.assertIsNotNone(version.get_file_name())
    
    def test_can_be_scanned(self):
        """Test can_be_scanned method"""
        # Version without file
        version1 = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        self.assertFalse(version1.can_be_scanned())
        
        # Version with file (on a new asset)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("test.txt", b"test content")
        version2 = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING,
            file=test_file
        )
        self.assertTrue(version2.can_be_scanned())
    
    def test_requires_scan(self):
        """Test requires_scan method"""
        # Version with PENDING scan status
        version1 = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        self.assertFalse(version1.requires_scan())  # No file
        
        # Version with file and PENDING scan status (on a new asset)
        new_asset1 = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("test.txt", b"test content")
        version2 = AssetVersion.objects.create(
            asset=new_asset1,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING,
            file=test_file
        )
        self.assertTrue(version2.requires_scan())
        
        # Version with CLEAN scan status (on a new asset)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        version3 = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.CLEAN,
            file=test_file
        )
        self.assertFalse(version3.requires_scan())
    
    def test_calculate_checksum(self):
        """Test calculate_checksum method"""
        # Version without file
        version1 = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        self.assertIsNone(version1.compute_checksum(None))
        
        # Version with file
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_content = b"test content for checksum"
        test_file = SimpleUploadedFile("test.txt", test_content)
        version2 = AssetVersion.objects.create(
            asset=self.asset,
            version_number=2,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING,
            file=test_file
        )
        
        checksum = version2.compute_checksum(test_file)
        self.assertIsNotNone(checksum)
        self.assertEqual(len(checksum), 64)  # SHA-256 hash length

    def test_checksum_same_for_identical_files(self):
        """Test that identical file contents produce the same checksum"""
        file_content = b"hello world"
        file1 = SimpleUploadedFile("file1.txt", file_content)
        file2 = SimpleUploadedFile("file2.txt", file_content)
        version1 = AssetVersion()
        version1.create_new_version(file_obj=file1, asset=self.asset, version_number=1, uploaded_by=self.user)
        
        # Create second version on a new asset
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        version2 = AssetVersion()
        version2.create_new_version(file_obj=file2, asset=new_asset, version_number=1, uploaded_by=self.user)
        self.assertEqual(version1.checksum, version2.checksum)

    def test_checksum_differs_for_different_files(self):
        """Test that different file contents produce different checksums"""
        file1 = SimpleUploadedFile("file1.txt", b"hello world")
        file2 = SimpleUploadedFile("file2.txt", b"goodbye world")
        version1 = AssetVersion()
        version1.create_new_version(file_obj=file1, asset=self.asset, version_number=1, uploaded_by=self.user)
        
        # Create second version on a new asset
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        version2 = AssetVersion()
        version2.create_new_version(file_obj=file2, asset=new_asset, version_number=1, uploaded_by=self.user)
        self.assertNotEqual(version1.checksum, version2.checksum)


class AssetVersionUpdateTest(TestCase):
    """Test AssetVersion update restrictions"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.task = Task.objects.create(
            title='Test Task',
            description='Test task description'
        )
        
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_update_draft_version_success(self):
        """Test that draft version can be updated successfully"""
        # Create a draft version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Verify version exists and is draft
        self.assertEqual(version.version_status, AssetVersion.DRAFT)
        self.assertTrue(version.can_be_updated())
        
        # Update the version (simulate file upload)
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("updated_test.txt", b"updated content")
        version.file = test_file
        version.save()
        
        # Verify update was successful
        version.refresh_from_db()
        self.assertTrue(version.file)
        # Check that the file was updated (filename might be modified by Django)
        self.assertIsNotNone(version.get_original_file_name())
        self.assertIn("updated", version.get_original_file_name())
    
    def test_update_finalized_version_fails(self):
        """Test that finalized version cannot be updated"""
        # Create a finalized version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Verify version exists and is finalized
        self.assertEqual(version.version_status, AssetVersion.FINALIZED)
        self.assertFalse(version.can_be_updated())
        
        # Try to update the version - should raise ValidationError
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("updated_test.txt", b"updated content")
        
        with self.assertRaises(ValidationError) as context:
            version.update_with_file(test_file)
        
        # Verify error message
        self.assertIn("Cannot update a finalized version", str(context.exception))
        
        # Verify version was not updated
        version.refresh_from_db()
        self.assertFalse(version.file)
    
    def test_can_be_updated_method(self):
        """Test the can_be_updated helper method"""
        # Create draft version
        draft_version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Test can_be_updated method for draft version
        self.assertTrue(draft_version.can_be_updated())
        
        # Finalize the first version (set scan status to clean first)
        draft_version.start_scan()
        draft_version.mark_clean()
        draft_version.finalize(finalized_by=self.user)
        
        # Now create a new version on a new asset (since the first one is finalized)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        new_version = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Test can_be_updated method for new draft version
        self.assertTrue(new_version.can_be_updated())
        
        # Finalize the second version
        new_version.start_scan()
        new_version.mark_clean()
        new_version.finalize(finalized_by=self.user)
        
        # Test can_be_updated method for finalized version
        self.assertFalse(new_version.can_be_updated())
    
    def test_validate_can_be_updated_method(self):
        """Test the validate_can_be_updated helper method"""
        # Create finalized version
        finalized_version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Test validate_can_be_updated method - should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            finalized_version.validate_can_be_updated()
        
        # Verify error message
        self.assertIn("Cannot update a finalized version", str(context.exception))
    
    def test_update_checksum_field(self):
        """Test updating checksum field on draft version"""
        # Create a draft version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Update checksum
        version.checksum = "test_checksum_123"
        version.save()
        
        # Verify update was successful
        version.refresh_from_db()
        self.assertEqual(version.checksum, "test_checksum_123")
    
    def test_update_finalized_version_checksum_fails(self):
        """Test that finalized version cannot have checksum updated"""
        # Create a finalized version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Try to update checksum - should raise ValidationError
        with self.assertRaises(ValidationError) as context:
            version.validate_can_be_updated()
        
        # Verify error message
        self.assertIn("Cannot update a finalized version", str(context.exception))
        
        # Verify checksum was not updated
        version.refresh_from_db()
        self.assertNotEqual(version.checksum, "updated_checksum_456")
    
    def test_update_multiple_fields_draft_version(self):
        """Test updating multiple fields on draft version"""
        # Create a draft version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.DRAFT,
            scan_status=AssetVersion.PENDING
        )
        
        # Update multiple fields using update_with_file
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("multi_update.txt", b"multi update content")
        version.update_with_file(test_file)
        
        # Verify all updates were successful
        version.refresh_from_db()
        self.assertTrue(version.file)
        # Checksum should be calculated from file content
        expected_checksum = version.compute_checksum(test_file)
        self.assertEqual(version.checksum, expected_checksum)
    
    def test_update_multiple_fields_finalized_version_fails(self):
        """Test that finalized version cannot have multiple fields updated"""
        # Create a finalized version
        version = AssetVersion.objects.create(
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user,
            version_status=AssetVersion.FINALIZED,
            scan_status=AssetVersion.CLEAN
        )
        
        # Try to update multiple fields - should raise ValidationError
        from django.core.files.uploadedfile import SimpleUploadedFile
        test_file = SimpleUploadedFile("multi_update.txt", b"multi update content")
        
        with self.assertRaises(ValidationError) as context:
            version.update_with_file(test_file)
        
        # Verify error message
        self.assertIn("Cannot update a finalized version", str(context.exception))
        
        # Verify no fields were updated
        version.refresh_from_db()
        self.assertFalse(version.file)

    def test_update_same_file_checksum_unchanged(self):
        """Test that updating with the same file content raises ValidationError"""
        file_content = b"hello world"
        file1 = SimpleUploadedFile("file1.txt", file_content)
        version = AssetVersion()
        version.create_new_version(file_obj=file1, asset=self.asset, version_number=1, uploaded_by=self.user)

        # Get original checksum
        original_checksum = version.checksum
        self.assertIsNotNone(original_checksum)

        # Update with same content but different filename - should raise ValidationError
        file2 = SimpleUploadedFile("file2.txt", file_content)
        with self.assertRaises(ValidationError):
            version.update_with_file(file2)

    def test_update_different_file_checksum_changes(self):
        """Test that updating with different file content changes checksum"""
        file1 = SimpleUploadedFile("file1.txt", b"hello world")
        version = AssetVersion()
        version.create_new_version(file_obj=file1, asset=self.asset, version_number=1, uploaded_by=self.user)
        
        # Get original checksum
        original_checksum = version.checksum
        self.assertIsNotNone(original_checksum)
        
        # Update with different content using update_with_file
        file2 = SimpleUploadedFile("file2.txt", b"goodbye world")
        version.update_with_file(file2)
        
        # Checksum should be different
        self.assertNotEqual(version.checksum, original_checksum)

    def test_file_content_changed_flag(self):
        """Test that _file_content_changed flag is set correctly"""
        # Create version with file
        file_content = b"hello world"
        file1 = SimpleUploadedFile("file1.txt", file_content)
        version = AssetVersion()
        version.create_new_version(
            file_obj=file1,
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        # New version should have file_content_changed = True
        self.assertTrue(hasattr(version, '_file_content_changed'))
        self.assertTrue(version._file_content_changed)
        
        # Update with same content - should raise ValidationError
        file2 = SimpleUploadedFile("file2.txt", file_content)
        with self.assertRaises(ValidationError):
            version.update_with_file(file2)
        
        # Update with different content - should set _file_content_changed = True
        file3 = SimpleUploadedFile("file3.txt", b"different content")
        version.update_with_file(file3)
        self.assertTrue(version._file_content_changed)

    def test_is_file_unchanged_helper(self):
        """Test the is_file_unchanged helper method"""
        # Create version with file
        file_content = b"hello world"
        file1 = SimpleUploadedFile("file1.txt", file_content)
        version = AssetVersion()
        version.create_new_version(
            file_obj=file1,
            asset=self.asset,
            version_number=1,
            uploaded_by=self.user
        )
        
        # Test with same content
        file2 = SimpleUploadedFile("file2.txt", file_content)
        self.assertTrue(version.is_file_unchanged(file2))
        
        # Test with different content
        file3 = SimpleUploadedFile("file3.txt", b"different content")
        self.assertFalse(version.is_file_unchanged(file3))
        
        # Test with version that has no checksum (on a new asset)
        new_asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            status=Asset.NOT_SUBMITTED
        )
        version_no_checksum = AssetVersion.objects.create(
            asset=new_asset,
            version_number=1,
            uploaded_by=self.user
        )
        self.assertFalse(version_no_checksum.is_file_unchanged(file1))
