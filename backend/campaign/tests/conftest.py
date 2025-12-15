"""
Pytest fixtures for campaign tests
Follows the style of budget_approval/tests/conftest.py
Uses faker to generate test data
"""
import os
import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from unittest.mock import MagicMock
from faker import Faker

# Disable OpenTelemetry in test environment to avoid connection errors
# This must be set before importing Django settings
os.environ['OTEL_ENABLED'] = 'False'

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Delay imports until Django is configured
import django
from django.conf import settings

if not settings.configured:
    django.setup()


@pytest.fixture(scope='session', autouse=True)
def django_db_setup_ensure_migrations(django_db_setup, django_db_blocker):
    """
    Ensure all required app migrations are applied.
    CampaignTask has ForeignKey to task.Task, so task app migrations must be applied.
    This fixture runs automatically before any tests to ensure database is ready.
    """
    with django_db_blocker.unblock():
        try:
            from django.core.management import call_command
            # Run migrations for all apps to ensure database schema is complete
            # This is especially important for task app which CampaignTask depends on
            # Note: In CI, this should ideally be handled in the workflow step
            call_command('migrate', verbosity=0, interactive=False)
        except Exception:
            # If migration fails, continue - it might already be applied
            # In CI, migrations should ideally be run in the workflow step
            pass

from core.models import Organization, Project, Team
from campaign.models import (
    CampaignTask, Channel, CampaignTaskStatus
)

User = get_user_model()
fake = Faker()


@pytest.fixture
@pytest.mark.django_db
def organization():
    """Create a test organization using faker"""
    return Organization.objects.create(
        name=fake.company(),
        email_domain=fake.domain_name()
    )


@pytest.fixture
@pytest.mark.django_db
def team(organization):
    """Create a test team using faker"""
    return Team.objects.create(
        name=fake.company_suffix() + " Team",
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def project(organization):
    """Create a test project using faker"""
    return Project.objects.create(
        name=fake.catch_phrase(),
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def user(organization):
    """Create a test user using faker"""
    return User.objects.create_user(
        username=fake.user_name(),
        email=fake.email(),
        password='testpass123',
        organization=organization,
        first_name=fake.first_name(),
        last_name=fake.last_name()
    )


@pytest.fixture
@pytest.mark.django_db
def campaign_task_scheduled(user):
    """Create a scheduled campaign task using faker"""
    return CampaignTask.objects.create(
        title=fake.sentence(nb_words=4),
        scheduled_date=timezone.now() + timedelta(days=fake.random_int(1, 30)),
        channel=Channel.GOOGLE_ADS,
        creative_asset_ids=[fake.uuid4() for _ in range(fake.random_int(1, 5))],
        audience_config={
            'type': 'google',
            'common': {
                'locations': [fake.country_code() for _ in range(fake.random_int(1, 3))],
                'age_range': {'min': fake.random_int(18, 25), 'max': fake.random_int(45, 65)},
                'budget': {
                    'daily': round(fake.pyfloat(left_digits=3, right_digits=2, positive=True), 2),
                    'currency': 'AUD'
                }
            },
            'google': {
                'campaign_type': fake.random_element(elements=('SEARCH', 'DISPLAY', 'VIDEO')),
                'bidding_strategy': fake.random_element(elements=('TARGET_ROAS', 'MAXIMIZE_CONVERSIONS'))
            }
        },
        created_by=user,
        status=CampaignTaskStatus.SCHEDULED
    )


@pytest.fixture
@pytest.mark.django_db
def campaign_task_launched(user):
    """Create a launched campaign task using faker"""
    return CampaignTask.objects.create(
        title=fake.sentence(nb_words=4),
        scheduled_date=timezone.now() - timedelta(days=fake.random_int(1, 7)),
        channel=Channel.FACEBOOK_ADS,
        creative_asset_ids=[fake.uuid4() for _ in range(fake.random_int(1, 3))],
        audience_config={
            'type': 'facebook',
            'common': {
                'locations': [fake.country_code() for _ in range(fake.random_int(1, 2))],
                'age_range': {'min': fake.random_int(21, 30), 'max': fake.random_int(50, 65)},
                'budget': {
                    'daily': round(fake.pyfloat(left_digits=3, right_digits=2, positive=True), 2),
                    'currency': 'AUD'
                }
            },
            'facebook': {
                'objective': fake.random_element(elements=('CONVERSIONS', 'TRAFFIC', 'ENGAGEMENT')),
                'optimization_goal': fake.random_element(elements=('OFFSITE_CONVERSIONS', 'LINK_CLICKS'))
            }
        },
        created_by=user,
        status=CampaignTaskStatus.LAUNCHED,
        external_ids_json={
            'campaignId': fake.uuid4(),
            'adSetIds': [fake.uuid4() for _ in range(fake.random_int(1, 3))]
        }
    )


@pytest.fixture
@pytest.mark.django_db
def campaign_task_paused(user):
    """Create a paused campaign task using faker"""
    task = CampaignTask.objects.create(
        title=fake.sentence(nb_words=4),
        scheduled_date=timezone.now() - timedelta(days=fake.random_int(1, 14)),
        channel=Channel.TIKTOK_ADS,
        creative_asset_ids=[fake.uuid4() for _ in range(fake.random_int(0, 2))],
        audience_config={
            'type': 'tiktok',
            'common': {
                'locations': [fake.country_code() for _ in range(fake.random_int(1, 2))],
                'age_range': {'min': fake.random_int(18, 25), 'max': fake.random_int(40, 55)},
                'budget': {
                    'daily': round(fake.pyfloat(left_digits=2, right_digits=2, positive=True), 2),
                    'currency': 'AUD'
                }
            },
            'tiktok': {
                'objective': fake.random_element(elements=('VIDEO_VIEWS', 'CONVERSIONS')),
                'optimization_goal': fake.random_element(elements=('VIDEO_VIEWS', 'CONVERSIONS'))
            }
        },
        created_by=user,
        status=CampaignTaskStatus.PAUSED,
        paused_reason=fake.sentence(nb_words=6)
    )
    return task


@pytest.fixture
def mock_executor():
    """Create a mock executor"""
    executor = MagicMock()
    executor.validate_config = MagicMock(return_value=None)
    executor.launch = MagicMock(return_value={
        'success': True,
        'external_ids': {'campaignId': 'test_123'},
        'message': 'Campaign launched successfully'
    })
    executor.pause = MagicMock(return_value={
        'success': True,
        'message': 'Campaign paused'
    })
    executor.resume = MagicMock(return_value={
        'success': True,
        'message': 'Campaign resumed'
    })
    executor.get_status = MagicMock(return_value={
        'success': True,
        'platform_status': 'ACTIVE',
        'raw': {
            'stats': {
                'impressions': 10000,
                'clicks': 100,
                'cost': 100.0,
                'revenue': 200.0,
                'conversions': 10
            }
        }
    })
    return executor


@pytest.fixture
def mock_channel_config():
    """Create a mock channel configuration"""
    return {
        'account_id': 'test_account_123',
        'timezone': 'UTC',
        'currency': 'AUD'
    }

