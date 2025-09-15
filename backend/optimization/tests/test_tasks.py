"""
Test cases for optimization Celery tasks
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import patch, Mock
from datetime import timedelta

from optimization.models import (
    OptimizationExperiment, ExperimentMetric, ScalingAction
)
from optimization.tasks import (
    ingest_experiment_metrics, 
    evaluate_scaling_rules,
    _fetch_platform_metrics,
    _store_experiment_metrics,
    _evaluate_scaling_conditions,
    _analyze_campaign_performance,
    _create_scaling_action,
    _fetch_facebook_metrics,
    _fetch_tiktok_metrics,
    _fetch_instagram_metrics
)

User = get_user_model()


class IngestExperimentMetricsTaskTest(TestCase):
    """Test cases for ingest_experiment_metrics Celery task"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.running_experiment = OptimizationExperiment.objects.create(
            name='Running Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:111111', 'tt:222222'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=7)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
        
        self.paused_experiment = OptimizationExperiment.objects.create(
            name='Paused Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:333333'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=7)).date(),
            status=OptimizationExperiment.ExperimentStatus.PAUSED,
            created_by=self.user
        )
    
    @patch('optimization.tasks._fetch_platform_metrics')
    @patch('optimization.tasks._store_experiment_metrics')
    def test_ingest_metrics_task_structure(self, mock_store, mock_fetch):
        """Test that metric ingestion task has correct structure"""
        # Mock platform metrics response
        mock_fetch.return_value = {
            'fb:111111': {
                'spend': 150.0,
                'impressions': 50000,
                'clicks': 2500,
                'conversions': 25,
                'ctr': 0.05,
                'cpa': 6.0,
                'roas': 2.5
            }
        }
        mock_store.return_value = 7
        
        result = ingest_experiment_metrics()
        
        self.assertIn('status', result)
        self.assertIn('total_metrics_ingested', result)
        self.assertIn('failed_experiments', result)
        self.assertIn('timestamp', result)
        self.assertEqual(result['status'], 'completed')
    
    @patch('optimization.tasks._fetch_platform_metrics')
    @patch('optimization.tasks._store_experiment_metrics')
    def test_ingest_metrics_with_running_experiments(self, mock_store, mock_fetch):
        """Test metric ingestion with running experiments"""
        # Mock platform metrics response
        mock_fetch.return_value = {
            'fb:111111': {
                'spend': 150.0,
                'impressions': 50000,
                'clicks': 2500,
                'conversions': 25,
                'ctr': 0.05,
                'cpa': 6.0,
                'roas': 2.5
            }
        }
        mock_store.return_value = 7
        
        result = ingest_experiment_metrics()
        
        self.assertEqual(result['status'], 'completed')
        self.assertGreater(result['total_metrics_ingested'], 0)
        self.assertEqual(result['failed_experiments'], 0)
    
    def test_ingest_metrics_no_running_experiments(self):
        """Test metric ingestion when no experiments are running"""
        # Delete the running experiment
        self.running_experiment.delete()
        
        result = ingest_experiment_metrics()
        
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['total_metrics_ingested'], 0)
        self.assertEqual(result['failed_experiments'], [])
        self.assertIn('No running experiments found', result['message'])
    
    @patch('optimization.tasks._fetch_facebook_metrics')
    @patch('optimization.tasks._fetch_tiktok_metrics')
    @patch('optimization.tasks._fetch_instagram_metrics')
    def test_platform_metrics_fetching(self, mock_instagram, mock_tiktok, mock_facebook):
        """Test fetching metrics from multiple platforms"""
        # Mock platform API responses
        mock_facebook.return_value = {
            'spend': 150.0,
            'impressions': 50000,
            'clicks': 2500,
            'conversions': 25,
            'ctr': 0.05,
            'cpa': 6.0,
            'roas': 2.5
        }
        
        mock_tiktok.return_value = {
            'spend': 120.0,
            'impressions': 40000,
            'clicks': 2000,
            'conversions': 20,
            'ctr': 0.05,
            'cpa': 6.0,
            'roas': 2.0
        }
        
        campaign_metrics = _fetch_platform_metrics(self.running_experiment)
        
        # Should have metrics for both campaigns
        self.assertEqual(len(campaign_metrics), 2)
        self.assertIn('fb:111111', campaign_metrics)
        self.assertIn('tt:222222', campaign_metrics)
        
        # Each campaign should have expected metrics
        fb_metrics = campaign_metrics['fb:111111']
        self.assertIn('spend', fb_metrics)
        self.assertIn('impressions', fb_metrics)
        self.assertIn('clicks', fb_metrics)
        self.assertIn('conversions', fb_metrics)
        self.assertIn('ctr', fb_metrics)
        self.assertIn('cpa', fb_metrics)
        self.assertIn('roas', fb_metrics)
    
    def test_metric_storage_in_database(self):
        """Test that metrics are stored correctly in database"""
        initial_count = ExperimentMetric.objects.count()
        
        campaign_metrics = {
            'fb:111111': {
                'spend': 150.0,
                'impressions': 50000,
                'clicks': 2500,
                'conversions': 25,
                'ctr': 0.05,
                'cpa': 6.0,
                'roas': 2.5
            }
        }
        
        metrics_created = _store_experiment_metrics(self.running_experiment, campaign_metrics)
        
        # Should create 7 metrics (one for each metric type)
        self.assertEqual(metrics_created, 7)
        
        # Verify metrics are stored with correct prefixes
        stored_metrics = ExperimentMetric.objects.filter(experiment_id=self.running_experiment)
        self.assertEqual(stored_metrics.count(), 7)
        
        metric_names = [m.metric_name for m in stored_metrics]
        self.assertIn('fb:111111_spend', metric_names)
        self.assertIn('fb:111111_impressions', metric_names)
        self.assertIn('fb:111111_clicks', metric_names)
        self.assertIn('fb:111111_conversions', metric_names)
        self.assertIn('fb:111111_ctr', metric_names)
        self.assertIn('fb:111111_cpa', metric_names)
        self.assertIn('fb:111111_roas', metric_names)
    
    @patch('optimization.tasks._fetch_platform_metrics')
    def test_ingest_metrics_with_api_failures(self, mock_fetch):
        """Test metric ingestion handles API failures gracefully"""
        mock_fetch.return_value = {}  # Simulate API failure
        
        result = ingest_experiment_metrics()
        
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['total_metrics_ingested'], 0)
        self.assertEqual(len(result['failed_experiment_details']), 1)
        self.assertEqual(result['failed_experiment_details'][0]['experiment_id'], self.running_experiment.id)
    
    def test_metric_storage_database_errors(self):
        """Test handling of database errors during metric storage"""
        campaign_metrics = {
            'fb:111111': {
                'spend': 150.0,
                'impressions': 50000
            }
        }
        
        with patch('optimization.tasks.ExperimentMetric.objects.create') as mock_create:
            mock_create.side_effect = Exception('Database error')
            
            metrics_created = _store_experiment_metrics(self.running_experiment, campaign_metrics)
            
            # Should handle error gracefully
            self.assertEqual(metrics_created, 0)


class EvaluateScalingRulesTaskTest(TestCase):
    """Test cases for evaluate_scaling_rules Celery task"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.running_experiment = OptimizationExperiment.objects.create(
            name='Running Test Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:111111', 'tt:222222'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=7)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
        
        # Create recent metrics
        recent_time = timezone.now() - timedelta(hours=12)
        self.recent_metrics = []
        for i in range(5):
            metric = ExperimentMetric.objects.create(
                experiment_id=self.running_experiment,
                metric_name=f'fb:111111_metric_{i}',
                metric_value=100.0 + i,
                recorded_at=recent_time + timedelta(hours=i)
            )
            self.recent_metrics.append(metric)
    
    def test_scaling_rules_evaluation_task_structure(self):
        """Test that scaling rules evaluation task has correct structure"""
        result = evaluate_scaling_rules()
        
        self.assertIn('status', result)
        self.assertIn('experiments_evaluated', result)
        self.assertIn('scaling_actions_created', result)
        self.assertIn('scaling_decisions', result)
        self.assertIn('timestamp', result)
        self.assertEqual(result['status'], 'completed')
    
    def test_scaling_rules_evaluation_with_recent_metrics(self):
        """Test scaling rules evaluation with recent metrics"""
        result = evaluate_scaling_rules()
        
        self.assertEqual(result['status'], 'completed')
        self.assertGreaterEqual(result['experiments_evaluated'], 0)
        self.assertGreaterEqual(result['scaling_actions_created'], 0)
    
    def test_scaling_rules_evaluation_no_recent_metrics(self):
        """Test scaling rules evaluation when no recent metrics exist"""
        # Pause the original experiment to exclude it from evaluation
        self.running_experiment.status = OptimizationExperiment.ExperimentStatus.PAUSED
        self.running_experiment.save()
        
        # Create a fresh experiment with only old metrics
        old_experiment = OptimizationExperiment.objects.create(
            name='Old Metrics Experiment',
            description='Test description',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:999999'],
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=7)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
        
        # Create old metrics (much older than 24 hours)
        old_time = timezone.now() - timedelta(days=2)
        ExperimentMetric.objects.create(
            experiment_id=old_experiment,
            metric_name='fb:999999_spend',
            metric_value=150.0,
            recorded_at=old_time
        )
        
        result = evaluate_scaling_rules()
        
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['experiments_evaluated'], 1) 
        self.assertEqual(result['scaling_actions_created'], 0)
    
    def test_scaling_rules_evaluation_no_running_experiments(self):
        """Test scaling rules evaluation when no experiments are running"""
        # Set experiment to paused
        self.running_experiment.status = OptimizationExperiment.ExperimentStatus.PAUSED
        self.running_experiment.save()
        
        result = evaluate_scaling_rules()
        
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['experiments_evaluated'], 0)
        self.assertEqual(result['scaling_actions_created'], 0)
    
    def test_evaluate_scaling_conditions_with_valid_metrics(self):
        """Test evaluation of scaling conditions with valid metrics"""
        decisions = _evaluate_scaling_conditions(self.running_experiment, self.recent_metrics)
        
        # Should return a list of decisions
        self.assertIsInstance(decisions, list)
    
    def test_evaluate_scaling_conditions_insufficient_metrics(self):
        """Test evaluation with insufficient metrics"""
        # Create metrics with insufficient data
        insufficient_metrics = [
            ExperimentMetric.objects.create(
                experiment_id=self.running_experiment,
                metric_name='fb:111111_spend',
                metric_value=150.0
            ),
            ExperimentMetric.objects.create(
                experiment_id=self.running_experiment,
                metric_name='fb:111111_ctr',
                metric_value=0.05
            )
            # Only 2 metrics, need at least 3
        ]
        
        decisions = _evaluate_scaling_conditions(self.running_experiment, insufficient_metrics)
        
        # Should return empty list due to insufficient metrics
        self.assertEqual(decisions, [])


class ScalingAnalysisTest(TestCase):
    """Test cases for scaling analysis functions"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Scaling Analysis Test Experiment',
            description='Test scaling analysis',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test scaling analysis hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
    
    @patch('optimization.tasks.getattr')
    def test_analyze_campaign_performance_budget_increase(self, mock_getattr):
        """Test budget increase rule triggered"""
        # Mock getattr to return specific threshold values
        def mock_getattr_side_effect(obj, name, default=None):
            if hasattr(obj, '__name__') and obj.__name__ == 'settings':
                threshold_map = {
                    'SCALING_CTR_HIGH_THRESHOLD': 0.05,
                    'SCALING_CPA_LOW_THRESHOLD': 20.0,
                    'SCALING_ROAS_MIN_THRESHOLD': 2.0,
                    'SCALING_SPEND_MIN_THRESHOLD': 100.0,
                    'SCALING_CTR_LOW_THRESHOLD': 0.02,
                    'SCALING_CPA_HIGH_THRESHOLD': 50.0,
                }
                return threshold_map.get(name, default)
            return default
        
        mock_getattr.side_effect = mock_getattr_side_effect
        
        # Create high-performing metrics
        high_performance_metrics = {
            'ctr': 0.06,  # Above threshold
            'cpa': 15.0,  # Below threshold
            'roas': 2.5,  # Above threshold
            'spend': 200.0,  # Above threshold
            'conversions': 30,
            'impressions': 60000
        }
        
        decision = _analyze_campaign_performance('fb:123456', high_performance_metrics, self.experiment)
        
        self.assertIsNotNone(decision)
        self.assertTrue(decision['should_scale'])
        self.assertEqual(decision['action_type'], ScalingAction.ScalingActionType.BUDGET_INCREASE)
        self.assertEqual(decision['action_details']['increase_percentage'], 25)
        self.assertIn('High performance', decision['action_details']['reason'])
    
    @patch('optimization.tasks.getattr')
    def test_analyze_campaign_performance_budget_decrease(self, mock_getattr):
        """Test budget decrease rule triggered"""
        # Mock getattr to return specific threshold values
        def mock_getattr_side_effect(obj, name, default=None):
            if hasattr(obj, '__name__') and obj.__name__ == 'settings':
                threshold_map = {
                    'SCALING_CTR_LOW_THRESHOLD': 0.02,
                    'SCALING_CPA_HIGH_THRESHOLD': 50.0,
                    'SCALING_SPEND_MIN_THRESHOLD': 100.0,
                    'SCALING_CTR_HIGH_THRESHOLD': 0.05,
                    'SCALING_CPA_LOW_THRESHOLD': 20.0,
                    'SCALING_ROAS_MIN_THRESHOLD': 2.0,
                }
                return threshold_map.get(name, default)
            return default
        
        mock_getattr.side_effect = mock_getattr_side_effect
        
        # Create low-performing metrics
        low_performance_metrics = {
            'ctr': 0.015,  # Below threshold
            'cpa': 60.0,   # Above threshold
            'roas': 1.5,   # Below threshold
            'spend': 200.0,  # Above threshold
            'conversions': 5,
            'impressions': 30000
        }
        
        decision = _analyze_campaign_performance('fb:123456', low_performance_metrics, self.experiment)
        
        self.assertIsNotNone(decision)
        self.assertTrue(decision['should_scale'])
        self.assertEqual(decision['action_type'], ScalingAction.ScalingActionType.BUDGET_DECREASE)
        self.assertEqual(decision['action_details']['decrease_percentage'], 30)
        self.assertIn('Low performance', decision['action_details']['reason'])
    
    @patch('optimization.tasks.getattr')
    def test_analyze_campaign_performance_audience_expansion(self, mock_getattr):
        """Test audience expansion rule triggered"""
        # Mock getattr to return specific threshold values
        def mock_getattr_side_effect(obj, name, default=None):
            if hasattr(obj, '__name__') and obj.__name__ == 'settings':
                threshold_map = {
                    'SCALING_CTR_LOW_THRESHOLD': 0.02,
                    'SCALING_CPA_HIGH_THRESHOLD': 50.0,
                    'SCALING_ROAS_MIN_THRESHOLD': 2.0,
                    'SCALING_SPEND_MIN_THRESHOLD': 100.0,
                    'SCALING_CTR_HIGH_THRESHOLD': 0.05,
                    'SCALING_CPA_LOW_THRESHOLD': 20.0,
                }
                return threshold_map.get(name, default)
            return default
        
        mock_getattr.side_effect = mock_getattr_side_effect
        
        # Create metrics for audience expansion scenario
        expansion_metrics = {
            'ctr': 0.015,  # Below threshold
            'cpa': 25.0,   # Below threshold
            'roas': 2.5,   # Above threshold
            'spend': 200.0,  # Above threshold
            'conversions': 15,  # Has conversions
            'impressions': 15000  # Above threshold
        }
        
        decision = _analyze_campaign_performance('fb:123456', expansion_metrics, self.experiment)
        
        self.assertIsNotNone(decision)
        self.assertTrue(decision['should_scale'])
        self.assertEqual(decision['action_type'], ScalingAction.ScalingActionType.AUDIENCE_EXPAND)
        self.assertEqual(decision['action_details']['expansion_factor'], 1.5)
        self.assertIn('expanding audience', decision['action_details']['reason'])
    
    @patch('optimization.tasks.settings')
    def test_analyze_campaign_performance_no_scaling(self, mock_settings):
        """Test no scaling when performance is ambiguous"""
        # Mock settings
        mock_settings.SCALING_CTR_HIGH_THRESHOLD = 0.05
        mock_settings.SCALING_CTR_LOW_THRESHOLD = 0.02
        mock_settings.SCALING_CPA_HIGH_THRESHOLD = 50.0
        mock_settings.SCALING_CPA_LOW_THRESHOLD = 20.0
        mock_settings.SCALING_ROAS_MIN_THRESHOLD = 2.0
        mock_settings.SCALING_SPEND_MIN_THRESHOLD = 100.0
        
        # Create ambiguous metrics (doesn't meet any clear rule)
        ambiguous_metrics = {
            'ctr': 0.03,  # Between thresholds
            'cpa': 30.0,  # Between thresholds
            'roas': 1.8,  # Below threshold
            'spend': 200.0,
            'conversions': 10,
            'impressions': 8000  # Below threshold
        }
        
        decision = _analyze_campaign_performance('fb:123456', ambiguous_metrics, self.experiment)
        
        self.assertIsNone(decision)
    
    @patch('optimization.tasks.settings')
    def test_analyze_campaign_performance_insufficient_spend(self, mock_settings):
        """Test no scaling when spend is insufficient"""
        # Mock settings
        mock_settings.SCALING_CTR_HIGH_THRESHOLD = 0.05
        mock_settings.SCALING_CPA_LOW_THRESHOLD = 20.0
        mock_settings.SCALING_ROAS_MIN_THRESHOLD = 2.0
        mock_settings.SCALING_SPEND_MIN_THRESHOLD = 100.0
        
        # Create metrics with insufficient spend
        low_spend_metrics = {
            'ctr': 0.06,  # High CTR
            'cpa': 15.0,  # Low CPA
            'roas': 2.5,  # Good ROAS
            'spend': 50.0,  # Below threshold
            'conversions': 30,
            'impressions': 60000
        }
        
        decision = _analyze_campaign_performance('fb:123456', low_spend_metrics, self.experiment)
        
        self.assertIsNone(decision)


class ScalingActionCreationTest(TestCase):
    """Test cases for scaling action creation"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.experiment = OptimizationExperiment.objects.create(
            name='Scaling Action Test Experiment',
            description='Test scaling action creation',
            experiment_type=OptimizationExperiment.ExperimentType.AB_TEST,
            linked_campaign_ids=['fb:123456'],
            hypothesis='Test scaling action hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            status=OptimizationExperiment.ExperimentStatus.RUNNING,
            created_by=self.user
        )
    
    def test_create_budget_increase_action(self):
        """Test creation of budget increase scaling action"""
        decision = {
            'campaign_id': 'fb:123456',
            'should_scale': True,
            'action_type': ScalingAction.ScalingActionType.BUDGET_INCREASE,
            'action_details': {
                'increase_percentage': 25,
                'current_spend': 150.0,
                'reason': 'High performance detected'
            }
        }
        
        scaling_action = _create_scaling_action(self.experiment, decision, performed_by=self.user)
        
        self.assertIsNotNone(scaling_action)
        self.assertEqual(scaling_action.experiment_id, self.experiment)
        self.assertEqual(scaling_action.campaign_id, 'fb:123456')
        self.assertEqual(scaling_action.action_type, ScalingAction.ScalingActionType.BUDGET_INCREASE)
        self.assertEqual(scaling_action.action_details['increase_percentage'], 25)
        self.assertEqual(scaling_action.action_details['reason'], 'High performance detected')
    
    def test_create_audience_expansion_action(self):
        """Test creation of audience expansion scaling action"""
        decision = {
            'campaign_id': 'tt:789012',
            'should_scale': True,
            'action_type': ScalingAction.ScalingActionType.AUDIENCE_EXPAND,
            'action_details': {
                'expansion_factor': 1.5,
                'current_impressions': 15000,
                'reason': 'Low CTR but has conversions, expanding audience'
            }
        }
        
        scaling_action = _create_scaling_action(self.experiment, decision, performed_by=self.user)
        
        self.assertIsNotNone(scaling_action)
        self.assertEqual(scaling_action.experiment_id, self.experiment)
        self.assertEqual(scaling_action.campaign_id, 'tt:789012')
        self.assertEqual(scaling_action.action_type, ScalingAction.ScalingActionType.AUDIENCE_EXPAND)
        self.assertEqual(scaling_action.action_details['expansion_factor'], 1.5)
        self.assertIn('expanding audience', scaling_action.action_details['reason'])
    
    def test_create_scaling_action_failure(self):
        """Test handling of scaling action creation failure"""
        decision = {
            'campaign_id': 'fb:123456',
            'should_scale': True,
            'action_type': 'invalid_action_type',  # Invalid action type
            'action_details': {
                'increase_percentage': 25,
                'reason': 'Test reason'
            }
        }
        
        with patch('optimization.tasks.ScalingAction.objects.create') as mock_create:
            mock_create.side_effect = Exception('Database error')
            
            scaling_action = _create_scaling_action(self.experiment, decision, performed_by=self.user)
            
            self.assertIsNone(scaling_action)


class PlatformAPITest(TestCase):
    """Test cases for platform API functions"""
    
    @patch('optimization.tasks.requests.get')
    @patch('optimization.tasks.settings')
    def test_fetch_facebook_metrics(self, mock_settings, mock_get):
        """Test Facebook metrics fetching"""
        # Mock settings
        mock_settings.FACEBOOK_ACCESS_TOKEN = 'test_token'
        
        # Mock API response
        mock_response = Mock()
        mock_response.json.return_value = {
            'data': [{
                'spend': '150.00',
                'impressions': '50000',
                'clicks': '2500',
                'conversions': '25',
                'ctr': '5.0',
                'cpc': '0.06'
            }]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        metrics = _fetch_facebook_metrics('123456')
        
        self.assertEqual(metrics['spend'], 150.0)
        self.assertEqual(metrics['impressions'], 50000)
        self.assertEqual(metrics['clicks'], 2500)
        self.assertEqual(metrics['conversions'], 25)
        self.assertEqual(metrics['ctr'], 0.05)  # Converted from percentage
        self.assertEqual(metrics['cpa'], 6.0)
    
    @patch('optimization.tasks.settings')
    def test_fetch_facebook_metrics_no_token(self, mock_settings):
        """Test Facebook metrics fetching without token"""
        mock_settings.FACEBOOK_ACCESS_TOKEN = None
        
        metrics = _fetch_facebook_metrics('123456')
        
        self.assertEqual(metrics, {})
    
    @patch('optimization.tasks.requests.post')
    @patch('optimization.tasks.settings')
    def test_fetch_tiktok_metrics(self, mock_settings, mock_post):
        """Test TikTok metrics fetching"""
        # Mock settings
        mock_settings.TIKTOK_ACCESS_TOKEN = 'test_token'
        mock_settings.TIKTOK_ADVERTISER_ID = 'test_advertiser'
        
        # Mock API response
        mock_response = Mock()
        mock_response.json.return_value = {
            'data': {
                'list': [{
                    'metrics': {
                        'spend': 120.0,
                        'impressions': 40000,
                        'clicks': 2000,
                        'conversions': 20,
                        'ctr': 5.0,
                        'cpc': 0.06
                    }
                }]
            }
        }
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response
        
        metrics = _fetch_tiktok_metrics('789012')
        
        self.assertEqual(metrics['spend'], 120.0)
        self.assertEqual(metrics['impressions'], 40000)
        self.assertEqual(metrics['clicks'], 2000)
        self.assertEqual(metrics['conversions'], 20)
        self.assertEqual(metrics['ctr'], 0.05)  # Converted from percentage
        self.assertEqual(metrics['cpa'], 6.0)
    
    @patch('optimization.tasks.settings')
    def test_fetch_tiktok_metrics_no_credentials(self, mock_settings):
        """Test TikTok metrics fetching without credentials"""
        mock_settings.TIKTOK_ACCESS_TOKEN = None
        mock_settings.TIKTOK_ADVERTISER_ID = None
        
        metrics = _fetch_tiktok_metrics('789012')
        
        self.assertEqual(metrics, {})
    
    @patch('optimization.tasks.requests.get')
    @patch('optimization.tasks.settings')
    def test_fetch_instagram_metrics(self, mock_settings, mock_get):
        """Test Instagram metrics fetching"""
        # Mock settings
        mock_settings.FACEBOOK_ACCESS_TOKEN = 'test_token'
        
        # Mock API response
        mock_response = Mock()
        mock_response.json.return_value = {
            'data': [{
                'spend': '100.00',
                'impressions': '35000',
                'clicks': '1750',
                'conversions': '18',
                'ctr': '5.0',
                'cpc': '0.057'
            }]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        metrics = _fetch_instagram_metrics('345678')
        
        self.assertEqual(metrics['spend'], 100.0)
        self.assertEqual(metrics['impressions'], 35000)
        self.assertEqual(metrics['clicks'], 1750)
        self.assertEqual(metrics['conversions'], 18)
        self.assertEqual(metrics['ctr'], 0.05)  # Converted from percentage
        self.assertEqual(metrics['cpa'], 5.555555555555555)
    
    @patch('optimization.tasks.settings')
    def test_fetch_instagram_metrics_no_token(self, mock_settings):
        """Test Instagram metrics fetching without token"""
        mock_settings.FACEBOOK_ACCESS_TOKEN = None
        
        metrics = _fetch_instagram_metrics('345678')
        
        self.assertEqual(metrics, {})
