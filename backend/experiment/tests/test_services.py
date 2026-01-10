"""
Test cases for experiment services
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from experiment.models import Experiment
from experiment.services import ExperimentService
from task.models import Task
from core.models import Organization, Project

User = get_user_model()


class ExperimentServiceTest(TestCase):
    """Test cases for ExperimentService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.organization = Organization.objects.create(name="Test Organization")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        self.task = Task.objects.create(
            summary='Test Experiment Task',
            type='experiment',
            project=self.project,
            owner=self.user
        )
        
        self.experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            status=Experiment.ExperimentStatus.DRAFT,
            task=self.task,
            created_by=self.user
        )
    
    def test_check_experiment_exists(self):
        """Test check_experiment_exists method"""
        # Test existing experiment
        result = ExperimentService.check_experiment_exists(self.experiment.id)
        self.assertEqual(result, self.experiment)
        
        # Test non-existent experiment
        result = ExperimentService.check_experiment_exists(99999)
        self.assertIsNone(result)
    
    def test_validate_experiment_status_transition_draft_to_running(self):
        """Test status transition from DRAFT to RUNNING"""
        is_valid, error_message = ExperimentService.validate_experiment_status_transition(
            Experiment.ExperimentStatus.DRAFT,
            Experiment.ExperimentStatus.RUNNING
        )
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_validate_experiment_status_transition_running_to_paused(self):
        """Test status transition from RUNNING to PAUSED"""
        is_valid, error_message = ExperimentService.validate_experiment_status_transition(
            Experiment.ExperimentStatus.RUNNING,
            Experiment.ExperimentStatus.PAUSED
        )
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_validate_experiment_status_transition_paused_to_running(self):
        """Test status transition from PAUSED to RUNNING"""
        is_valid, error_message = ExperimentService.validate_experiment_status_transition(
            Experiment.ExperimentStatus.PAUSED,
            Experiment.ExperimentStatus.RUNNING
        )
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_validate_experiment_status_transition_running_to_completed(self):
        """Test status transition from RUNNING to COMPLETED"""
        is_valid, error_message = ExperimentService.validate_experiment_status_transition(
            Experiment.ExperimentStatus.RUNNING,
            Experiment.ExperimentStatus.COMPLETED
        )
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_validate_experiment_status_transition_invalid_transition(self):
        """Test invalid status transition"""
        is_valid, error_message = ExperimentService.validate_experiment_status_transition(
            Experiment.ExperimentStatus.COMPLETED,
            Experiment.ExperimentStatus.RUNNING
        )
        
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_message)
    
    def test_validate_experiment_status_transition_same_status(self):
        """Test status transition to same status (should be valid)"""
        is_valid, error_message = ExperimentService.validate_experiment_status_transition(
            Experiment.ExperimentStatus.RUNNING,
            Experiment.ExperimentStatus.RUNNING
        )
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_start_experiment_success(self):
        """Test starting an experiment successfully"""
        self.experiment.status = Experiment.ExperimentStatus.RUNNING
        self.experiment.save()
        
        success, error_message = ExperimentService.start_experiment(self.experiment)
        
        self.assertTrue(success)
        self.assertIsNone(error_message)
        self.experiment.refresh_from_db()
        self.assertIsNotNone(self.experiment.started_at)
    
    def test_start_experiment_wrong_status(self):
        """Test starting an experiment with wrong status"""
        self.experiment.status = Experiment.ExperimentStatus.DRAFT
        self.experiment.save()
        
        success, error_message = ExperimentService.start_experiment(self.experiment)
        
        self.assertFalse(success)
        self.assertIsNotNone(error_message)
    
    def test_start_experiment_already_started(self):
        """Test starting an experiment that is already started"""
        self.experiment.status = Experiment.ExperimentStatus.RUNNING
        self.experiment.started_at = timezone.now()
        self.experiment.save()
        
        success, error_message = ExperimentService.start_experiment(self.experiment)
        
        self.assertFalse(success)
        self.assertIsNotNone(error_message)
    
    def test_validate_experiment_outcome_success(self):
        """Test validating experiment outcome when status is completed"""
        self.experiment.status = Experiment.ExperimentStatus.COMPLETED
        self.experiment.save()
        
        is_valid, error_message = ExperimentService.validate_experiment_outcome(
            self.experiment,
            Experiment.ExperimentOutcome.WIN,
            'Test notes'
        )
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_validate_experiment_outcome_wrong_status(self):
        """Test validating experiment outcome when status is not completed"""
        self.experiment.status = Experiment.ExperimentStatus.RUNNING
        self.experiment.save()
        
        is_valid, error_message = ExperimentService.validate_experiment_outcome(
            self.experiment,
            Experiment.ExperimentOutcome.WIN,
            'Test notes'
        )
        
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_message)
    
    def test_validate_control_variant_groups_valid(self):
        """Test validating valid control and variant groups"""
        control_group = {'campaigns': ['fb:123456'], 'ad_set_ids': ['fb:789']}
        variant_group = {'campaigns': ['fb:654321'], 'ad_ids': ['fb:101']}
        
        is_valid, error_message = ExperimentService.validate_control_variant_groups(
            control_group,
            variant_group
        )
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_validate_control_variant_groups_invalid_structure(self):
        """Test validating invalid control/variant group structure"""
        control_group = ['invalid', 'list']  # Should be dict
        
        is_valid, error_message = ExperimentService.validate_control_variant_groups(
            control_group,
            None
        )
        
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_message)
    
    def test_validate_control_variant_groups_missing_keys(self):
        """Test validating control/variant groups with missing keys"""
        control_group = {}  # Empty dict, should have at least one key
        
        is_valid, error_message = ExperimentService.validate_control_variant_groups(
            control_group,
            None
        )
        
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_message)
    
    def test_validate_control_variant_groups_invalid_id_format(self):
        """Test validating control/variant groups with invalid ID format"""
        control_group = {'campaigns': ['invalid-id']}  # Invalid format
        
        is_valid, error_message = ExperimentService.validate_control_variant_groups(
            control_group,
            None
        )
        
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_message)
    
    def test_validate_campaign_ids_valid(self):
        """Test validating valid campaign IDs"""
        ids_list = ['fb:123456', 'tt:789012']
        
        is_valid, error_message = ExperimentService.validate_campaign_ids(ids_list)
        
        self.assertTrue(is_valid)
        self.assertIsNone(error_message)
    
    def test_validate_campaign_ids_invalid_format(self):
        """Test validating invalid campaign ID format"""
        ids_list = ['invalid-id', 'fb:123456']
        
        is_valid, error_message = ExperimentService.validate_campaign_ids(ids_list)
        
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_message)
    
    def test_validate_campaign_ids_not_list(self):
        """Test validating campaign IDs that are not a list"""
        ids_list = 'fb:123456'  # Should be list
        
        is_valid, error_message = ExperimentService.validate_campaign_ids(ids_list)
        
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_message)

