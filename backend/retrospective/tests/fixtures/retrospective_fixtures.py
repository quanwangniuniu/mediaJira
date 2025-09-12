"""
Test fixtures for retrospective testing
Provides reusable test data and utilities
"""
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
import factory
from factory import Faker, SubFactory, LazyAttribute
from factory.django import DjangoModelFactory

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, Insight, CampaignMetric, RetrospectiveStatus, InsightSeverity

User = get_user_model()


class OrganizationFactory(DjangoModelFactory):
    """Factory for creating test organizations"""
    
    class Meta:
        model = Organization
    
    name = Faker('company')
    email_domain = Faker('domain_name')


class UserFactory(DjangoModelFactory):
    """Factory for creating test users"""
    
    class Meta:
        model = User
    
    username = Faker('user_name')
    email = Faker('email')
    first_name = Faker('first_name')
    last_name = Faker('last_name')
    organization = SubFactory(OrganizationFactory)
    is_verified = True
    is_active = True


class ProjectFactory(DjangoModelFactory):
    """Factory for creating test campaigns/projects"""
    
    class Meta:
        model = Project
    
    name = Faker('catch_phrase')
    organization = SubFactory(OrganizationFactory)


class CampaignMetricFactory(DjangoModelFactory):
    """Factory for creating test KPI data"""
    
    class Meta:
        model = CampaignMetric
    
    campaign = SubFactory(ProjectFactory)
    date = Faker('date_between', start_date='-30d', end_date='today')
    impressions = Faker('random_int', min=100, max=10000)
    clicks = Faker('random_int', min=10, max=500)
    conversions = Faker('random_int', min=1, max=50)
    cost_per_click = Faker('pydecimal', left_digits=2, right_digits=2, positive=True, min_value=1.0, max_value=10.0)
    cost_per_impression = Faker('pydecimal', left_digits=1, right_digits=3, positive=True, min_value=0.01, max_value=1.0)
    cost_per_conversion = Faker('pydecimal', left_digits=2, right_digits=2, positive=True, min_value=10.0, max_value=100.0)
    click_through_rate = Faker('pydecimal', left_digits=1, right_digits=4, positive=True, min_value=0.01, max_value=0.1)
    conversion_rate = Faker('pydecimal', left_digits=1, right_digits=4, positive=True, min_value=0.01, max_value=0.2)


class RetrospectiveTaskFactory(DjangoModelFactory):
    """Factory for creating test retrospective tasks"""
    
    class Meta:
        model = RetrospectiveTask
    
    campaign = SubFactory(ProjectFactory)
    created_by = SubFactory(UserFactory)
    status = Faker('random_element', elements=RetrospectiveStatus.choices)
    scheduled_at = factory.LazyFunction(timezone.now)
    
    @factory.lazy_attribute
    def started_at(self):
        if self.status in [RetrospectiveStatus.IN_PROGRESS, RetrospectiveStatus.COMPLETED, RetrospectiveStatus.REPORTED]:
            return self.scheduled_at + timedelta(minutes=30)
        return None
    
    @factory.lazy_attribute
    def completed_at(self):
        if self.status in [RetrospectiveStatus.COMPLETED, RetrospectiveStatus.REPORTED]:
            return self.started_at + timedelta(hours=2) if self.started_at else None
        return None
    
    @factory.lazy_attribute
    def report_url(self):
        if self.status == RetrospectiveStatus.REPORTED:
            return f"/media/reports/retrospective_{uuid.uuid4().hex}.pdf"
        return None
    
    @factory.lazy_attribute
    def report_generated_at(self):
        if self.report_url:
            return self.completed_at + timedelta(minutes=15) if self.completed_at else None
        return None


class InsightFactory(DjangoModelFactory):
    """Factory for creating test insights"""
    
    class Meta:
        model = Insight
    
    retrospective = SubFactory(RetrospectiveTaskFactory)
    title = Faker('sentence', nb_words=6)
    description = Faker('text', max_nb_chars=500)
    severity = Faker('random_element', elements=InsightSeverity.choices)
    rule_id = Faker('word')
    triggered_kpis = LazyAttribute(lambda obj: [f"kpi_{i}" for i in range(3)])
    suggested_actions = LazyAttribute(lambda obj: [
        f"Action {i}: Improve performance metrics" 
        for i in range(2)
    ])
    generated_by = Faker('random_element', elements=['rule_engine', 'manual', 'ai'])
    is_active = True


class RetrospectiveTestDataBuilder:
    """Builder class for creating complex test scenarios"""
    
    def __init__(self):
        self.organization = None
        self.users = []
        self.campaigns = []
        self.retrospectives = []
        self.kpi_data = []
        self.insights = []
    
    def with_organization(self, name=None, email_domain=None):
        """Add organization to test data"""
        self.organization = OrganizationFactory(
            name=name or "Test Organization",
            email_domain=email_domain or "testorg.com"
        )
        return self
    
    def with_users(self, count=3, roles=None):
        """Add users to test data"""
        for i in range(count):
            user = UserFactory(organization=self.organization)
            self.users.append(user)
        return self
    
    def with_campaigns(self, count=2, with_kpi_data=True, kpi_days=30):
        """Add campaigns to test data"""
        for i in range(count):
            campaign = ProjectFactory(
                organization=self.organization
            )
            self.campaigns.append(campaign)
            
            if with_kpi_data:
                self.with_kpi_data_for_campaign(campaign, days=kpi_days)
        
        return self
    
    def with_kpi_data_for_campaign(self, campaign, days=30):
        """Add KPI data for a campaign"""
        base_date = datetime.now().date()
        
        for i in range(days):
            date = base_date - timedelta(days=i)
            kpi = CampaignMetricFactory(
                campaign=campaign,
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
            self.kpi_data.append(kpi)
        
        return self
    
    def with_retrospectives(self, count=1, status=RetrospectiveStatus.SCHEDULED):
        """Add retrospectives to test data"""
        for i in range(count):
            campaign = self.campaigns[i % len(self.campaigns)] if self.campaigns else ProjectFactory()
            retrospective = RetrospectiveTaskFactory(
                campaign=campaign,
                created_by=self.users[0] if self.users else UserFactory(),
                status=status
            )
            self.retrospectives.append(retrospective)
        
        return self
    
    def with_insights(self, count=5, severity=None):
        """Add insights to test data"""
        for i in range(count):
            retrospective = self.retrospectives[i % len(self.retrospectives)] if self.retrospectives else RetrospectiveTaskFactory()
            insight = InsightFactory(
                retrospective=retrospective,
                severity=severity or InsightSeverity.MEDIUM
            )
            self.insights.append(insight)
        
        return self
    
    def with_poor_performance_campaign(self):
        """Add a campaign with poor performance metrics"""
        campaign = ProjectFactory(
            organization=self.organization,
            name="Poor Performance Campaign"
        )
        self.campaigns.append(campaign)
        
        # Create poor KPI data
        CampaignMetricFactory(
            campaign=campaign,
            date=datetime.now().date(),
            impressions=1000,
            clicks=10,  # Very low CTR
            conversions=1,  # Very low conversion rate
            cost_per_click=Decimal('10.00'),  # High CPC
            cost_per_impression=Decimal('1.00'),  # High CPM
            cost_per_conversion=Decimal('100.00'),  # High CPA
            click_through_rate=Decimal('0.01'),  # 1% CTR
            conversion_rate=Decimal('0.10')  # 10% conversion rate
        )
        
        return self
    
    def with_high_performance_campaign(self):
        """Add a campaign with high performance metrics"""
        campaign = ProjectFactory(
            organization=self.organization,
            name="High Performance Campaign"
        )
        self.campaigns.append(campaign)
        
        # Create high KPI data
        CampaignMetricFactory(
            campaign=campaign,
            date=datetime.now().date(),
            impressions=10000,
            clicks=500,  # High CTR
            conversions=50,  # High conversion rate
            cost_per_click=Decimal('1.00'),  # Low CPC
            cost_per_impression=Decimal('0.05'),  # Low CPM
            cost_per_conversion=Decimal('10.00'),  # Low CPA
            click_through_rate=Decimal('0.05'),  # 5% CTR
            conversion_rate=Decimal('0.10')  # 10% conversion rate
        )
        
        return self
    
    def build(self):
        """Build and return the test data"""
        return {
            'organization': self.organization,
            'users': self.users,
            'campaigns': self.campaigns,
            'retrospectives': self.retrospectives,
            'kpi_data': self.kpi_data,
            'insights': self.insights
        }


class RetrospectiveTestUtils:
    """Utility functions for retrospective testing"""
    
    @staticmethod
    def create_complete_retrospective_scenario():
        """Create a complete retrospective scenario with all components"""
        builder = RetrospectiveTestDataBuilder()
        return (builder
                .with_organization()
                .with_users(count=3)
                .with_campaigns(count=2, with_kpi_data=True, kpi_days=30)
                .with_retrospectives(count=2, status=RetrospectiveStatus.COMPLETED)
                .with_insights(count=10)
                .build())
    
    @staticmethod
    def create_performance_test_scenario():
        """Create a scenario optimized for performance testing"""
        builder = RetrospectiveTestDataBuilder()
        return (builder
                .with_organization()
                .with_users(count=1)
                .with_campaigns(count=1, with_kpi_data=True, kpi_days=365)  # 1 year of data
                .with_retrospectives(count=1, status=RetrospectiveStatus.COMPLETED)
                .with_insights(count=50)
                .build())
    
    @staticmethod
    def create_websocket_test_scenario():
        """Create a scenario for WebSocket testing"""
        builder = RetrospectiveTestDataBuilder()
        return (builder
                .with_organization()
                .with_users(count=5)  # Multiple users for group notifications
                .with_campaigns(count=3, with_kpi_data=True, kpi_days=10)
                .with_retrospectives(count=3, status=RetrospectiveStatus.IN_PROGRESS)
                .build())
    
    @staticmethod
    def create_permission_test_scenario():
        """Create a scenario for permission testing"""
        builder = RetrospectiveTestDataBuilder()
        return (builder
                .with_organization()
                .with_users(count=4)  # Different user types
                .with_campaigns(count=2, with_kpi_data=True, kpi_days=15)
                .with_retrospectives(count=2, status=RetrospectiveStatus.COMPLETED)
                .with_insights(count=8)
                .build())
    
    @staticmethod
    def create_load_test_scenario():
        """Create a scenario for load testing"""
        builder = RetrospectiveTestDataBuilder()
        return (builder
                .with_organization()
                .with_users(count=10)
                .with_campaigns(count=5, with_kpi_data=True, kpi_days=30)
                .with_retrospectives(count=5, status=RetrospectiveStatus.SCHEDULED)
                .build())


# Pytest fixtures
import pytest

@pytest.fixture
def test_organization():
    """Fixture for test organization"""
    return OrganizationFactory()


@pytest.fixture
def test_user(test_organization):
    """Fixture for test user"""
    return UserFactory(organization=test_organization)


@pytest.fixture
def test_campaign(test_user):
    """Fixture for test campaign"""
    return ProjectFactory(organization=test_user.organization)


@pytest.fixture
def test_retrospective(test_campaign, test_user):
    """Fixture for test retrospective"""
    return RetrospectiveTaskFactory(campaign=test_campaign, created_by=test_user)


@pytest.fixture
def test_kpi_data(test_campaign):
    """Fixture for test KPI data"""
    return CampaignMetricFactory(campaign=test_campaign)


@pytest.fixture
def test_insight(test_retrospective):
    """Fixture for test insight"""
    return InsightFactory(retrospective=test_retrospective)


@pytest.fixture
def complete_retrospective_scenario():
    """Fixture for complete retrospective scenario"""
    return RetrospectiveTestUtils.create_complete_retrospective_scenario()


@pytest.fixture
def performance_test_scenario():
    """Fixture for performance test scenario"""
    return RetrospectiveTestUtils.create_performance_test_scenario()


@pytest.fixture
def websocket_test_scenario():
    """Fixture for WebSocket test scenario"""
    return RetrospectiveTestUtils.create_websocket_test_scenario()


@pytest.fixture
def permission_test_scenario():
    """Fixture for permission test scenario"""
    return RetrospectiveTestUtils.create_permission_test_scenario()


@pytest.fixture
def load_test_scenario():
    """Fixture for load test scenario"""
    return RetrospectiveTestUtils.create_load_test_scenario()
