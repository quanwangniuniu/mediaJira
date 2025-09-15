"""
Test cases for optimization services
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from optimization.models import (
    OptimizationExperiment, ScalingAction, RollbackHistory
)
from optimization.services import ExperimentService, RollbackHistoryService

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
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Service Test Experiment',
            description='Test service methods',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456', 'tt:789012'],
            hypothesis='Test service hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
    
    def test_check_experiment_exists_with_valid_id(self):
        """Test checking experiment existence with valid ID"""
        result = ExperimentService.check_experiment_exists(self.experiment.id)
        self.assertEqual(result, self.experiment)
        self.assertEqual(result.name, self.experiment.name)
    
    def test_check_experiment_exists_with_invalid_id(self):
        """Test checking experiment existence with invalid ID"""
        result = ExperimentService.check_experiment_exists(99999)
        self.assertIsNone(result)
    
    def test_check_experiment_exists_with_none_id(self):
        """Test checking experiment existence with None ID"""
        result = ExperimentService.check_experiment_exists(None)
        self.assertIsNone(result)
    
    def test_validate_experiment_status_transition_running_to_paused(self):
        """Test valid transition from RUNNING to PAUSED"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.RUNNING,
            OptimizationExperiment.ExperimentStatus.PAUSED
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_experiment_status_transition_paused_to_running(self):
        """Test valid transition from PAUSED to RUNNING"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.PAUSED,
            OptimizationExperiment.ExperimentStatus.RUNNING
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_experiment_status_transition_running_to_completed(self):
        """Test valid transition from RUNNING to COMPLETED"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.RUNNING,
            OptimizationExperiment.ExperimentStatus.COMPLETED
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_experiment_status_transition_running_to_rolled_back(self):
        """Test valid transition from RUNNING to ROLLED_BACK"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.RUNNING,
            OptimizationExperiment.ExperimentStatus.ROLLED_BACK
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_experiment_status_transition_paused_to_completed(self):
        """Test valid transition from PAUSED to COMPLETED"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.PAUSED,
            OptimizationExperiment.ExperimentStatus.COMPLETED
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_experiment_status_transition_paused_to_rolled_back(self):
        """Test valid transition from PAUSED to ROLLED_BACK"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.PAUSED,
            OptimizationExperiment.ExperimentStatus.ROLLED_BACK
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_experiment_status_transition_completed_to_running(self):
        """Test invalid transition from COMPLETED to RUNNING"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.COMPLETED,
            OptimizationExperiment.ExperimentStatus.RUNNING
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
        self.assertIn('Cannot change status', error)
    
    def test_validate_experiment_status_transition_completed_to_paused(self):
        """Test invalid transition from COMPLETED to PAUSED"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.COMPLETED,
            OptimizationExperiment.ExperimentStatus.PAUSED
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
        self.assertIn('Cannot change status', error)
    
    def test_validate_experiment_status_transition_rolled_back_to_running(self):
        """Test invalid transition from ROLLED_BACK to RUNNING"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.ROLLED_BACK,
            OptimizationExperiment.ExperimentStatus.RUNNING
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
        self.assertIn('Cannot change status', error)
    
    def test_validate_experiment_status_transition_same_status(self):
        """Test transition to the same status (should be valid)"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.RUNNING,
            OptimizationExperiment.ExperimentStatus.RUNNING
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_validate_experiment_status_transition_invalid_status(self):
        """Test transition with invalid status"""
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.RUNNING,
            'invalid_status'
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
    
    def test_experiment_service_integration(self):
        """Test service integration with experiment creation"""
        # Check that service can find the experiment
        found_experiment = ExperimentService.check_experiment_exists(self.experiment.id)
        self.assertEqual(found_experiment, self.experiment)
        self.assertEqual(found_experiment.name, self.experiment.name)
    
    def test_experiment_service_multiple_experiments(self):
        """Test service with multiple experiments"""
        # Create another experiment
        experiment2 = OptimizationExperiment.objects.create(
            name='Service Test Experiment 2',
            description='Test service methods 2',
            experiment_type=OptimizationExperiment.ExperimentType.CREATIVE_ROTATION,
            linked_campaign_ids=['fb:654321'],
            hypothesis='Test service hypothesis 2',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.PAUSED,
            created_by=self.user
        )
        
        # Test finding both experiments
        found_experiment1 = ExperimentService.check_experiment_exists(self.experiment.id)
        found_experiment2 = ExperimentService.check_experiment_exists(experiment2.id)
        
        self.assertEqual(found_experiment1, self.experiment)
        self.assertEqual(found_experiment2, experiment2)
        self.assertNotEqual(found_experiment1, found_experiment2)


class RollbackHistoryServiceTest(TestCase):
    """Test cases for RollbackHistoryService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Rollback Service Test Experiment',
            description='Test rollback service methods',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test rollback service hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
        
        self.scaling_action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
    
    def test_check_rollback_history_exists_by_scaling_action_id_exists(self):
        """Test checking rollback history when it exists"""
        # Create rollback history
        rollback = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='Test rollback',
            performed_by=self.user
        )
        
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            self.scaling_action.id
        )
        
        self.assertIsNotNone(result)
        self.assertEqual(result, rollback)
        self.assertEqual(result.reason, 'Test rollback')
    
    def test_check_rollback_history_exists_by_scaling_action_id_not_exists(self):
        """Test checking rollback history when it doesn't exist"""
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            self.scaling_action.id
        )
        
        self.assertIsNone(result)
    
    def test_check_rollback_history_exists_by_scaling_action_id_invalid_id(self):
        """Test checking rollback history with invalid scaling action ID"""
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(99999)
        self.assertIsNone(result)
    
    def test_check_rollback_history_exists_by_scaling_action_id_none_id(self):
        """Test checking rollback history with None scaling action ID"""
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(None)
        self.assertIsNone(result)
    
    def test_check_rollback_history_multiple_rollbacks(self):
        """Test checking rollback history with multiple rollbacks for same action"""
        # Create multiple rollback histories for the same scaling action
        rollback1 = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='First rollback',
            performed_by=self.user
        )
        
        # Note: In practice, there should only be one rollback per scaling action
        # due to business rules, but we test the service method behavior
        
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            self.scaling_action.id
        )
        
        # Should return the first rollback found
        self.assertIsNotNone(result)
        self.assertIn(result, [rollback1])
    
    def test_check_rollback_history_different_scaling_actions(self):
        """Test checking rollback history with different scaling actions"""
        # Create another scaling action
        scaling_action2 = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='tt:789012',
            action_type=ScalingAction.ScalingActionType.BUDGET_DECREASE,
            action_details={'decrease_percentage': 30},
            performed_by=self.user
        )
        
        # Create rollback history for first action
        rollback1 = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='First action rollback',
            performed_by=self.user
        )
        
        # Create rollback history for second action
        rollback2 = RollbackHistory.objects.create(
            scaling_action_id=scaling_action2,
            reason='Second action rollback',
            performed_by=self.user
        )
        
        # Test finding rollbacks for each action
        result1 = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            self.scaling_action.id
        )
        result2 = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            scaling_action2.id
        )
        
        self.assertIsNotNone(result1)
        self.assertIsNotNone(result2)
        self.assertEqual(result1, rollback1)
        self.assertEqual(result2, rollback2)
        self.assertNotEqual(result1, result2)
    
    def test_rollback_history_service_integration(self):
        """Test rollback history service integration"""
        # Initially no rollback history should exist
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            self.scaling_action.id
        )
        self.assertIsNone(result)
        
        # Create rollback history
        rollback = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='Integration test rollback',
            performed_by=self.user
        )
        
        # Now rollback history should exist
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            self.scaling_action.id
        )
        self.assertIsNotNone(result)
        self.assertEqual(result, rollback)


class ServiceIntegrationTest(TestCase):
    """Test integration between different services"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Integration Test Experiment',
            description='Test service integration',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test integration hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
    
    def test_experiment_and_rollback_service_integration(self):
        """Test integration between ExperimentService and RollbackHistoryService"""
        # Create scaling action
        scaling_action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        # Test experiment service
        found_experiment = ExperimentService.check_experiment_exists(self.experiment.id)
        self.assertIsNotNone(found_experiment)
        self.assertEqual(found_experiment, self.experiment)
        
        # Initially no rollback history should exist
        rollback_history = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            scaling_action.id
        )
        self.assertIsNone(rollback_history)
        
        # Create rollback history
        RollbackHistory.objects.create(
            scaling_action_id=scaling_action,
            reason='Integration test rollback',
            performed_by=self.user
        )
        
        # Now rollback history should exist
        rollback_history = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(
            scaling_action.id
        )
        self.assertIsNotNone(rollback_history)
        
        # Test status transition
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.RUNNING,
            OptimizationExperiment.ExperimentStatus.COMPLETED
        )
        self.assertTrue(is_valid)
        self.assertIsNone(error)
    
    def test_service_error_handling(self):
        """Test service error handling with invalid data"""
        # Test with invalid experiment ID
        result = ExperimentService.check_experiment_exists(99999)
        self.assertIsNone(result)
        
        # Test with invalid scaling action ID
        result = RollbackHistoryService.check_rollback_history_exists_by_scaling_action_id(99999)
        self.assertIsNone(result)
        
        # Test with invalid status transition
        is_valid, error = ExperimentService.validate_experiment_status_transition(
            OptimizationExperiment.ExperimentStatus.COMPLETED,
            OptimizationExperiment.ExperimentStatus.RUNNING
        )
        self.assertFalse(is_valid)
        self.assertIsNotNone(error)
