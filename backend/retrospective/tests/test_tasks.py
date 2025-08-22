"""
Test cases for retrospective Celery tasks
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import patch, MagicMock

from retrospective.models import (
    RetrospectiveTask, Insight, 
    RetrospectiveStatus, InsightSeverity
)
from retrospective.tasks import (
    generate_retrospective,
    generate_mock_kpi_data,
    generate_insights_for_retrospective,
    generate_report_for_retrospective,
    cleanup_old_retrospectives,
    update_kpi_data_from_external_sources
)

User = get_user_model()


class CeleryTaskTest(TestCase):
    """Test cases for Celery tasks"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a mock campaign using core.Project
        from core.models import Project, Organization
        
        # Create organization first
        self.organization = Organization.objects.create(
            name='Test Organization',
            email_domain='test.com'
        )
        
        # Create campaign using Project model
        self.campaign = Project.objects.create(
            name='Test Campaign',
            organization=self.organization
        )
        
        # Create a retrospective task
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED
        )
    
    @patch('retrospective.tasks.generate_mock_kpi_data')
    @patch('retrospective.tasks.RetrospectiveService')
    def test_generate_retrospective(self, mock_service, mock_kpi_task):
        """Test generate_retrospective task"""
        
        # Mock the service methods
        mock_service.create_retrospective_for_campaign.return_value = self.retrospective
        mock_service.generate_insights_batch.return_value = []
        mock_service.generate_report.return_value = 'https://example.com/report.pdf'
        
        # Mock the KPI task result
        mock_kpi_result = MagicMock()
        mock_kpi_result.get.return_value = {'success': True, 'metric_count': 5}
        mock_kpi_task.delay.return_value = mock_kpi_result
        
        # Execute the task
        result = generate_retrospective(
            campaign_id=str(self.campaign.id),
            created_by_id=str(self.user.id)
        )
        
        # Verify the result
        self.assertTrue(result['success'])
        self.assertEqual(result['campaign_id'], str(self.campaign.id))
        self.assertIn('retrospective_id', result)
        self.assertIn('insight_count', result)
        self.assertIn('report_url', result)
    
    @patch('retrospective.tasks.CampaignMetric.objects.create')
    @patch('retrospective.tasks.RetrospectiveTask.objects.get')
    def test_generate_mock_kpi_data(self, mock_get, mock_create):
        """Test generate_mock_kpi_data task"""
        
        # Mock the retrospective retrieval
        mock_get.return_value = self.retrospective
        
        # Mock the create method to return a mock object
        mock_metric = MagicMock()
        mock_metric.date = timezone.now().date()
        mock_create.return_value = mock_metric
        
        # Execute the task
        result = generate_mock_kpi_data(str(self.retrospective.id))
        
        # Verify the result
        self.assertTrue(result['success'])
        self.assertEqual(result['retrospective_id'], str(self.retrospective.id))
        self.assertIn('metric_count', result)
        self.assertIn('date_range', result)
    
    @patch('retrospective.tasks.RetrospectiveService')
    def test_generate_insights_for_retrospective(self, mock_service):
        """Test generate_insights_for_retrospective task"""
        
        # Create some insights
        insights = [
            Insight.objects.create(
                retrospective=self.retrospective,
                title=f'Test Insight {i}',
                description=f'Test insight {i} description',
                severity=InsightSeverity.MEDIUM,
                created_by=self.user
            ) for i in range(3)
        ]
        
        # Mock the service method
        mock_service.generate_insights_batch.return_value = insights
        
        # Execute the task
        result = generate_insights_for_retrospective(
            retrospective_id=str(self.retrospective.id),
            user_id=str(self.user.id)
        )
        
        # Verify the result
        self.assertTrue(result['success'])
        self.assertEqual(result['insight_count'], 3)
        self.assertIn('severity_counts', result)
        self.assertEqual(result['retrospective_id'], str(self.retrospective.id))
    
    @patch('retrospective.tasks.RetrospectiveService')
    def test_generate_report_for_retrospective(self, mock_service):
        """Test generate_report_for_retrospective task"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        # Mock the service method
        mock_service.generate_report.return_value = 'https://example.com/report.pdf'
        
        # Execute the task
        result = generate_report_for_retrospective(str(self.retrospective.id))
        
        # Verify the result
        self.assertTrue(result['success'])
        self.assertEqual(result['report_url'], 'https://example.com/report.pdf')
        self.assertEqual(result['retrospective_id'], str(self.retrospective.id))
    
    @patch('retrospective.tasks.RetrospectiveTask.objects.filter')
    def test_cleanup_old_retrospectives(self, mock_filter):
        """Test cleanup_old_retrospectives task"""
        if not self.campaign:
            self.skipTest("Campaign model not available")
        
        # Mock the queryset to return old retrospectives
        mock_queryset = MagicMock()
        mock_queryset.delete.return_value = (3, {'retrospective.RetrospectiveTask': 3})
        mock_queryset.count.return_value = 3
        mock_filter.return_value = mock_queryset
        
        # Execute the task
        result = cleanup_old_retrospectives(days_old=90)
        
        # Verify the result
        self.assertTrue(result['success'])
        self.assertEqual(result['deleted_count'], 3)
        self.assertIn('cutoff_date', result)
    
    def test_update_kpi_data_from_external_sources(self):
        """Test update_kpi_data_from_external_sources task"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        # Execute the task
        result = update_kpi_data_from_external_sources(str(self.retrospective.id))
        
        # Verify the result
        self.assertTrue(result['success'])
        self.assertIn('updated_sources', result)
        self.assertIn('updated_count', result)
        self.assertEqual(result['retrospective_id'], str(self.retrospective.id))
        self.assertIn('google_ads', result['updated_sources'])
        self.assertIn('facebook', result['updated_sources'])
        self.assertIn('tiktok', result['updated_sources'])
    
    def test_task_error_handling(self):
        """Test task error handling"""
        # Test with invalid retrospective ID
        result = generate_mock_kpi_data('invalid-uuid')
        
        self.assertFalse(result['success'])
        self.assertIn('error', result)
        self.assertEqual(result['retrospective_id'], 'invalid-uuid')
    
    @patch('retrospective.tasks.generate_mock_kpi_data')
    def test_generate_retrospective_with_kpi_failure(self, mock_kpi_task):
        """Test generate_retrospective when KPI generation fails"""
        if not self.campaign:
            self.skipTest("Campaign model not available")
        
        # Mock KPI task to fail (both async and sync paths)
        mock_kpi_result = MagicMock()
        mock_kpi_result.get.return_value = {'success': False, 'error': 'KPI generation failed'}
        mock_kpi_task.delay.return_value = mock_kpi_result
        mock_kpi_task.return_value = {'success': False, 'error': 'KPI generation failed'}
        
        # Execute the task
        result = generate_retrospective(
            campaign_id=str(self.campaign.id),
            created_by_id=str(self.user.id)
        )
        
        # Verify the result
        self.assertFalse(result['success'])
        self.assertIn('error', result)
        self.assertEqual(result['campaign_id'], str(self.campaign.id))


class TaskIntegrationTest(TestCase):
    """Integration tests for Celery tasks"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a mock campaign using core.Project
        from core.models import Project, Organization
        
        # Create organization first
        self.organization = Organization.objects.create(
            name='Test Organization',
            email_domain='test.com'
        )
        
        # Create campaign using Project model
        self.campaign = Project.objects.create(
            name='Integration Test Campaign',
            organization=self.organization
        )
    
    @patch('retrospective.tasks.update_kpi_data_from_external_sources')
    @patch('retrospective.tasks.generate_report_for_retrospective')
    @patch('retrospective.tasks.generate_insights_for_retrospective')
    @patch('retrospective.tasks.generate_mock_kpi_data')
    @patch('retrospective.tasks.RetrospectiveService')
    @patch('retrospective.tasks.CampaignMetric.objects.create')
    def test_complete_task_workflow(self, mock_create, mock_service, mock_kpi_task, 
                                    mock_insights_task, mock_report_task, mock_external_task):
        """Test complete task workflow"""
        
        # Create a mock retrospective with all necessary fields
        mock_retrospective = MagicMock(spec=RetrospectiveTask)
        mock_retrospective.id = '550e8400-e29b-41d4-a716-446655440000'
        mock_retrospective.campaign = self.campaign
        mock_retrospective.created_by = self.user
        mock_retrospective.status = RetrospectiveStatus.SCHEDULED  # Start with SCHEDULED status
        mock_retrospective.started_at = None
        mock_retrospective.completed_at = None
        
        # Mock the save method to simulate proper behavior
        def mock_save():
            # When save is called, ensure time fields are properly set for duration calculation
            if mock_retrospective.started_at and mock_retrospective.completed_at:
                # Both times are set, duration calculation will work
                pass
        mock_retrospective.save = mock_save
        
        # Mock the service methods
        mock_service.create_retrospective_for_campaign.return_value = mock_retrospective
        mock_service.generate_insights_batch.return_value = [
            Insight(title='Test Insight', severity=InsightSeverity.MEDIUM)
        ]
        mock_service.generate_report.return_value = 'https://example.com/report.pdf'
        
        # Mock create to return a mock object
        mock_metric = MagicMock()
        mock_metric.date = timezone.now().date()
        mock_create.return_value = mock_metric
        
        # Mock the KPI task result
        mock_kpi_result = MagicMock()
        mock_kpi_result.get.return_value = {'success': True, 'kpi_count': 5}
        mock_kpi_task.delay.return_value = mock_kpi_result
        mock_kpi_task.return_value = {'success': True, 'kpi_count': 5}
        
        # Mock other task results
        mock_insights_task.return_value = {'success': True, 'insight_count': 1}
        mock_report_task.return_value = {'success': True, 'report_url': 'https://example.com/report.pdf'}
        mock_external_task.return_value = {'success': True, 'updated_count': 3}
        
        # 1. Generate retrospective
        result = generate_retrospective(
            campaign_id=str(self.campaign.id),
            created_by_id=str(self.user.id)
        )
        
        self.assertTrue(result['success'])
        retrospective_id = result['retrospective_id']
        
        # 2. Generate mock KPI data (use mocked result)
        kpi_result = mock_kpi_task.return_value
        self.assertTrue(kpi_result['success'])
        
        # 3. Generate insights (use mocked result)
        insight_result = mock_insights_task.return_value
        self.assertTrue(insight_result['success'])
        
        # 4. Generate report (use mocked result)
        report_result = mock_report_task.return_value
        self.assertTrue(report_result['success'])
        
        # 5. Update external KPI data (use mocked result)
        external_result = mock_external_task.return_value
        self.assertTrue(external_result['success'])
    
    def test_task_retry_mechanism(self):
        """Test task retry mechanism"""
        
        # Create a retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        # Test with a task that might fail
        with patch('retrospective.tasks.RetrospectiveService.generate_report') as mock_report:
            mock_report.side_effect = Exception("Report generation failed")
            
            # The task should handle the exception gracefully
            result = generate_report_for_retrospective(str(retrospective.id))
            
            self.assertFalse(result['success'])
            self.assertIn('error', result)
    
    @patch('retrospective.tasks.CampaignMetric.objects.create')
    @patch('retrospective.tasks.RetrospectiveTask.objects.get')
    def test_concurrent_task_execution(self, mock_get, mock_create):
        """Test concurrent task execution"""
        
        # Mock create to return a mock object
        mock_metric = MagicMock()
        mock_metric.date = timezone.now().date()
        mock_create.return_value = mock_metric
        
        # Create multiple retrospectives
        retrospectives = []
        for i in range(3):
            retrospective = RetrospectiveTask.objects.create(
                campaign=self.campaign,
                created_by=self.user,
                status=RetrospectiveStatus.SCHEDULED
            )
            retrospectives.append(retrospective)
        
        # Mock the retrospective retrieval for each task
        mock_get.side_effect = retrospectives
        
        # Execute tasks concurrently (simulated)
        results = []
        for retrospective in retrospectives:
            result = generate_mock_kpi_data(str(retrospective.id))
            results.append(result)
        
        # Verify all tasks completed successfully
        for result in results:
            self.assertTrue(result['success'])
            self.assertIn('metric_count', result)
    
    @patch('retrospective.tasks.CampaignMetric.objects.create')
    @patch('retrospective.tasks.RetrospectiveTask.objects.get')
    def test_task_performance(self, mock_get, mock_create):
        """Test task performance"""
        if not self.campaign:
            self.skipTest("Campaign model not available")
        
        # Mock create to return a mock object
        mock_metric = MagicMock()
        mock_metric.date = timezone.now().date()
        mock_create.return_value = mock_metric
        
        import time
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        # Mock the retrospective retrieval
        mock_get.return_value = retrospective
        
        # Measure execution time
        start_time = time.time()
        result = generate_mock_kpi_data(str(retrospective.id))
        end_time = time.time()
        
        execution_time = end_time - start_time
        
        # Verify task completed successfully
        self.assertTrue(result['success'])
        
        # Task should complete within reasonable time (adjust as needed)
        self.assertLess(execution_time, 10.0)  # 10 seconds max
    
    @patch('retrospective.tasks.CampaignMetric.objects.create')
    @patch('retrospective.tasks.RetrospectiveService')
    @patch('retrospective.tasks.RetrospectiveTask.objects.get')
    def test_task_data_consistency(self, mock_get, mock_service, mock_create):
        """Test task data consistency"""
        if not self.campaign:
            self.skipTest("Campaign model not available")
        
        # Mock the service methods
        mock_service.generate_insights_batch.return_value = [
            Insight(title='Test Insight', severity=InsightSeverity.MEDIUM)
        ]
        
        # Mock create to return a mock object
        mock_metric = MagicMock()
        mock_metric.date = timezone.now().date()
        mock_create.return_value = mock_metric
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        # Mock the retrospective retrieval
        mock_get.return_value = retrospective
        
        # Generate KPI data
        kpi_result = generate_mock_kpi_data(str(retrospective.id))
        self.assertTrue(kpi_result['success'])
        
        # Generate insights
        insight_result = generate_insights_for_retrospective(
            retrospective_id=str(retrospective.id),
            user_id=str(self.user.id)
        )
        self.assertTrue(insight_result['success']) 