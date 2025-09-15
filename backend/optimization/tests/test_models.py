"""
Test cases for optimization models
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from optimization.models import (
    OptimizationExperiment, ExperimentMetric, ScalingAction, RollbackHistory
)

User = get_user_model()


class OptimizationExperimentModelTest(TestCase):
    """Test cases for OptimizationExperiment model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_experiment(self):
        """Test creating an optimization experiment"""
        experiment = OptimizationExperiment.objects.create(
            name='Test A/B Campaign',
            description='Testing holiday creatives for Q4 campaign',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456', 'tt:789012'],
            hypothesis='Holiday creative A will outperform creative B by 15% in CTR',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
        
        self.assertEqual(experiment.name, 'Test A/B Campaign')
        self.assertEqual(experiment.description, 'Testing holiday creatives for Q4 campaign')
        self.assertEqual(experiment.experiment_type, OptimizationExperiment.ExperimentType.AB_TEST)
        self.assertEqual(experiment.linked_campaign_ids, ['fb:123456', 'tt:789012'])
        self.assertEqual(experiment.hypothesis, 'Holiday creative A will outperform creative B by 15% in CTR')
        self.assertEqual(experiment.status, OptimizationExperiment.ExperimentStatus.RUNNING)
        self.assertEqual(experiment.created_by, self.user)
        self.assertIsNotNone(experiment.id)
    
    def test_experiment_status_choices(self):
        """Test experiment status choices"""
        status_choices = OptimizationExperiment.ExperimentStatus.choices
        
        expected_choices = [
            ('running', 'Running'),
            ('paused', 'Paused'),
            ('completed', 'Completed'),
            ('rolled_back', 'Rolled Back')
        ]
        
        self.assertEqual(status_choices, expected_choices)
    
    def test_experiment_type_choices(self):
        """Test experiment type choices"""
        type_choices = OptimizationExperiment.ExperimentType.choices
        
        expected_choices = [
            ('ab_test', 'Ab Test'),
            ('creative_rotation', 'Creative Rotation'),
            ('budget_split', 'Budget Split')
        ]
        
        self.assertEqual(type_choices, expected_choices)
    
    def test_experiment_linked_campaign_ids_json_field(self):
        """Test that linked_campaign_ids is properly handled as JSON field"""
        campaigns = ['fb:123456', 'tt:789012', 'ins:345678']
        
        experiment = OptimizationExperiment.objects.create(
            name='JSON Test',
            description='Test JSON field',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=campaigns,
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            created_by=self.user
        )
        
        # Refresh from database
        experiment.refresh_from_db()
        
        self.assertEqual(experiment.linked_campaign_ids, campaigns)
        self.assertIsInstance(experiment.linked_campaign_ids, list)
        self.assertEqual(len(experiment.linked_campaign_ids), 3)
    
    def test_experiment_required_fields(self):
        """Test experiment required fields"""
        # Test missing name
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                description='Test description',
                experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
                linked_campaign_ids=['fb:123456'],
                hypothesis='Test hypothesis',
                start_date=timezone.now().date(),
                end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing description
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                name='Test Experiment',
                experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
                linked_campaign_ids=['fb:123456'],
                hypothesis='Test hypothesis',
                start_date=timezone.now().date(),
                end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing experiment_type
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                name='Test Experiment',
                description='Test description',
                linked_campaign_ids=['fb:123456'],
                hypothesis='Test hypothesis',
                start_date=timezone.now().date(),
                end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing linked_campaign_ids
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                name='Test Experiment',
                description='Test description',
                experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
                hypothesis='Test hypothesis',
                start_date=timezone.now().date(),
                end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing hypothesis
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                name='Test Experiment',
                description='Test description',
                experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
                linked_campaign_ids=['fb:123456'],
                start_date=timezone.now().date(),
                end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing start_date
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                name='Test Experiment',
                description='Test description',
                experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
                linked_campaign_ids=['fb:123456'],
                hypothesis='Test hypothesis',
                end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing end_date
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                name='Test Experiment',
                description='Test description',
                experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
                linked_campaign_ids=['fb:123456'],
                hypothesis='Test hypothesis',
                start_date=timezone.now().date(),
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing created_by
        with self.assertRaises(ValidationError):
            experiment = OptimizationExperiment(
                name='Test Experiment',
                description='Test description',
                experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
                linked_campaign_ids=['fb:123456'],
                hypothesis='Test hypothesis',
                start_date=timezone.now().date(),
                end_date=(timezone.now() + timezone.timedelta(days=30)).date()
            )
            experiment.full_clean()
    
    def test_experiment_foreign_key_relationship(self):
        """Test experiment foreign key relationship"""
        experiment = OptimizationExperiment.objects.create(
            name='Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            created_by=self.user
        )
        
        # Test forward relationship
        self.assertEqual(experiment.created_by, self.user)
        
        # Test reverse relationship
        self.assertIn(experiment, self.user.owned_optimization_experiments.all())
    
    def test_experiment_cascade_delete_user(self):
        """Test experiment cascade delete when user is deleted"""
        experiment = OptimizationExperiment.objects.create(
            name='Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            created_by=self.user
        )

        experiment_id = experiment.id

        # Delete user
        self.user.delete()
        
        # Experiment should be deleted as well
        self.assertFalse(OptimizationExperiment.objects.filter(id=experiment_id).exists())


class ExperimentMetricModelTest(TestCase):
    """Test cases for ExperimentMetric model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Metric Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            created_by=self.user
        )
    
    def test_create_experiment_metric(self):
        """Test creating an experiment metric"""
        metric = ExperimentMetric.objects.create(
            experiment_id=self.experiment,
            metric_name='fb:123456_spend',
            metric_value=150.0
        )
        
        self.assertEqual(metric.experiment_id, self.experiment)
        self.assertEqual(metric.metric_name, 'fb:123456_spend')
        self.assertEqual(metric.metric_value, 150.0)
        self.assertIsNotNone(metric.id)
    
    def test_metric_auto_timestamp(self):
        """Test that metric automatically sets timestamp"""
        metric = ExperimentMetric.objects.create(
            experiment_id=self.experiment,
            metric_name='fb:123456_spend',
            metric_value=150.0
        )
        
        self.assertIsNotNone(metric.recorded_at)
        self.assertLessEqual(metric.recorded_at, timezone.now())
    
    def test_metric_value_types(self):
        """Test metric value with different numeric types"""
        # Test with integer
        metric1 = ExperimentMetric.objects.create(
            experiment_id=self.experiment,
            metric_name='fb:123456_spend',
            metric_value=150
        )
        self.assertEqual(metric1.metric_value, 150.0)
        
        # Test with float
        metric2 = ExperimentMetric.objects.create(
            experiment_id=self.experiment,
            metric_name='fb:123456_spend',
            metric_value=150.5
        )
        self.assertEqual(metric2.metric_value, 150.5)
        
        # Test with decimal
        metric3 = ExperimentMetric.objects.create(
            experiment_id=self.experiment,
            metric_name='fb:123456_spend',
            metric_value=150.123456789
        )
        self.assertEqual(metric3.metric_value, 150.123456789)
    
    def test_metric_required_fields(self):
        """Test metric required fields"""
        # Test missing experiment_id
        with self.assertRaises(ValidationError):
            experimentMetric = ExperimentMetric(
                metric_name='fb:123456_spend',
                metric_value=150.0
            )
            experimentMetric.full_clean()
        
        # Test missing metric_name
        with self.assertRaises(ValidationError):
            experimentMetric = ExperimentMetric(
                experiment_id=self.experiment,
                metric_value=150.0
            )
            experimentMetric.full_clean()
        
        # Test missing metric_value
        with self.assertRaises(ValidationError):
            experimentMetric = ExperimentMetric(
                experiment_id=self.experiment,
                metric_name='fb:123456_spend'
            )
            experimentMetric.full_clean()
    
    def test_metric_foreign_key_relationship(self):
        """Test metric foreign key relationship"""
        metric = ExperimentMetric.objects.create(
            experiment_id=self.experiment,
            metric_name='fb:123456_spend',
            metric_value=150.0
        )
        
        # Test forward relationship
        self.assertEqual(metric.experiment_id, self.experiment)
        
        # Test reverse relationship
        self.assertIn(metric, self.experiment.owned_experiment_metrics.all())
    
    def test_metric_cascade_delete_experiment(self):
        """Test that metrics are deleted when experiment is deleted"""
        metric = ExperimentMetric.objects.create(
            experiment_id=self.experiment,
            metric_name='fb:123456_spend',
            metric_value=150.0
        )
        
        metric_id = metric.id
        
        # Delete experiment
        self.experiment.delete()
        
        # Metric should be deleted as well
        self.assertFalse(ExperimentMetric.objects.filter(id=metric_id).exists())


class ScalingActionModelTest(TestCase):
    """Test cases for ScalingAction model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Scaling Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            created_by=self.user
        )
    
    def test_create_scaling_action(self):
        """Test creating a scaling action"""
        action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={
                'increase_percentage': 25,
                'reason': 'High performance detected'
            },
            performed_by=self.user
        )
        
        self.assertEqual(action.experiment_id, self.experiment)
        self.assertEqual(action.campaign_id, 'fb:123456')
        self.assertEqual(action.action_type, ScalingAction.ScalingActionType.BUDGET_INCREASE)
        self.assertEqual(action.action_details['increase_percentage'], 25)
        self.assertEqual(action.action_details['reason'], 'High performance detected')
        self.assertIsNotNone(action.id)
    
    def test_scaling_action_type_choices(self):
        """Test scaling action type choices"""
        type_choices = ScalingAction.ScalingActionType.choices
        
        expected_choices = [
            ('budget_increase', 'Budget Increase'),
            ('budget_decrease', 'Budget Decrease'),
            ('audience_expand', 'Audience Expand'),
            ('audience_narrow', 'Audience Narrow'),
            ('creative_replace', 'Creative Replace')
        ]
        
        self.assertEqual(type_choices, expected_choices)
    
    def test_scaling_action_auto_timestamp(self):
        """Test that scaling action automatically sets timestamp"""
        action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        self.assertIsNotNone(action.performed_at)
        self.assertLessEqual(action.performed_at, timezone.now())
    
    def test_scaling_action_required_fields(self):
        """Test scaling action required fields"""
        # Test missing experiment_id
        action = ScalingAction.objects.create(
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        self.assertEqual(action.campaign_id, 'fb:123456')
        self.assertEqual(action.action_type, ScalingAction.ScalingActionType.BUDGET_INCREASE)
        self.assertEqual(action.action_details['increase_percentage'], 25)
        self.assertIsNotNone(action.id)
        
        # Test missing action_type
        with self.assertRaises(ValidationError):
            action = ScalingAction(
                experiment_id=self.experiment,
                campaign_id='fb:123456',
                action_details={'increase_percentage': 25},
                performed_by=self.user
            )
            action.full_clean()
        
        # Test missing action_details
        with self.assertRaises(ValidationError):
            action = ScalingAction(
                experiment_id=self.experiment,
                campaign_id='fb:123456',
                action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
                performed_by=self.user
            )
            action.full_clean()
        
        # Test missing campaign_id
        with self.assertRaises(ValidationError):
            action = ScalingAction(
                experiment_id=self.experiment,
                action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
                action_details={'increase_percentage': 25},
                performed_by=self.user
            )
            action.full_clean()
        
        # Test missing performed_by
        with self.assertRaises(ValidationError):
            action = ScalingAction(
                experiment_id=self.experiment,
                campaign_id='fb:123456',
                action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
                action_details={'increase_percentage': 25}
            )
            action.full_clean()
    
    def test_scaling_action_foreign_key_relationship(self):
        """Test scaling action foreign key relationship"""
        action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        # Test forward relationship
        self.assertEqual(action.experiment_id, self.experiment)
        self.assertEqual(action.performed_by, self.user)
        
        # Test reverse relationship
        self.assertIn(action, self.experiment.owned_scaling_actions.all())
        self.assertIn(action, self.user.performed_scaling_actions.all())

    
    def test_scaling_action_cascade_delete_experiment(self):
        """Test that scaling actions are deleted when experiment is deleted"""
        action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        action_id = action.id
        
        # Delete experiment
        self.experiment.delete()
        
        # Scaling action should be deleted as well
        self.assertFalse(ScalingAction.objects.filter(id=action_id).exists())
    
    def test_scaling_action_cascade_delete_user(self):
        """Test that scaling actions are deleted when user is deleted"""
        action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        action_id = action.id
        
        # Delete user
        self.user.delete()
        
        # Scaling action should be deleted as well
        self.assertFalse(ScalingAction.objects.filter(id=action_id).exists())


class RollbackHistoryModelTest(TestCase):
    """Test cases for RollbackHistory model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Rollback Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            created_by=self.user
        )
        
        self.scaling_action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
    
    def test_create_rollback_history(self):
        """Test creating rollback history"""
        rollback = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='Test rollback reason',
            performed_by=self.user
        )
        
        self.assertEqual(rollback.scaling_action_id, self.scaling_action)
        self.assertEqual(rollback.reason, 'Test rollback reason')
        self.assertEqual(rollback.performed_by, self.user)
        self.assertIsNotNone(rollback.id)
    
    def test_rollback_history_auto_timestamp(self):
        """Test that rollback history automatically sets timestamp"""
        rollback = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='Test rollback',
            performed_by=self.user
        )
        
        self.assertIsNotNone(rollback.performed_at)
        self.assertLessEqual(rollback.performed_at, timezone.now())
    
    def test_rollback_history_required_fields(self):
        """Test rollback history required fields"""
        # Test missing scaling_action_id
        with self.assertRaises(ValidationError):
            rollback_history = RollbackHistory(
                reason='Test rollback',
                performed_by=self.user
            )
            rollback_history.full_clean()
        
        # Test missing reason
        with self.assertRaises(ValidationError):
            rollback_history = RollbackHistory(
                scaling_action_id=self.scaling_action,
                performed_by=self.user
            )
            rollback_history.full_clean()
        
        # Test missing performed_by
        with self.assertRaises(ValidationError):
            rollback_history = RollbackHistory(
                scaling_action_id=self.scaling_action,
                reason='Test rollback'
            )
            rollback_history.full_clean()
    
    def test_rollback_history_foreign_key_relationships(self):
        """Test rollback history foreign key relationships"""
        rollback = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='Test rollback',
            performed_by=self.user
        )
        
        # Test forward relationships
        self.assertEqual(rollback.scaling_action_id, self.scaling_action)
        self.assertEqual(rollback.performed_by, self.user)
        
        # Test reverse relationships
        self.assertIn(rollback, self.scaling_action.owned_rollback_histories.all())
        self.assertIn(rollback, self.user.performed_rollback_actions.all())
    
    def test_rollback_history_cascade_delete_scaling_action(self):
        """Test rollback history deletion behavior"""
        rollback = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='Test rollback',
            performed_by=self.user
        )
        
        rollback_id = rollback.id
        
        # Delete scaling action
        self.scaling_action.delete()
        
        # Rollback history should be deleted as well
        self.assertFalse(RollbackHistory.objects.filter(id=rollback_id).exists())
    
    def test_rollback_history_cascade_delete_user(self):
        """Test rollback history deletion when user is deleted"""
        rollback = RollbackHistory.objects.create(
            scaling_action_id=self.scaling_action,
            reason='Test rollback',
            performed_by=self.user
        )
        
        rollback_id = rollback.id
        
        # Delete user
        self.user.delete()
        
        # Rollback history should be deleted as well
        self.assertFalse(RollbackHistory.objects.filter(id=rollback_id).exists())


class ModelRelationshipsTest(TestCase):
    """Test model relationships and queries"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Relationship Test Experiment',
            description='Test relationships',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456', 'tt:789012'],
            hypothesis='Test relationships hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            created_by=self.user
        )
    
    def test_experiment_metrics_relationship(self):
        """Test experiment-metrics relationship"""
        # Create multiple metrics
        metrics = []
        for i in range(5):
            metric = ExperimentMetric.objects.create(
                experiment_id=self.experiment,
                metric_name=f'fb:123456_metric_{i}',
                metric_value=100.0 + i
            )
            metrics.append(metric)
        
        # Test reverse relationship
        experiment_metrics = self.experiment.owned_experiment_metrics.all()
        self.assertEqual(experiment_metrics.count(), 5)
        
        for metric in metrics:
            self.assertIn(metric, experiment_metrics)
    
    def test_experiment_scaling_actions_relationship(self):
        """Test experiment-scaling actions relationship"""
        # Create multiple scaling actions
        actions = []
        for i in range(3):
            action = ScalingAction.objects.create(
                experiment_id=self.experiment,
                campaign_id=f'fb:{i:06d}',
                action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
                action_details={'increase_percentage': 25 + i},
                performed_by=self.user
            )
            actions.append(action)
        
        # Test reverse relationship
        experiment_actions = self.experiment.owned_scaling_actions.all()
        self.assertEqual(experiment_actions.count(), 3)
        
        for action in actions:
            self.assertIn(action, experiment_actions)
    
    def test_scaling_action_rollback_history_relationship(self):
        """Test scaling action-rollback history relationship"""
        scaling_action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        # Create multiple rollback histories
        rollbacks = []
        for i in range(2):
            rollback = RollbackHistory.objects.create(
                scaling_action_id=scaling_action,
                reason=f'Rollback {i}',
                performed_by=self.user
            )
            rollbacks.append(rollback)
        
        # Test reverse relationship
        action_rollbacks = scaling_action.owned_rollback_histories.all()
        self.assertEqual(action_rollbacks.count(), 2)
        
        for rollback in rollbacks:
            self.assertIn(rollback, action_rollbacks)
    
    def test_user_rollback_history_relationship(self):
        """Test user-rollback history relationship"""
        scaling_action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        # Create multiple rollback histories
        rollbacks = []
        for i in range(3):
            rollback = RollbackHistory.objects.create(
                scaling_action_id=scaling_action,
                reason=f'User rollback {i}',
                performed_by=self.user
            )
            rollbacks.append(rollback)
        
        # Test reverse relationship
        user_rollbacks = self.user.performed_rollback_actions.all()
        self.assertEqual(user_rollbacks.count(), 3)
        
        for rollback in rollbacks:
            self.assertIn(rollback, user_rollbacks)
    
    def test_complex_relationships_query(self):
        """Test complex relationship queries"""
        # Create metrics
        for i in range(10):
            ExperimentMetric.objects.create(
                experiment_id=self.experiment,
                metric_name=f'fb:123456_metric_{i}',
                metric_value=100.0 + i
            )
        
        # Create scaling actions
        actions = []
        for i in range(3):
            action = ScalingAction.objects.create(
                experiment_id=self.experiment,
                campaign_id=f'fb:{i:06d}',
                action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
                action_details={'increase_percentage': 25 + i},
                performed_by=self.user
            )
            actions.append(action)
        
        # Create rollback histories
        for action in actions:
            RollbackHistory.objects.create(
                scaling_action_id=action,
                reason=f'Rollback for action {action.id}',
                performed_by=self.user
            )
        
        # Test complex query
        experiments_with_metrics = OptimizationExperiment.objects.filter(
            owned_experiment_metrics__isnull=False
        ).distinct()
        
        self.assertGreaterEqual(experiments_with_metrics.count(), 1)
        self.assertIn(self.experiment, experiments_with_metrics)
        
        # Test query with multiple relationships
        experiments_with_rollbacks = OptimizationExperiment.objects.filter(
            owned_scaling_actions__owned_rollback_histories__isnull=False
        ).distinct()
        
        self.assertGreaterEqual(experiments_with_rollbacks.count(), 1)
        self.assertIn(self.experiment, experiments_with_rollbacks)
