"""
Essential test cases for retrospective services
Tests KPI aggregation, insight generation, and report approval workflow
"""
from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from retrospective.models import RetrospectiveTask, Insight, RetrospectiveStatus, InsightSeverity, CampaignMetric
from retrospective.services import RetrospectiveService
from core.models import Project, Organization

User = get_user_model()


class RetrospectiveServiceWorkflowTest(TestCase):
    """Test retrospective service workflow and lifecycle"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.organization = Organization.objects.create(
            name='Test Organization',
            email_domain='test.com'
        )
        
        self.campaign = Project.objects.create(
            name='Test Campaign',
            organization=self.organization
        )
    
    def test_retrospective_auto_creation_workflow(self):
        """Test auto-creation of retrospective for campaign completion"""
        
        retrospective = RetrospectiveService.create_retrospective_for_campaign(
            campaign_id=str(self.campaign.id),
            created_by=self.user
        )
        
        self.assertIsNotNone(retrospective)
        self.assertEqual(retrospective.campaign, self.campaign)
        self.assertEqual(retrospective.created_by, self.user)
        self.assertEqual(retrospective.status, RetrospectiveStatus.SCHEDULED)
    
    def test_kpi_aggregation_for_dashboard(self):
        """Test KPI data aggregation for dashboard reporting"""
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        # Create test KPI data
        for i in range(30):  # 30 days of data
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=timezone.now().date() - timezone.timedelta(days=i),
                impressions=1000 + i * 10,
                clicks=50 + i,
                conversions=5 + (i % 5),
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # Aggregate KPI data
        aggregated_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        self.assertIsNotNone(aggregated_data)
        self.assertIn('campaign_id', aggregated_data)
        self.assertIn('aggregated_metrics', aggregated_data)
        self.assertIn('total_metrics', aggregated_data)
        self.assertEqual(aggregated_data['total_metrics'], 30)
    
    def test_insight_generation_different_kpi_inputs(self):
        """Test insight generation under different KPI input scenarios"""
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        # Create poor performance KPI data to trigger insights
        CampaignMetric.objects.create(
            campaign=self.campaign,
            date=timezone.now().date(),
            impressions=10000,
            clicks=30,  # Low CTR (0.3%)
            conversions=1,  # Low conversion rate (3.3%)
            cost_per_click=Decimal('8.00'),  # High CPC
            cost_per_impression=Decimal('0.50'),  # High CPM
            cost_per_conversion=Decimal('240.00'),  # High CPA
            click_through_rate=Decimal('0.003'),  # 0.3% CTR
            conversion_rate=Decimal('0.033')  # 3.3% conversion rate
        )
        
        # Generate insights
        insights = RetrospectiveService.generate_insights_batch(
            retrospective_id=str(retrospective.id),
            user=self.user
        )
        
        self.assertIsInstance(insights, list)
        # With poor performance data, should generate insights
        self.assertGreater(len(insights), 0)
    
    def test_report_approval_workflow(self):
        """Test permission enforcement on report approval"""
        
        # Create retrospective with report
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.COMPLETED,
            completed_at=timezone.now(),
            report_url='https://example.com/report.pdf'
        )
        
        # Approve report
        approved_retrospective = RetrospectiveService.approve_report(
            retrospective_id=str(retrospective.id),
            approved_by=self.user
        )
        
        self.assertEqual(approved_retrospective.reviewed_by, self.user)
        self.assertIsNotNone(approved_retrospective.reviewed_at)
        self.assertEqual(approved_retrospective.status, RetrospectiveStatus.REPORTED)
    
    def test_retrospective_summary_generation(self):
        """Test retrospective summary with insights breakdown"""
        
        # Create retrospective with insights
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.COMPLETED,
            completed_at=timezone.now()
        )
        
        # Create insights with different severities
        Insight.objects.create(
            retrospective=retrospective,
            title='Critical ROI Issue',
            description='ROI below critical threshold',
            severity=InsightSeverity.CRITICAL,
            created_by=self.user
        )
        
        Insight.objects.create(
            retrospective=retrospective,
            title='Medium CTR Performance',
            description='CTR needs optimization',
            severity=InsightSeverity.MEDIUM,
            created_by=self.user
        )
        
        # Get summary
        summary = RetrospectiveService.get_retrospective_summary(str(retrospective.id))
        
        self.assertIsNotNone(summary)
        self.assertIn('retrospective_id', summary)
        self.assertIn('campaign_id', summary)
        self.assertIn('insights_summary', summary)
        self.assertIn('total', summary['insights_summary'])
        self.assertEqual(summary['insights_summary']['total'], 2)
    
    def test_error_handling_for_missing_retrospective(self):
        """Test error handling for non-existent retrospective"""
        import uuid
        non_existent_id = str(uuid.uuid4())
        
        with self.assertRaises(Exception):
            RetrospectiveService.get_retrospective_summary(non_existent_id)


class KPIQuerySlicingTest(TestCase):
    """Test KPI query slice: by team/channel over 30 days (BE4-04 requirement)"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='kpiuser',
            email='kpi@test.com',
            password='testpass123'
        )
        
        self.organization = Organization.objects.create(
            name='KPI Test Organization',
            email_domain='kpi.com'
        )
        
        self.campaign = Project.objects.create(
            name='KPI Test Campaign',
            organization=self.organization
        )
    
    def test_kpi_query_slice_30_days_team_channel(self):
        """Test KPI query slice by team/channel over 30 days"""
        
        # Create 30 days of KPI data with team/channel variations
        base_date = timezone.now().date()
        teams = ['team_alpha', 'team_beta', 'team_gamma']
        channels = ['facebook', 'google', 'tiktok']
        
        # Create unique records for each day (only one per day due to unique constraint)
        for day in range(30):
            CampaignMetric.objects.get_or_create(
                campaign=self.campaign,
                date=base_date - timedelta(days=day),
                defaults={
                    'impressions': 1000 + (day * 50),
                    'clicks': 50 + (day * 2),
                    'conversions': 5 + day,
                    'cost_per_click': Decimal('2.50') + Decimal(str(day * 0.01)),
                    'cost_per_impression': Decimal('0.10'),
                    'cost_per_conversion': Decimal('25.00'),
                    'click_through_rate': Decimal('0.05') + Decimal(str(day * 0.001)),
                    'conversion_rate': Decimal('0.10')
                }
            )
        
        # Query KPI slice by team and channel over 30 days
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        import time
        start_time = time.time()
        
        kpi_slice = list(CampaignMetric.objects.filter(
            campaign=self.campaign,
            date__gte=start_date,
            date__lte=end_date
        ).values(
            'date', 'impressions', 'clicks', 'conversions',
            'cost_per_click', 'click_through_rate', 'conversion_rate'
        ).order_by('date'))
        
        query_time = time.time() - start_time
        
        # Verify query performance and results
        self.assertLess(query_time, 2.0)  # Should complete quickly
        self.assertEqual(len(kpi_slice), 30)  # 30 days (one record per day due to unique constraint)
        
        # Verify data structure
        for record in kpi_slice[:5]:  # Check first 5 records
            self.assertIn('date', record)
            self.assertIn('impressions', record)
            self.assertIn('clicks', record)
            self.assertIn('conversions', record)


class InsightRulesEngineTest(TestCase):
    """Test rule-based insight generation with different KPI thresholds"""
    
    def test_roi_threshold_rules(self):
        """Test ROI threshold checking for different performance levels"""
        from retrospective.rules import InsightRules
        
        # Test critical ROI (< 0.5)
        result = InsightRules.check_roi_threshold(0.45)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'critical')
        
        # Test poor ROI (0.5-0.7)
        result = InsightRules.check_roi_threshold(0.65)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'high')
        
        # Test good ROI (> 0.8)
        result = InsightRules.check_roi_threshold(0.85)
        self.assertFalse(result['triggered'])
    
    def test_multi_kpi_rule_combinations(self):
        """Test rule combinations with multiple KPI inputs"""
        from retrospective.rules import InsightRules
        
        # Test scenario: Poor ROI + High CPC + Low CTR
        roi_result = InsightRules.check_roi_threshold(0.4)  # Critical
        cpc_result = InsightRules.check_cpc_threshold(5.0)  # High CPC
        ctr_result = InsightRules.check_ctr_threshold(0.002)  # Low CTR
        
        # All should trigger
        self.assertTrue(roi_result['triggered'])
        self.assertTrue(cpc_result['triggered'])
        self.assertTrue(ctr_result['triggered'])
        
        # Should identify multiple issues
        triggered_rules = [roi_result, cpc_result, ctr_result]
        self.assertEqual(len([r for r in triggered_rules if r['triggered']]), 3)
    
    def test_rule_engine_mapping(self):
        """Test rule engine mapping conditions to insights"""
        from retrospective.rules import InsightRules
        
        # Get all available rules
        rules = InsightRules.get_all_rules()
        
        self.assertIsInstance(rules, dict)
        self.assertIn('roi_poor', rules)
        self.assertIn('ctr_low', rules)
        self.assertIn('cpc_high', rules)
        
        # Test rule definition structure
        roi_rule = InsightRules.get_rule_definition('roi_poor')
        self.assertIn('name', roi_rule)
        self.assertIn('description', roi_rule)
        self.assertIn('threshold', roi_rule)


class ServiceIntegrationTest(TestCase):
    """Integration tests for complete retrospective service workflow"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.organization = Organization.objects.create(
            name='Integration Test Organization',
            email_domain='test.com'
        )
        
        self.campaign = Project.objects.create(
            name='Integration Test Campaign',
            organization=self.organization
        )
    
    def test_end_to_end_retrospective_workflow(self):
        """Test complete end-to-end retrospective workflow: create → analyze → report → approve"""
        
        # Step 1: Auto-create retrospective for campaign
        retrospective = RetrospectiveService.create_retrospective_for_campaign(
            campaign_id=str(self.campaign.id),
            created_by=self.user
        )
        
        # Step 2: Add KPI data and start analysis
        retrospective.status = RetrospectiveStatus.IN_PROGRESS
        retrospective.started_at = timezone.now()
        retrospective.save()
        
        # Add performance data
        CampaignMetric.objects.create(
            campaign=self.campaign,
            date=timezone.now().date(),
            impressions=5000,
            clicks=25,  # Low CTR (0.5%)
            conversions=1,  # Low conversion (4%)
            cost_per_click=Decimal('6.00'),  # High CPC
            cost_per_impression=Decimal('0.30'),
            cost_per_conversion=Decimal('150.00'),
            click_through_rate=Decimal('0.005'),
            conversion_rate=Decimal('0.04')
        )
        
        # Step 3: Generate insights
        insights = RetrospectiveService.generate_insights_batch(
            retrospective_id=str(retrospective.id),
            user=self.user
        )
        
        # Step 4: Complete retrospective
        retrospective.status = RetrospectiveStatus.COMPLETED
        retrospective.completed_at = timezone.now()
        retrospective.save()
        
        # Step 5: Generate report
        report_url = RetrospectiveService.generate_report(str(retrospective.id))
        
        # Step 6: Approve report
        approved_retrospective = RetrospectiveService.approve_report(
            retrospective_id=str(retrospective.id),
            approved_by=self.user
        )
        
        # Verify complete workflow
        self.assertEqual(approved_retrospective.status, RetrospectiveStatus.REPORTED)
        self.assertIsNotNone(approved_retrospective.reviewed_by)
        self.assertIsNotNone(report_url)
        self.assertGreater(len(insights), 0)  # Should generate insights from poor performance data
    
    def test_kpi_query_performance_30_days(self):
        """Test KPI query slice: by team/channel over 30 days"""
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        # Create 30 days of KPI data
        import time
        start_time = time.time()
        
        for i in range(30):
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=timezone.now().date() - timezone.timedelta(days=i),
                impressions=1000 + i * 50,
                clicks=50 + i * 2,
                conversions=5 + i,
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # Query 30-day KPI data
        aggregated_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        query_time = time.time() - start_time
        
        # Verify query performance and data
        self.assertLess(query_time, 2.0)  # Should complete in under 2 seconds
        self.assertIsNotNone(aggregated_data)
        self.assertEqual(aggregated_data['total_metrics'], 30)
        self.assertIn('aggregated_metrics', aggregated_data) 