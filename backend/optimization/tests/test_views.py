"""
Test cases for optimization API views
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from datetime import timedelta

from optimization.models import (
    OptimizationExperiment, ExperimentMetric, ScalingAction, RollbackHistory
)

User = get_user_model()


class ExperimentListCreateViewTest(TestCase):
    """Test cases for experiment list/create API view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.experiment_data = {
            'name': 'Test A/B Campaign',
            'description': 'Testing holiday creatives for Q4 campaign',
            'experiment_type': 'ab_test',
            'linked_campaign_ids': ['fb:123456', 'tt:789000'],
            'hypothesis': 'Holiday creative A will outperform creative B by 15% in CTR',
            'start_date': '2026-01-15',
            'end_date': '2026-01-29'
        }
    
    def test_create_experiment_success(self):
        """Test successful experiment creation"""
        response = self.client.post('/api/optimization/experiments/', self.experiment_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], self.experiment_data['name'])
        self.assertEqual(response.data['experiment_type'], self.experiment_data['experiment_type'])
        self.assertEqual(response.data['linked_campaign_ids'], self.experiment_data['linked_campaign_ids'])
        self.assertEqual(response.data['status'], 'running')
        self.assertEqual(response.data['created_by'], self.user.id)
    
    def test_create_experiment_invalid_date_range(self):
        """Test experiment creation with invalid date range"""
        invalid_data = self.experiment_data.copy()
        invalid_data['start_date'] = '2026-01-29'
        invalid_data['end_date'] = '2026-01-15'  # End date before start date
        
        response = self.client.post('/api/optimization/experiments/', invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('end_date', response.data['detail'])
    
    def test_create_experiment_invalid_campaign_ids(self):
        """Test experiment creation with invalid campaign IDs"""
        invalid_data = self.experiment_data.copy()
        invalid_data['linked_campaign_ids'] = ['invalid_format', 'fb:']  # Invalid formats
        
        response = self.client.post('/api/optimization/experiments/', invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('linked_campaign_ids', response.data['detail'])
    
    def test_create_experiment_empty_campaign_ids(self):
        """Test experiment creation with empty campaign IDs"""
        invalid_data = self.experiment_data.copy()
        invalid_data['linked_campaign_ids'] = []  # Empty list
        
        response = self.client.post('/api/optimization/experiments/', invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('linked_campaign_ids', response.data['detail'])
    
    def test_create_experiment_non_list_campaign_ids(self):
        """Test experiment creation with non-list campaign IDs"""
        invalid_data = self.experiment_data.copy()
        invalid_data['linked_campaign_ids'] = 'fb:123456'  # String instead of list
        
        response = self.client.post('/api/optimization/experiments/', invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('linked_campaign_ids', response.data['detail'])
    
    def test_create_experiment_missing_required_fields(self):
        """Test experiment creation with missing required fields"""
        invalid_data = self.experiment_data.copy()
        del invalid_data['name']  # Remove required field
        
        response = self.client.post('/api/optimization/experiments/', invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
    
    def test_list_experiments_empty(self):
        """Test listing experiments when none exist"""
        response = self.client.get('/api/optimization/experiments/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # experiments are stored in the results field
        self.assertEqual(len(response.data['results']), 0)
    
    def test_list_experiments_with_data(self):
        """Test listing experiments with existing data"""
        # Create an experiment
        experiment = OptimizationExperiment.objects.create(
            name='List Test Experiment',
            description='Test listing experiments',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            created_by=self.user
        )
        
        response = self.client.get('/api/optimization/experiments/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'List Test Experiment')
        self.assertEqual(response.data['results'][0]['id'], experiment.id)
    
    def test_create_experiment_authentication_required(self):
        """Test that authentication is required for experiment creation"""
        self.client.logout()
        
        response = self.client.post('/api/optimization/experiments/', self.experiment_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ExperimentUpdateViewTest(TestCase):
    """Test cases for experiment update API view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Update Test Experiment',
            description='Test updating experiments',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
    
    def test_update_experiment_success(self):
        """Test successful experiment update"""
        update_data = {
            'name': 'Updated Experiment Name',
            'description': 'Updated description'
        }
        
        response = self.client.patch(f'/api/optimization/experiments/{self.experiment.id}/', 
                                   update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Experiment Name')
        self.assertEqual(response.data['description'], 'Updated description')
        
        # Verify database was updated
        self.experiment.refresh_from_db()
        self.assertEqual(self.experiment.name, 'Updated Experiment Name')
        self.assertEqual(self.experiment.description, 'Updated description')
    
    def test_update_experiment_status_valid_transition(self):
        """Test valid experiment status transition"""
        update_data = {
            'status': 'paused'
        }
        
        response = self.client.patch(f'/api/optimization/experiments/{self.experiment.id}/', 
                                   update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'paused')
        
        # Verify database was updated
        self.experiment.refresh_from_db()
        self.assertEqual(self.experiment.status, OptimizationExperiment.ExperimentStatus.PAUSED)
    
    def test_update_experiment_status_invalid_transition(self):
        """Test invalid experiment status transition"""
        # Set experiment to completed
        self.experiment.status = OptimizationExperiment.ExperimentStatus.COMPLETED
        self.experiment.save()
        
        update_data = {
            'status': 'running'  # Cannot go from completed to running
        }
        
        response = self.client.patch(f'/api/optimization/experiments/{self.experiment.id}/', 
                                   update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('status', response.data['detail'])
    
    def test_update_experiment_invalid_date_range(self):
        """Test experiment update with invalid date range"""
        update_data = {
            'start_date': '2026-01-29',
            'end_date': '2026-01-15'  # End date before start date
        }
        
        response = self.client.patch(f'/api/optimization/experiments/{self.experiment.id}/', 
                                   update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('end_date', response.data['detail'])
    
    def test_update_experiment_invalid_campaign_ids(self):
        """Test experiment update with invalid campaign IDs"""
        update_data = {
            'linked_campaign_ids': ['invalid_format', 'fb:']
        }
        
        response = self.client.patch(f'/api/optimization/experiments/{self.experiment.id}/', 
                                   update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
        self.assertIn('linked_campaign_ids', response.data['detail'])
    
    def test_update_experiment_not_found(self):
        """Test updating non-existent experiment"""
        update_data = {
            'name': 'Updated Name'
        }
        
        response = self.client.patch('/api/optimization/experiments/99999/', 
                                   update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_experiment_authentication_required(self):
        """Test that authentication is required for experiment update"""
        self.client.logout()
        
        update_data = {
            'name': 'Updated Name'
        }
        
        response = self.client.patch(f'/api/optimization/experiments/{self.experiment.id}/', 
                                   update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ScalingActionListCreateViewTest(TestCase):
    """Test cases for scaling action list/create API view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Scaling Action Test Experiment',
            description='Test scaling actions',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            created_by=self.user
        )
        
        self.scaling_action_data = {
            'experiment_id': self.experiment.id,
            'campaign_id': 'fb:123456',
            'action_type': 'budget_increase',
            'action_details': {
                'increase_percentage': 25,
                'reason': 'High performance detected'
            }
        }
    
    def test_create_scaling_action_success(self):
        """Test successful scaling action creation"""
        response = self.client.post('/api/optimization/scaling/', self.scaling_action_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['experiment_id'], self.experiment.id)
        self.assertEqual(response.data['campaign_id'], 'fb:123456')
        self.assertEqual(response.data['action_type'], 'budget_increase')
        self.assertEqual(response.data['action_details']['increase_percentage'], 25)
        self.assertEqual(response.data['action_details']['reason'], 'High performance detected')
    
    def test_create_scaling_action_invalid_campaign_id(self):
        """Test scaling action creation with invalid campaign ID"""
        invalid_data = self.scaling_action_data.copy()
        invalid_data['campaign_id'] = 'invalid_format'
        
        response = self.client.post('/api/optimization/scaling/', invalid_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
    
    def test_create_scaling_action_invalid_experiment_id(self):
        """Test scaling action creation with invalid experiment ID"""
        invalid_data = self.scaling_action_data.copy()
        invalid_data['experiment_id'] = 99999  # Non-existent experiment
        
        response = self.client.post('/api/optimization/scaling/', invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
    
    def test_list_scaling_actions_empty(self):
        """Test listing scaling actions when none exist"""
        response = self.client.get('/api/optimization/scaling/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_list_scaling_actions_with_data(self):
        """Test listing scaling actions with existing data"""
        # Create a scaling action
        scaling_action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        response = self.client.get('/api/optimization/scaling/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], scaling_action.id)
        self.assertEqual(response.data['results'][0]['action_type'], 'budget_increase')
    
    def test_create_scaling_action_authentication_required(self):
        """Test that authentication is required for scaling action creation"""
        self.client.logout()
        
        response = self.client.post('/api/optimization/scaling/', self.scaling_action_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RollbackScalingActionViewTest(TestCase):
    """Test cases for rollback scaling action API view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Rollback Test Experiment',
            description='Test rollback functionality',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            created_by=self.user
        )
        
        self.scaling_action = ScalingAction.objects.create(
            experiment_id=self.experiment,
            campaign_id='fb:123456',
            action_type=ScalingAction.ScalingActionType.BUDGET_INCREASE,
            action_details={'increase_percentage': 25},
            performed_by=self.user
        )
        
        self.rollback_data = {
            'reason': 'Test rollback reason'
        }
    
    def test_rollback_scaling_action_success(self):
        """Test successful scaling action rollback"""
        response = self.client.post(f'/api/optimization/scaling/{self.scaling_action.id}/rollback/', 
                                  self.rollback_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['scaling_action_id'], self.scaling_action.id)
        self.assertEqual(response.data['reason'], 'Test rollback reason')
        self.assertEqual(response.data['performed_by'], self.user.id)
        
        # Verify rollback history was created
        rollback_history = RollbackHistory.objects.get(scaling_action_id=self.scaling_action)
        self.assertEqual(rollback_history.reason, 'Test rollback reason')
        self.assertEqual(rollback_history.performed_by, self.user)
    
    def test_rollback_scaling_action_missing_reason(self):
        """Test rollback with missing reason"""
        invalid_data = {}  # No reason provided
        
        response = self.client.post(f'/api/optimization/scaling/{self.scaling_action.id}/rollback/', 
                                  invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reason', response.data)
    
    def test_rollback_scaling_action_empty_reason(self):
        """Test rollback with empty reason"""
        invalid_data = {
            'reason': ''  # Empty reason
        }
        
        response = self.client.post(f'/api/optimization/scaling/{self.scaling_action.id}/rollback/', 
                                  invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reason', response.data)
    
    def test_rollback_scaling_action_not_found(self):
        """Test rollback of non-existent scaling action"""
        response = self.client.post('/api/optimization/scaling/99999/rollback/', 
                                  self.rollback_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_rollback_scaling_action_authentication_required(self):
        """Test that authentication is required for rollback"""
        self.client.logout()
        
        response = self.client.post(f'/api/optimization/scaling/{self.scaling_action.id}/rollback/', 
                                  self.rollback_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class IngestExperimentMetricsViewTest(TestCase):
    """Test cases for ingest experiment metrics API view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Metrics Test Experiment',
            description='Test metrics ingestion',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            created_by=self.user
        )
        
        self.metrics_data = {
            'metric_name': 'fb:123456_spend',
            'metric_value': 150.0
        }
    
    def test_ingest_experiment_metrics_success(self):
        """Test successful experiment metrics ingestion"""
        response = self.client.post(f'/api/optimization/experiments/{self.experiment.id}/metrics/ingest/', 
                                  self.metrics_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['experiment_id'], self.experiment.id)
        
        # Verify metrics were created
        metrics = ExperimentMetric.objects.filter(experiment_id=self.experiment)
        self.assertEqual(metrics.count(), 1)
    
    def test_ingest_experiment_metrics_invalid_experiment_id(self):
        """Test metrics ingestion with invalid experiment ID"""
        response = self.client.post('/api/optimization/experiments/99999/metrics/ingest/', 
                                  self.metrics_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_ingest_experiment_metrics_invalid_data(self):
        """Test metrics ingestion with invalid data"""
        invalid_data = [
            {
                'metric_name': 'fb:123456_spend'
                # Missing metric_value
            }
        ]
        
        response = self.client.post(f'/api/optimization/experiments/{self.experiment.id}/metrics/ingest/', 
                                  invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('detail', response.data)
    
    def test_ingest_experiment_metrics_authentication_required(self):
        """Test that authentication is required for metrics ingestion"""
        self.client.logout()
        
        response = self.client.post(f'/api/optimization/experiments/{self.experiment.id}/metrics/ingest/', 
                                  self.metrics_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
