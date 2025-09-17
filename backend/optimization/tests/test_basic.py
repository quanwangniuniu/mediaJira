"""
Basic test cases for optimization app (no external dependencies)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from optimization.models import (
    OptimizationExperiment, ExperimentMetric, ScalingAction, RollbackHistory
)

User = get_user_model()


class BasicOptimizationTest(TestCase):
    """Basic tests that don't require external dependencies"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_experiment_status_choices(self):
        """Test experiment status choices"""
        choices = OptimizationExperiment.ExperimentStatus.choices
        self.assertIsInstance(choices, list)
        self.assertGreater(len(choices), 0)
        
        # Check that all statuses are valid
        status_values = [choice[0] for choice in choices]
        self.assertIn('running', status_values)
        self.assertIn('paused', status_values)
        self.assertIn('completed', status_values)
        self.assertIn('rolled_back', status_values)
    
    def test_experiment_type_choices(self):
        """Test experiment type choices"""
        choices = OptimizationExperiment.ExperimentType.choices
        self.assertIsInstance(choices, list)
        self.assertGreater(len(choices), 0)
        
        # Check that all types are valid
        type_values = [choice[0] for choice in choices]
        self.assertIn('ab_test', type_values)
        self.assertIn('creative_rotation', type_values)
        self.assertIn('budget_split', type_values)
    
    def test_scaling_action_type_choices(self):
        """Test scaling action type choices"""
        choices = ScalingAction.ScalingActionType.choices
        self.assertIsInstance(choices, list)
        self.assertGreater(len(choices), 0)
        
        # Check that all action types are valid
        action_values = [choice[0] for choice in choices]
        self.assertIn('budget_increase', action_values)
        self.assertIn('budget_decrease', action_values)
        self.assertIn('audience_expand', action_values)
        self.assertIn('audience_narrow', action_values)
        self.assertIn('creative_replace', action_values)
    
    def test_campaign_id_validation_utility(self):
        """Test campaign ID validation utility function"""
        from optimization.serializers import validate_campaign_id
        
        # Valid campaign IDs
        valid_ids = [
            'fb:123456',
            'tt:789012',
            'ins:345678',
            'google:999999',
            'platform:1',
            'platform:123456789'
        ]
        
        for campaign_id in valid_ids:
            self.assertTrue(validate_campaign_id(campaign_id), 
                          f"Campaign ID {campaign_id} should be valid")
        
        # Invalid campaign IDs
        invalid_ids = [
            'invalid_format',
            'fb:',
            ':123456',
            'fb:abc',
            'fb:123abc',
            '',
            None,
            123456,
            'platform',
            'platform:',
            'platform:abc123'
        ]
        
        for campaign_id in invalid_ids:
            self.assertFalse(validate_campaign_id(campaign_id), 
                           f"Campaign ID {campaign_id} should be invalid")
    