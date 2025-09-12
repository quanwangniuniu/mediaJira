"""
Simplified test fixtures - solve database connection timeout issues
"""
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, Insight, CampaignMetric, RetrospectiveStatus, InsightSeverity

User = get_user_model()


class SimpleRetrospectiveTestUtils:
    """Simplified test utility class - directly create necessary data, avoid Factory Boy performance issues"""
    
    @staticmethod
    def create_simple_retrospective_scenario():
        """Create simplified retrospective test scenario - minimal data"""
        # 1. Create organization
        organization = Organization.objects.create(
            name='Test Org',
            email_domain='test.com'
        )
        
        # 2. Create user
        user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='testpass123',
            organization=organization
        )
        
        # 3. Create project
        project = Project.objects.create(
            name='Test Project',
            organization=organization
        )
        
        # 4. Create retrospective task
        retrospective = RetrospectiveTask.objects.create(
            campaign=project,
            created_by=user,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        # 5. Create minimal KPI data (only 5 days instead of 30)
        kpi_data = []
        base_date = timezone.now().date()
        for i in range(5):  # Reduced to 5 days
            kpi = CampaignMetric.objects.create(
                campaign=project,
                date=base_date - timedelta(days=i),
                impressions=1000 + i,
                clicks=50 + i,
                conversions=5,
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
            kpi_data.append(kpi)
        
        # 6. Create insights (only 2 instead of 10)
        insights = []
        for i in range(2):
            insight = Insight.objects.create(
                retrospective=retrospective,
                title=f'Test Insight {i+1}',
                description=f'Test insight description {i+1}',
                severity=InsightSeverity.MEDIUM,
                suggested_actions=['Action 1', 'Action 2']
            )
            insights.append(insight)
        
        return {
            'organization': organization,
            'users': [user],
            'campaigns': [project],
            'retrospectives': [retrospective],
            'kpi_data': kpi_data,
            'insights': insights
        }
    
    @staticmethod
    def create_minimal_test_data():
        """Create minimal test data - for basic functionality testing"""
        organization = Organization.objects.create(
            name='Minimal Org',
            email_domain='minimal.com'
        )
        
        user = User.objects.create_user(
            username='minimaluser',
            email='minimal@minimal.com',
            password='minimalpass123',
            organization=organization
        )
        
        project = Project.objects.create(
            name='Minimal Project',
            organization=organization
        )
        
        retrospective = RetrospectiveTask.objects.create(
            campaign=project,
            created_by=user,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        return {
            'organization': organization,
            'user': user,
            'project': project,
            'retrospective': retrospective
        }
    
    @staticmethod
    def create_performance_test_data():
        """Create appropriate amount of data for performance testing"""
        organization = Organization.objects.create(
            name='Perf Test Org',
            email_domain='perftest.com'
        )
        
        user = User.objects.create_user(
            username='perfuser',
            email='perf@perftest.com',
            password='perfpass123',
            organization=organization
        )
        
        project = Project.objects.create(
            name='Perf Test Project',
            organization=organization
        )
        
        retrospective = RetrospectiveTask.objects.create(
            campaign=project,
            created_by=user,
            status=RetrospectiveStatus.COMPLETED
        )
        
        # Bulk create KPI data (performance testing can create more)
        kpi_data = []
        base_date = timezone.now().date()
        for i in range(10):  # 10 days of data is sufficient for performance testing
            kpi_data.append(CampaignMetric(
                campaign=project,
                date=base_date - timedelta(days=i),
                impressions=1000 + i,
                clicks=50 + i,
                conversions=5,
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            ))
        
        # Bulk create to improve performance
        CampaignMetric.objects.bulk_create(kpi_data)
        
        return {
            'organization': organization,
            'user': user,
            'project': project,
            'retrospective': retrospective,
            'kpi_count': len(kpi_data)
        }
