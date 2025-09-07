"""
Performance tests for KPI query operations
Benchmarks KPI aggregation, dashboard queries, and caching effectiveness
"""
import pytest
import time
import json
from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from unittest.mock import patch

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, CampaignMetric
from retrospective.services import RetrospectiveService
from retrospective.views import RetrospectiveTaskViewSet

User = get_user_model()


class TestKPIQueryPerformance(TransactionTestCase):
    """Performance tests for KPI queries"""

    def setUp(self):
        """Set up test data with large dataset"""
        # Create organization
        self.organization = Organization.objects.create(
            name="Performance Test Agency",
            email_domain="perftest.com"
        )
        
        # Create user
        self.user = User.objects.create_user(
            username="perfuser",
            email="perf@perftest.com",
            password="testpass123",
            organization=self.organization
        )
        
        # Create multiple campaigns
        self.campaigns = []
        for i in range(10):
            campaign = Project.objects.create(
                name=f"Performance Campaign {i}",
                organization=self.organization,
                created_by=self.user
            )
            self.campaigns.append(campaign)
        
        # Create large KPI dataset
        self.create_large_kpi_dataset()

    def create_large_kpi_dataset(self):
        """Create large KPI dataset for performance testing"""
        base_date = datetime.now().date()
        
        # Create 1000+ KPI records per campaign
        for campaign in self.campaigns:
            for i in range(1000):
                date = base_date - timedelta(days=i % 365)  # Spread over a year
                CampaignMetric.objects.create(
                    campaign=campaign,
                    date=date,
                    impressions=1000 + (i % 100),
                    clicks=50 + (i % 10),
                    conversions=5 + (i % 5),
                    cost_per_click=Decimal('2.50') + Decimal(str((i % 10) * 0.01)),
                    cost_per_impression=Decimal('0.10') + Decimal(str((i % 10) * 0.001)),
                    cost_per_conversion=Decimal('25.00') + Decimal(str((i % 10) * 0.1)),
                    click_through_rate=Decimal('0.05') + Decimal(str((i % 10) * 0.001)),
                    conversion_rate=Decimal('0.10') + Decimal(str((i % 10) * 0.001))
                )

    def test_kpi_aggregation_performance(self):
        """Test KPI aggregation performance with large dataset"""
        # Create retrospective for first campaign
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaigns[0],
            created_by=self.user
        )
        
        # Measure aggregation time
        start_time = time.time()
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        end_time = time.time()
        
        duration = end_time - start_time
        
        # Should complete in under 2 seconds
        self.assertLess(duration, 2.0, f"KPI aggregation took {duration:.2f} seconds, expected < 2.0")
        
        # Verify data integrity
        self.assertIn('aggregated_metrics', kpi_data)
        self.assertEqual(kpi_data['total_metrics'], 1000)
        
        # Verify aggregation calculations
        metrics = kpi_data['aggregated_metrics']
        self.assertIn('ROI', metrics)
        self.assertIn('CTR', metrics)
        self.assertIn('CPC', metrics)
        
        # Each metric should have proper aggregation
        for metric_name, metric_data in metrics.items():
            self.assertIn('current_value', metric_data)
            self.assertIn('average_value', metric_data)
            self.assertIn('min_value', metric_data)
            self.assertIn('max_value', metric_data)
            self.assertIn('data_points', metric_data)
            self.assertEqual(metric_data['data_points'], 1000)

    def test_dashboard_query_performance(self):
        """Test dashboard query performance for multiple campaigns"""
        # Create retrospectives for all campaigns
        retrospectives = []
        for campaign in self.campaigns:
            retrospective = RetrospectiveTask.objects.create(
                campaign=campaign,
                created_by=self.user
            )
            retrospectives.append(retrospective)
        
        # Measure dashboard query time
        start_time = time.time()
        
        # Simulate dashboard query - get all retrospectives with KPI data
        dashboard_data = []
        for retrospective in retrospectives:
            kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
            dashboard_data.append({
                'retrospective_id': str(retrospective.id),
                'campaign_name': retrospective.campaign.name,
                'kpi_summary': kpi_data['aggregated_metrics']
            })
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 5 seconds for 10 campaigns
        self.assertLess(duration, 5.0, f"Dashboard query took {duration:.2f} seconds, expected < 5.0")
        
        # Verify data structure
        self.assertEqual(len(dashboard_data), 10)
        for item in dashboard_data:
            self.assertIn('retrospective_id', item)
            self.assertIn('campaign_name', item)
            self.assertIn('kpi_summary', item)

    def test_kpi_query_by_team_channel(self):
        """Test KPI query performance by team/channel over 30 days"""
        # Create campaign with specific team/channel data
        team_campaign = Project.objects.create(
            name="Team Performance Campaign",
            organization=self.organization,
            created_by=self.user
        )
        
        # Create 30 days of KPI data
        base_date = datetime.now().date()
        for i in range(30):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=team_campaign,
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
        
        # Measure team/channel query time
        start_time = time.time()
        
        # Query KPI data for last 30 days
        thirty_days_ago = base_date - timedelta(days=30)
        kpi_records = CampaignMetric.objects.filter(
            campaign=team_campaign,
            date__gte=thirty_days_ago
        ).order_by('date')
        
        # Aggregate by date
        daily_kpis = {}
        for record in kpi_records:
            date_str = record.date.isoformat()
            if date_str not in daily_kpis:
                daily_kpis[date_str] = {
                    'impressions': 0,
                    'clicks': 0,
                    'conversions': 0,
                    'total_cost': 0
                }
            
            daily_kpis[date_str]['impressions'] += record.impressions
            daily_kpis[date_str]['clicks'] += record.clicks
            daily_kpis[date_str]['conversions'] += record.conversions
            daily_kpis[date_str]['total_cost'] += float(record.cost_per_click * record.clicks)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Should complete in under 1 second
        self.assertLess(duration, 1.0, f"Team/channel query took {duration:.2f} seconds, expected < 1.0")
        
        # Verify data
        self.assertEqual(len(daily_kpis), 30)
        self.assertIn(base_date.isoformat(), daily_kpis)

    def test_database_query_optimization(self):
        """Test database query optimization and N+1 problem prevention"""
        # Create retrospectives
        retrospectives = []
        for campaign in self.campaigns[:5]:  # Use first 5 campaigns
            retrospective = RetrospectiveTask.objects.create(
                campaign=campaign,
                created_by=self.user
            )
            retrospectives.append(retrospective)
        
        # Measure query count
        with self.assertNumQueries(1):  # Should use only 1 query with proper optimization
            # This should use select_related to avoid N+1 queries
            retrospectives_with_campaigns = RetrospectiveTask.objects.select_related(
                'campaign', 'created_by'
            ).filter(id__in=[r.id for r in retrospectives])
            
            # Access related objects
            for retrospective in retrospectives_with_campaigns:
                campaign_name = retrospective.campaign.name
                creator_name = retrospective.created_by.username
                self.assertIsNotNone(campaign_name)
                self.assertIsNotNone(creator_name)

    def test_caching_effectiveness(self):
        """Test caching effectiveness for repeated queries"""
        # Clear cache
        cache.clear()
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaigns[0],
            created_by=self.user
        )
        
        # First query (cache miss)
        start_time = time.time()
        kpi_data_1 = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        first_duration = time.time() - start_time
        
        # Second query (cache hit)
        start_time = time.time()
        kpi_data_2 = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        second_duration = time.time() - start_time
        
        # Second query should be significantly faster
        self.assertLess(second_duration, first_duration * 0.5, 
                       f"Cache hit should be faster: {second_duration:.3f}s vs {first_duration:.3f}s")
        
        # Data should be identical
        self.assertEqual(kpi_data_1, kpi_data_2)

    def test_concurrent_kpi_queries(self):
        """Test performance under concurrent KPI queries"""
        import threading
        import queue
        
        # Create retrospectives
        retrospectives = []
        for campaign in self.campaigns[:5]:
            retrospective = RetrospectiveTask.objects.create(
                campaign=campaign,
                created_by=self.user
            )
            retrospectives.append(retrospective)
        
        # Results queue
        results = queue.Queue()
        
        def query_kpi_data(retrospective_id):
            """Query KPI data for a retrospective"""
            start_time = time.time()
            kpi_data = RetrospectiveService.aggregate_kpi_data(retrospective_id)
            duration = time.time() - start_time
            results.put((retrospective_id, duration, kpi_data))
        
        # Start concurrent queries
        threads = []
        start_time = time.time()
        
        for retrospective in retrospectives:
            thread = threading.Thread(
                target=query_kpi_data,
                args=(str(retrospective.id),)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        total_duration = time.time() - start_time
        
        # Should complete in reasonable time even with concurrency
        self.assertLess(total_duration, 10.0, f"Concurrent queries took {total_duration:.2f} seconds")
        
        # Verify all queries completed successfully
        self.assertEqual(results.qsize(), 5)
        
        # Check individual query times
        while not results.empty():
            retrospective_id, duration, kpi_data = results.get()
            self.assertLess(duration, 3.0, f"Individual query took {duration:.2f} seconds")
            self.assertIn('aggregated_metrics', kpi_data)

    def test_memory_usage_optimization(self):
        """Test memory usage optimization for large datasets"""
        import psutil
        import os
        
        # Get initial memory usage
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create retrospective with large dataset
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaigns[0],
            created_by=self.user
        )
        
        # Perform aggregation
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # Get memory usage after aggregation
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB for 1000 records)
        self.assertLess(memory_increase, 100, f"Memory usage increased by {memory_increase:.1f}MB")
        
        # Verify data integrity
        self.assertIn('aggregated_metrics', kpi_data)
        self.assertEqual(kpi_data['total_metrics'], 1000)

    def test_database_index_effectiveness(self):
        """Test database index effectiveness for KPI queries"""
        # Test query with date range (should use date index)
        base_date = datetime.now().date()
        thirty_days_ago = base_date - timedelta(days=30)
        
        with self.assertNumQueries(1):
            # This query should use the date index
            kpi_records = CampaignMetric.objects.filter(
                campaign=self.campaigns[0],
                date__gte=thirty_days_ago
            ).order_by('date')
            
            count = kpi_records.count()
            self.assertGreater(count, 0)
        
        # Test query with campaign filter (should use campaign index)
        with self.assertNumQueries(1):
            # This query should use the campaign index
            kpi_records = CampaignMetric.objects.filter(
                campaign=self.campaigns[0]
            ).order_by('-date')
            
            count = kpi_records.count()
            self.assertEqual(count, 1000)


@pytest.mark.benchmark
class TestKPIQueryBenchmarks:
    """Benchmark tests for KPI queries using pytest-benchmark"""
    
    @pytest.mark.benchmark(group="kpi_aggregation")
    def test_kpi_aggregation_benchmark(self, benchmark, django_db_setup):
        """Benchmark KPI aggregation performance"""
        # Create test data
        org = Organization.objects.create(name="Benchmark Org")
        user = User.objects.create_user(username="benchuser", email="bench@test.com")
        campaign = Project.objects.create(name="Benchmark Campaign", organization=org)
        
        # Create KPI data
        base_date = datetime.now().date()
        for i in range(1000):
            date = base_date - timedelta(days=i % 365)
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
        retrospective = RetrospectiveTask.objects.create(
            campaign=campaign,
            created_by=user
        )
        
        # Benchmark aggregation
        result = benchmark(
            RetrospectiveService.aggregate_kpi_data,
            str(retrospective.id)
        )
        
        # Verify result
        assert 'aggregated_metrics' in result
        assert result['total_metrics'] == 1000
    
    @pytest.mark.benchmark(group="dashboard_queries")
    def test_dashboard_query_benchmark(self, benchmark, django_db_setup):
        """Benchmark dashboard query performance"""
        # Create test data
        org = Organization.objects.create(name="Benchmark Org")
        user = User.objects.create_user(username="benchuser", email="bench@test.com")
        
        # Create multiple campaigns with KPI data
        campaigns = []
        for i in range(10):
            campaign = Project.objects.create(name=f"Campaign {i}", organization=org)
            campaigns.append(campaign)
            
            # Create KPI data for each campaign
            base_date = datetime.now().date()
            for j in range(100):
                date = base_date - timedelta(days=j)
                CampaignMetric.objects.create(
                    campaign=campaign,
                    date=date,
                    impressions=1000,
                    clicks=50,
                    conversions=5,
                    cost_per_click=Decimal('2.50'),
                    cost_per_impression=Decimal('0.10'),
                    cost_per_conversion=Decimal('25.00'),
                    click_through_rate=Decimal('0.05'),
                    conversion_rate=Decimal('0.10')
                )
        
        # Create retrospectives
        retrospectives = []
        for campaign in campaigns:
            retrospective = RetrospectiveTask.objects.create(
                campaign=campaign,
                created_by=user
            )
            retrospectives.append(retrospective)
        
        def dashboard_query():
            """Dashboard query function"""
            dashboard_data = []
            for retrospective in retrospectives:
                kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
                dashboard_data.append({
                    'retrospective_id': str(retrospective.id),
                    'campaign_name': retrospective.campaign.name,
                    'kpi_summary': kpi_data['aggregated_metrics']
                })
            return dashboard_data
        
        # Benchmark dashboard query
        result = benchmark(dashboard_query)
        
        # Verify result
        assert len(result) == 10
        for item in result:
            assert 'retrospective_id' in item
            assert 'kpi_summary' in item
