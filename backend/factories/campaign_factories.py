"""
Factory classes for campaign app models.
"""
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from django.utils import timezone
from datetime import timedelta
import uuid

from campaign.models import (
    CampaignTask,
    CampaignTaskStatus,
    ExecutionLog,
    OperationEvent,
    OperationResult,
    ChannelConfig,
    Channel,
    ROIAlertTrigger,
    MetricKey,
    Comparator,
    AlertAction,
)

fake = Faker()


class CampaignTaskFactory(DjangoModelFactory):
    """Factory for CampaignTask model"""
    
    class Meta:
        model = CampaignTask
    
    campaign_task_id = factory.LazyFunction(uuid.uuid4)
    task = None  # Will be set manually if needed (requires TaskFactory)
    title = factory.LazyAttribute(lambda obj: fake.catch_phrase())
    scheduled_date = factory.LazyAttribute(
        lambda obj: timezone.now() + timedelta(days=fake.random_int(min=0, max=30))
    )
    end_date = factory.LazyAttribute(
        lambda obj: timezone.now() + timedelta(days=fake.random_int(min=31, max=60))
        if fake.boolean(chance_of_getting_true=60) else None
    )
    channel = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Channel.choices]
        )
    )
    
    # JSON fields with realistic data
    creative_asset_ids = factory.LazyAttribute(
        lambda obj: [
            fake.random_int(min=1, max=1000) for _ in range(fake.random_int(min=1, max=5))
        ]
    )
    
    audience_config = factory.LazyAttribute(
        lambda obj: {
            'type': fake.random_element(elements=['interest', 'lookalike', 'custom', 'retargeting']),
            'age_min': fake.random_int(min=18, max=35),
            'age_max': fake.random_int(min=36, max=65),
            'genders': fake.random_elements(
                elements=['male', 'female', 'all'],
                length=fake.random_int(min=1, max=2),
                unique=True
            ),
            'locations': fake.random_elements(
                elements=['US', 'CA', 'UK', 'AU', 'DE', 'FR'],
                length=fake.random_int(min=1, max=3),
                unique=True
            )
        }
    )
    
    external_ids_json = factory.LazyAttribute(
        lambda obj: {
            'campaign_id': str(fake.random_int(min=100000, max=999999)),
            'ad_set_ids': [
                str(fake.random_int(min=100000, max=999999))
                for _ in range(fake.random_int(min=1, max=3))
            ],
            'ad_ids': [
                str(fake.random_int(min=100000, max=999999))
                for _ in range(fake.random_int(min=1, max=5))
            ]
        } if fake.boolean(chance_of_getting_true=70) else {}
    )
    
    status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in CampaignTaskStatus.choices]
        )
    )
    
    platform_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED', 'PENDING_REVIEW']
        ) if fake.boolean(chance_of_getting_true=60) else None
    )
    
    roi_threshold = factory.LazyAttribute(
        lambda obj: round(fake.pyfloat(min_value=1.0, max_value=5.0, right_digits=2), 2)
        if fake.boolean(chance_of_getting_true=50) else None
    )
    
    paused_reason = factory.LazyAttribute(
        lambda obj: fake.sentence() if fake.boolean(chance_of_getting_true=20) else None
    )
    
    created_by = factory.SubFactory('factories.core_factories.CustomUserFactory')


class ExecutionLogFactory(DjangoModelFactory):
    """Factory for ExecutionLog model"""
    
    class Meta:
        model = ExecutionLog
    
    execution_log_id = factory.LazyFunction(uuid.uuid4)
    campaign_task = factory.SubFactory(CampaignTaskFactory)
    event = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in OperationEvent.choices]
        )
    )
    actor_user_id = factory.LazyAttribute(
        lambda obj: factory.SubFactory('factories.core_factories.CustomUserFactory').create()
        if fake.boolean(chance_of_getting_true=70) else None
    )
    timestamp = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(
            hours=fake.random_int(min=0, max=168)  # Within last week
        )
    )
    result = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in OperationResult.choices]
        )
    )
    message = factory.LazyAttribute(
        lambda obj: fake.sentence() if fake.boolean(chance_of_getting_true=80) else None
    )
    
    details = factory.LazyAttribute(
        lambda obj: {
            'impressions': fake.random_int(min=1000, max=1000000),
            'clicks': fake.random_int(min=10, max=100000),
            'spend': round(fake.pyfloat(min_value=10.0, max_value=10000.0, right_digits=2), 2),
            'conversions': fake.random_int(min=0, max=1000),
            'ctr': round(fake.pyfloat(min_value=0.01, max_value=0.10, right_digits=4), 4),
            'cpc': round(fake.pyfloat(min_value=0.10, max_value=10.0, right_digits=2), 2),
            'cpa': round(fake.pyfloat(min_value=10.0, max_value=200.0, right_digits=2), 2),
            'roas': round(fake.pyfloat(min_value=1.0, max_value=5.0, right_digits=2), 2),
        } if fake.boolean(chance_of_getting_true=70) else {}
    )
    
    channel_response = factory.LazyAttribute(
        lambda obj: {
            'status_code': fake.random_element(elements=[200, 201, 400, 401, 403, 500]),
            'response_id': str(fake.uuid4()),
            'message': fake.sentence(),
            'data': {
                'campaign_id': str(fake.random_int(min=100000, max=999999)),
                'timestamp': timezone.now().isoformat()
            }
        } if fake.boolean(chance_of_getting_true=60) else {}
    )


class ChannelConfigFactory(DjangoModelFactory):
    """Factory for ChannelConfig model"""
    
    class Meta:
        model = ChannelConfig
        django_get_or_create = ('team', 'channel')
    
    channel_config_id = factory.LazyFunction(uuid.uuid4)
    team = factory.SubFactory('factories.core_factories.TeamFactory')
    channel = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Channel.choices]
        )
    )
    auth_token = factory.LazyAttribute(
        lambda obj: fake.sha256() if fake.boolean(chance_of_getting_true=50) else ''
    )
    
    settings_json = factory.LazyAttribute(
        lambda obj: {
            'account_id': str(fake.random_int(min=100000, max=999999)),
            'timezone': fake.timezone(),
            'currency': fake.random_element(elements=['USD', 'EUR', 'GBP', 'AUD', 'CAD']),
            'budget_limit': round(fake.pyfloat(min_value=1000.0, max_value=100000.0, right_digits=2), 2),
            'auto_pause_enabled': fake.boolean(chance_of_getting_true=60),
        }
    )
    
    last_refreshed = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(
            hours=fake.random_int(min=1, max=168)
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    is_active = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=90))


class ROIAlertTriggerFactory(DjangoModelFactory):
    """Factory for ROIAlertTrigger model"""
    
    class Meta:
        model = ROIAlertTrigger
    
    roi_alert_trigger_id = factory.LazyFunction(uuid.uuid4)
    campaign_task = factory.SubFactory(CampaignTaskFactory)
    metric_key = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in MetricKey.choices]
        )
    )
    comparator = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Comparator.choices]
        )
    )
    threshold = factory.LazyAttribute(
        lambda obj: round(fake.pyfloat(min_value=0.5, max_value=10.0, right_digits=2), 2)
    )
    lookback_minutes = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=[15, 30, 60, 120, 240, 480, 1440])
    )
    action = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in AlertAction.choices]
        )
    )
    is_active = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=80))
