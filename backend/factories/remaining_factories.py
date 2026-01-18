"""
Factory classes for remaining app models (retrospective, reports, optimization).
"""
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import uuid
import secrets

from retrospective.models import (
    RetrospectiveTask,
    RetrospectiveStatus,
    Insight,
    InsightSeverity,
    CampaignMetric,
)

from reports.models import (
    ReportTemplate,
    Report,
    ReportSection,
)

from optimization.models import (
    OptimizationExperiment,
    ScalingAction,
    Optimization,
)

from factories.core_factories import CustomUserFactory
from factories.task_factories import TaskFactory

fake = Faker()


# ========== Retrospective Factories ==========

class RetrospectiveTaskFactory(DjangoModelFactory):
    """Factory for RetrospectiveTask model"""
    
    class Meta:
        model = RetrospectiveTask
    
    id = factory.LazyFunction(uuid.uuid4)
    campaign = factory.SubFactory('factories.core_factories.ProjectFactory')
    status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in RetrospectiveStatus.choices]
        )
    )
    scheduled_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=30))
    )
    started_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=20))
        if fake.boolean(chance_of_getting_true=60) and obj.status != RetrospectiveStatus.SCHEDULED else None
    )
    completed_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=10))
        if fake.boolean(chance_of_getting_true=50) and obj.status in [RetrospectiveStatus.COMPLETED, RetrospectiveStatus.REPORTED] else None
    )
    report_url = factory.LazyAttribute(
        lambda obj: fake.url() if fake.boolean(chance_of_getting_true=30) else None
    )
    report_generated_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=5))
        if obj.report_url else None
    )
    reviewed_by = factory.LazyAttribute(
        lambda obj: CustomUserFactory.create()
        if fake.boolean(chance_of_getting_true=30) else None
    )
    reviewed_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=3))
        if obj.reviewed_by else None
    )
    created_by = factory.SubFactory('factories.core_factories.CustomUserFactory')


class InsightFactory(DjangoModelFactory):
    """Factory for Insight model"""
    
    class Meta:
        model = Insight
    
    id = factory.LazyFunction(uuid.uuid4)
    retrospective = factory.SubFactory(RetrospectiveTaskFactory)
    title = factory.LazyAttribute(lambda obj: fake.sentence(nb_words=6))
    description = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=1000))
    severity = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in InsightSeverity.choices]
        )
    )
    rule_id = factory.LazyAttribute(
        lambda obj: f"rule_{fake.random_int(min=1, max=100)}" if fake.boolean(chance_of_getting_true=70) else ''
    )
    triggered_kpis = factory.LazyAttribute(
        lambda obj: [
            str(fake.random_int(min=1, max=1000)) for _ in range(fake.random_int(min=1, max=5))
        ]
    )
    suggested_actions = factory.LazyAttribute(
        lambda obj: [
            fake.sentence() for _ in range(fake.random_int(min=1, max=3))
        ]
    )
    created_by = factory.LazyAttribute(
        lambda obj: CustomUserFactory.create()
        if fake.boolean(chance_of_getting_true=20) else None
    )
    generated_by = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=['rule_engine', 'manual', 'ai'])
    )
    is_active = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=90))


class CampaignMetricFactory(DjangoModelFactory):
    """Factory for CampaignMetric model"""
    
    class Meta:
        model = CampaignMetric
        django_get_or_create = ('campaign', 'date')
    
    id = factory.LazyFunction(uuid.uuid4)
    campaign = factory.SubFactory('factories.core_factories.ProjectFactory')
    impressions = factory.LazyAttribute(lambda obj: fake.random_int(min=1000, max=1000000))
    clicks = factory.LazyAttribute(lambda obj: fake.random_int(min=10, max=100000))
    conversions = factory.LazyAttribute(lambda obj: fake.random_int(min=0, max=1000))
    cost_per_click = factory.LazyAttribute(
        lambda obj: Decimal(str(round(fake.pyfloat(min_value=0.10, max_value=10.0, right_digits=2), 2)))
    )
    cost_per_impression = factory.LazyAttribute(
        lambda obj: Decimal(str(round(fake.pyfloat(min_value=0.001, max_value=0.10, right_digits=4), 4)))
    )
    cost_per_conversion = factory.LazyAttribute(
        lambda obj: Decimal(str(round(fake.pyfloat(min_value=10.0, max_value=200.0, right_digits=2), 2)))
    )
    click_through_rate = factory.LazyAttribute(
        lambda obj: Decimal(str(round(fake.pyfloat(min_value=0.01, max_value=0.10, right_digits=6), 6)))
    )
    conversion_rate = factory.LazyAttribute(
        lambda obj: Decimal(str(round(fake.pyfloat(min_value=0.001, max_value=0.10, right_digits=6), 6)))
    )
    date = factory.LazyAttribute(
        lambda obj: fake.date_between(start_date='-30d', end_date='today')
    )


# ========== Reports Factories ==========

class ReportTemplateFactory(DjangoModelFactory):
    """Factory for ReportTemplate model"""
    
    class Meta:
        model = ReportTemplate
        django_get_or_create = ('name', 'version')
    
    id = factory.LazyAttribute(lambda obj: secrets.token_urlsafe(32))
    name = factory.LazyAttribute(lambda obj: fake.catch_phrase())
    version = factory.LazyAttribute(lambda obj: fake.random_int(min=1, max=10))
    is_default = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=20))
    blocks = factory.LazyAttribute(
        lambda obj: [
            {
                'type': fake.random_element(elements=['text', 'chart', 'table', 'kpi']),
                'title': fake.sentence(nb_words=3),
                'config': {}
            }
            for _ in range(fake.random_int(min=3, max=8))
        ]
    )
    variables = factory.LazyAttribute(
        lambda obj: {
            'theme': fake.random_element(elements=['light', 'dark']),
            'format': fake.random_element(elements=['pdf', 'pptx', 'html']),
        }
    )


class ReportFactory(DjangoModelFactory):
    """Factory for Report model"""
    
    class Meta:
        model = Report
    
    title = factory.LazyAttribute(lambda obj: fake.catch_phrase())
    owner_id = factory.LazyAttribute(lambda obj: str(fake.random_int(min=1, max=1000)))
    status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Report.STATUS]
        )
    )
    report_template = factory.LazyAttribute(
        lambda obj: ReportTemplateFactory.create()
        if fake.boolean(chance_of_getting_true=70) else None
    )
    time_range_start = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=30, max=90))
    )
    time_range_end = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=29))
    )
    slice_config = factory.LazyAttribute(
        lambda obj: {
            'dataset': fake.random_element(elements=['campaigns', 'ads', 'metrics']),
            'dimensions': fake.random_elements(
                elements=['date', 'campaign', 'channel', 'audience'],
                length=fake.random_int(min=1, max=3),
                unique=True
            ),
            'metrics': fake.random_elements(
                elements=['impressions', 'clicks', 'conversions', 'spend', 'roas'],
                length=fake.random_int(min=2, max=5),
                unique=True
            ),
            'filters': {}
        }
    )
    query_hash = factory.LazyAttribute(lambda obj: secrets.token_hex(32))
    export_config_id = factory.LazyAttribute(
        lambda obj: str(fake.random_int(min=1, max=1000)) if fake.boolean(chance_of_getting_true=40) else None
    )


class ReportSectionFactory(DjangoModelFactory):
    """Factory for ReportSection model"""
    
    class Meta:
        model = ReportSection
        django_get_or_create = ('report', 'order_index')
    
    id = factory.LazyAttribute(lambda obj: secrets.token_urlsafe(32))
    report = factory.SubFactory(ReportFactory)
    title = factory.LazyAttribute(lambda obj: fake.sentence(nb_words=4))
    order_index = factory.LazyAttribute(lambda obj: fake.random_int(min=1, max=10))
    content_md = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=2000))
    charts = factory.LazyAttribute(
        lambda obj: [
            {
                'type': fake.random_element(elements=['line', 'bar', 'pie', 'table']),
                'title': fake.sentence(nb_words=3),
                'data_source': f"slice_{fake.random_int(min=1, max=100)}"
            }
            for _ in range(fake.random_int(min=0, max=3))
        ]
    )
    source_slice_ids = factory.LazyAttribute(
        lambda obj: [
            f"slice_{fake.random_int(min=1, max=100)}"
            for _ in range(fake.random_int(min=0, max=5))
        ]
    )


# ========== Optimization Factories ==========

class OptimizationExperimentFactory(DjangoModelFactory):
    """Factory for OptimizationExperiment model"""
    
    class Meta:
        model = OptimizationExperiment
    
    name = factory.LazyAttribute(lambda obj: fake.catch_phrase())
    experiment_type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in OptimizationExperiment.ExperimentType.choices]
        )
    )
    linked_campaign_ids = factory.LazyAttribute(
        lambda obj: [
            f"{fake.random_element(elements=['fb', 'tt', 'gg'])}:{fake.random_int(min=100, max=999999)}"
            for _ in range(fake.random_int(min=1, max=5))
        ]
    )
    hypothesis = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=500))
    start_date = factory.LazyAttribute(
        lambda obj: fake.date_between(start_date='-30d', end_date='+30d')
    )
    end_date = factory.LazyAttribute(
        lambda obj: fake.date_between(start_date=obj.start_date, end_date='+60d')
    )
    status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in OptimizationExperiment.ExperimentStatus.choices]
        )
    )
    description = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=1000))
    created_by = factory.SubFactory('factories.core_factories.CustomUserFactory')


class ScalingActionFactory(DjangoModelFactory):
    """Factory for ScalingAction model"""
    
    class Meta:
        model = ScalingAction
    
    experiment_id = factory.LazyAttribute(
        lambda obj: OptimizationExperimentFactory.create()
        if fake.boolean(chance_of_getting_true=60) else None
    )
    action_type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in ScalingAction.ScalingActionType.choices]
        )
    )
    action_details = factory.LazyAttribute(
        lambda obj: {
            'increase_pct': fake.random_int(min=10, max=50) if 'increase' in obj.action_type else None,
            'decrease_pct': fake.random_int(min=10, max=30) if 'decrease' in obj.action_type else None,
            'audience_expansion': fake.random_int(min=5, max=20) if 'expand' in obj.action_type else None,
        }
    )
    campaign_id = factory.LazyAttribute(
        lambda obj: f"{fake.random_element(elements=['fb', 'tt', 'gg'])}:{fake.random_int(min=100, max=999999)}"
    )
    performed_by = factory.SubFactory('factories.core_factories.CustomUserFactory')


class OptimizationFactory(DjangoModelFactory):
    """Factory for Optimization model"""
    
    class Meta:
        model = Optimization
    
    task = factory.LazyAttribute(
        lambda obj: TaskFactory.create()
        if fake.boolean(chance_of_getting_true=70) else None
    )
    affected_entity_ids = factory.LazyAttribute(
        lambda obj: {
            'campaign_ids': [
                f"{fake.random_element(elements=['fb', 'tt', 'gg'])}:{fake.random_int(min=100, max=999999)}"
                for _ in range(fake.random_int(min=1, max=3))
            ],
            'ad_set_ids': [
                f"{fake.random_element(elements=['fb', 'tt', 'gg'])}:{fake.random_int(min=100, max=999999)}"
                for _ in range(fake.random_int(min=0, max=5))
            ]
        }
    )
    triggered_metrics = factory.LazyAttribute(
        lambda obj: {
            'CPA': {'delta_pct': round(fake.pyfloat(min_value=10, max_value=50, right_digits=1), 1), 'window': '24h'},
            'CTR': {'delta_pct': round(fake.pyfloat(min_value=-30, max_value=-10, right_digits=1), 1), 'window': '7d'},
        }
    )
    baseline_metrics = factory.LazyAttribute(
        lambda obj: {
            'CPA': round(fake.pyfloat(min_value=10, max_value=100, right_digits=2), 2),
            'CTR': round(fake.pyfloat(min_value=0.5, max_value=5.0, right_digits=3), 3),
            'ROAS': round(fake.pyfloat(min_value=1.5, max_value=5.0, right_digits=2), 2),
        }
    )
    observed_metrics = factory.LazyAttribute(
        lambda obj: {
            'CPA': round(fake.pyfloat(min_value=8, max_value=90, right_digits=2), 2),
            'CTR': round(fake.pyfloat(min_value=0.6, max_value=5.5, right_digits=3), 3),
            'ROAS': round(fake.pyfloat(min_value=1.6, max_value=5.5, right_digits=2), 2),
        } if fake.boolean(chance_of_getting_true=50) else None
    )
    action_type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Optimization.ActionType.choices]
        )
    )
    planned_action = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=500))
    execution_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Optimization.ExecutionStatus.choices]
        )
    )
    executed_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=7))
        if obj.execution_status in ['executed', 'monitoring', 'completed'] else None
    )
    monitored_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=0, max=3))
        if obj.execution_status in ['monitoring', 'completed'] else None
    )
    outcome_notes = factory.LazyAttribute(
        lambda obj: fake.text(max_nb_chars=1000) if fake.boolean(chance_of_getting_true=40) else ''
    )
