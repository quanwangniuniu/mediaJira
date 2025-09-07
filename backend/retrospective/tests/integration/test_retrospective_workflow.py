"""
Integration tests for retrospective workflow
Tests the complete lifecycle from campaign completion to report approval
"""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import transaction
from unittest.mock import patch, MagicMock

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, Insight, CampaignMetric, RetrospectiveStatus
from retrospective.services import RetrospectiveService
from retrospective.tasks import generate_retrospective, generate_insights_for_retrospective
from retrospective.rules import InsightRules

User = get_user_model()


class TestRetrospectiveWorkflow(TestCase):
    """Test complete retrospective workflow"""

    def setUp(self):
        """Set up test data"""
        # Create organization
        self.organization = Organization.objects.create(
            name="Test Agency",
            email_domain="testagency.com"
        )
        
        # Create users
        self.media_buyer = User.objects.create_user(
            username="buyer1",
            email="buyer@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        self.manager = User.objects.create_user(
            username="manager1",
            email="manager@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        # Create campaign
        self.campaign = Project.objects.create(
            name="Test Campaign",
            organization=self.organization,
            created_by=self.media_buyer
        )
        
        # Create KPI data
        self.create_kpi_data()

    def create_kpi_data(self):
        """Create test KPI data"""
        base_date = timezone.now().date()
        
        # Create 30 days of KPI data
        for i in range(30):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i * 10),
                clicks=50 + (i * 2),
                conversions=5 + (i * 0.1),
                cost_per_click=Decimal('2.50') + Decimal(str(i * 0.01)),
                cost_per_impression=Decimal('0.10') + Decimal(str(i * 0.001)),
                cost_per_conversion=Decimal('25.00') + Decimal(str(i * 0.1)),
                click_through_rate=Decimal('0.05') + Decimal(str(i * 0.001)),
                conversion_rate=Decimal('0.10') + Decimal(str(i * 0.001))
            )

    def test_retrospective_auto_creation(self):
        """Test automatic retrospective creation from campaign completion"""
        # Simulate campaign completion
        with patch('retrospective.signals.campaign_completed') as mock_signal:
            # Create retrospective manually (simulating signal)
            retrospective = RetrospectiveService.create_retrospective_for_campaign(
                campaign_id=str(self.campaign.id),
                created_by=self.media_buyer
            )
            
            # Verify retrospective was created
            self.assertEqual(retrospective.campaign, self.campaign)
            self.assertEqual(retrospective.created_by, self.media_buyer)
            self.assertEqual(retrospective.status, RetrospectiveStatus.SCHEDULED)
            self.assertIsNotNone(retrospective.scheduled_at)

    def test_retrospective_status_transitions(self):
        """Test valid status transitions"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        # Test valid transitions
        self.assertTrue(retrospective.can_transition_to(RetrospectiveStatus.IN_PROGRESS))
        self.assertTrue(retrospective.can_transition_to(RetrospectiveStatus.CANCELLED))
        
        # Transition to in_progress
        retrospective.status = RetrospectiveStatus.IN_PROGRESS
        retrospective.started_at = timezone.now()
        retrospective.save()
        
        # Test next valid transitions
        self.assertTrue(retrospective.can_transition_to(RetrospectiveStatus.COMPLETED))
        self.assertTrue(retrospective.can_transition_to(RetrospectiveStatus.CANCELLED))
        self.assertFalse(retrospective.can_transition_to(RetrospectiveStatus.SCHEDULED))
        
        # Transition to completed
        retrospective.status = RetrospectiveStatus.COMPLETED
        retrospective.completed_at = timezone.now()
        retrospective.save()
        
        # Test final transition
        self.assertTrue(retrospective.can_transition_to(RetrospectiveStatus.REPORTED))
        self.assertFalse(retrospective.can_transition_to(RetrospectiveStatus.IN_PROGRESS))

    def test_invalid_status_transitions(self):
        """Test invalid status transitions are rejected"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        # Test invalid transitions
        self.assertFalse(retrospective.can_transition_to(RetrospectiveStatus.COMPLETED))
        self.assertFalse(retrospective.can_transition_to(RetrospectiveStatus.REPORTED))
        
        # Test transition to completed without going through in_progress
        with self.assertRaises(ValueError):
            retrospective.status = RetrospectiveStatus.COMPLETED
            retrospective.save()

    def test_kpi_aggregation(self):
        """Test KPI data aggregation"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer
        )
        
        # Aggregate KPI data
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # Verify aggregation structure
        self.assertIn('aggregated_metrics', kpi_data)
        self.assertIn('total_metrics', kpi_data)
        self.assertIn('campaign_id', kpi_data)
        
        # Verify metrics are aggregated
        metrics = kpi_data['aggregated_metrics']
        self.assertIn('ROI', metrics)
        self.assertIn('CTR', metrics)
        self.assertIn('CPC', metrics)
        
        # Verify aggregation calculations
        roi_data = metrics['ROI']
        self.assertIn('current_value', roi_data)
        self.assertIn('average_value', roi_data)
        self.assertIn('min_value', roi_data)
        self.assertIn('max_value', roi_data)
        self.assertIn('target_value', roi_data)

    def test_insight_generation(self):
        """Test insight generation from KPI data"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer
        )
        
        # Generate insights
        insights = RetrospectiveService.generate_insights_batch(
            retrospective_id=str(retrospective.id),
            user=self.media_buyer
        )
        
        # Verify insights were generated
        self.assertGreater(len(insights), 0)
        
        # Verify insight properties
        for insight in insights:
            self.assertEqual(insight.retrospective, retrospective)
            self.assertIn(insight.severity, ['low', 'medium', 'high', 'critical'])
            self.assertIsNotNone(insight.title)
            self.assertIsNotNone(insight.description)
            self.assertIsNotNone(insight.rule_id)
            self.assertIsInstance(insight.suggested_actions, list)

    def test_insight_generation_with_different_kpi_inputs(self):
        """Test insight generation with various KPI scenarios"""
        # Create campaign with poor performance KPIs
        poor_campaign = Project.objects.create(
            name="Poor Performance Campaign",
            organization=self.organization,
            created_by=self.media_buyer
        )
        
        # Create poor KPI data
        CampaignMetric.objects.create(
            campaign=poor_campaign,
            date=timezone.now().date(),
            impressions=1000,
            clicks=10,  # Very low CTR
            conversions=1,  # Very low conversion rate
            cost_per_click=Decimal('10.00'),  # High CPC
            cost_per_impression=Decimal('1.00'),  # High CPM
            cost_per_conversion=Decimal('100.00'),  # High CPA
            click_through_rate=Decimal('0.01'),  # 1% CTR
            conversion_rate=Decimal('0.10')  # 10% conversion rate
        )
        
        retrospective = RetrospectiveTask.objects.create(
            campaign=poor_campaign,
            created_by=self.media_buyer
        )
        
        # Generate insights
        insights = RetrospectiveService.generate_insights_batch(
            retrospective_id=str(retrospective.id)
        )
        
        # Should generate high/critical severity insights for poor performance
        high_severity_insights = [i for i in insights if i.severity in ['high', 'critical']]
        self.assertGreater(len(high_severity_insights), 0)

    def test_concurrent_retrospective_creation(self):
        """Test handling of concurrent retrospective creation"""
        # Simulate concurrent creation attempts
        with transaction.atomic():
            # First creation should succeed
            retrospective1 = RetrospectiveService.create_retrospective_for_campaign(
                campaign_id=str(self.campaign.id),
                created_by=self.media_buyer
            )
            
            # Second creation should return existing retrospective
            retrospective2 = RetrospectiveService.create_retrospective_for_campaign(
                campaign_id=str(self.campaign.id),
                created_by=self.manager
            )
            
            # Should be the same retrospective
            self.assertEqual(retrospective1.id, retrospective2.id)

    def test_retrospective_summary(self):
        """Test comprehensive retrospective summary"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.COMPLETED,
            started_at=timezone.now() - timedelta(hours=2),
            completed_at=timezone.now()
        )
        
        # Generate some insights
        RetrospectiveService.generate_insights_batch(
            retrospective_id=str(retrospective.id)
        )
        
        # Get summary
        summary = RetrospectiveService.get_retrospective_summary(str(retrospective.id))
        
        # Verify summary structure
        self.assertIn('retrospective_id', summary)
        self.assertIn('campaign_name', summary)
        self.assertIn('status', summary)
        self.assertIn('kpi_summary', summary)
        self.assertIn('insights_summary', summary)
        self.assertIn('duration_hours', summary)
        
        # Verify insights summary
        insights_summary = summary['insights_summary']
        self.assertIn('total', insights_summary)
        self.assertIn('critical', insights_summary)
        self.assertIn('high', insights_summary)
        self.assertIn('medium', insights_summary)
        self.assertIn('low', insights_summary)

    def test_report_generation_workflow(self):
        """Test complete report generation workflow"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.COMPLETED,
            started_at=timezone.now() - timedelta(hours=1),
            completed_at=timezone.now()
        )
        
        # Generate insights first
        RetrospectiveService.generate_insights_batch(
            retrospective_id=str(retrospective.id)
        )
        
        # Generate report
        report_url = RetrospectiveService.generate_report(str(retrospective.id))
        
        # Verify report was generated
        self.assertIsNotNone(report_url)
        self.assertTrue(report_url.startswith('/media/reports/'))
        
        # Refresh retrospective from DB
        retrospective.refresh_from_db()
        self.assertEqual(retrospective.report_url, report_url)
        self.assertIsNotNone(retrospective.report_generated_at)

    def test_report_approval_workflow(self):
        """Test report approval workflow"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.COMPLETED,
            report_url="/media/reports/test_report.pdf",
            report_generated_at=timezone.now()
        )
        
        # Approve report
        approved_retrospective = RetrospectiveService.approve_report(
            retrospective_id=str(retrospective.id),
            approved_by=self.manager
        )
        
        # Verify approval
        self.assertEqual(approved_retrospective.reviewed_by, self.manager)
        self.assertIsNotNone(approved_retrospective.reviewed_at)
        self.assertEqual(approved_retrospective.status, RetrospectiveStatus.REPORTED)

    def test_error_handling_and_rollback(self):
        """Test error handling and rollback scenarios"""
        # Test retrospective creation with invalid campaign
        with self.assertRaises(ValueError):
            RetrospectiveService.create_retrospective_for_campaign(
                campaign_id=str(uuid.uuid4()),  # Non-existent campaign
                created_by=self.media_buyer
            )
        
        # Test report generation for non-completed retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        with self.assertRaises(ValueError):
            RetrospectiveService.generate_report(str(retrospective.id))
        
        # Test report approval without generated report
        retrospective.status = RetrospectiveStatus.COMPLETED
        retrospective.save()
        
        with self.assertRaises(ValueError):
            RetrospectiveService.approve_report(
                retrospective_id=str(retrospective.id),
                approved_by=self.manager
            )

    @patch('retrospective.tasks.generate_retrospective.delay')
    def test_celery_task_integration(self, mock_task):
        """Test integration with Celery tasks"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer
        )
        
        # Mock Celery task
        mock_task.return_value = MagicMock(id='test-task-id')
        
        # Start analysis (this would normally trigger Celery task)
        from retrospective.views import RetrospectiveTaskViewSet
        viewset = RetrospectiveTaskViewSet()
        viewset.request = MagicMock(user=self.media_buyer)
        
        # This would normally call the Celery task
        # In real implementation, this would be tested with Celery test worker
        self.assertTrue(True)  # Placeholder for actual Celery integration test


@pytest.mark.django_db
class TestRetrospectiveWorkflowPerformance:
    """Performance tests for retrospective workflow"""
    
    def test_large_kpi_dataset_aggregation(self):
        """Test KPI aggregation with large dataset"""
        # Create organization and campaign
        org = Organization.objects.create(name="Perf Test Org")
        campaign = Project.objects.create(name="Perf Test Campaign", organization=org)
        
        # Create 1000+ KPI records
        base_date = timezone.now().date()
        for i in range(1000):
            date = base_date - timedelta(days=i % 365)  # Spread over a year
            CampaignMetric.objects.create(
                campaign=campaign,
                date=date,
                impressions=1000 + (i % 100),
                clicks=50 + (i % 10),
                conversions=5 + (i % 5),
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # Create retrospective
        user = User.objects.create_user(username="perfuser", email="perf@test.com")
        retrospective = RetrospectiveTask.objects.create(
            campaign=campaign,
            created_by=user
        )
        
        # Time the aggregation
        import time
        start_time = time.time()
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        end_time = time.time()
        
        # Should complete in under 2 seconds
        assert (end_time - start_time) < 2.0
        assert 'aggregated_metrics' in kpi_data
        assert kpi_data['total_metrics'] == 1000
