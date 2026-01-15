"""
Factory classes for budget_approval app models.
"""
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from django.utils import timezone
from decimal import Decimal

from budget_approval.models import (
    BudgetPool,
    BudgetRequest,
    BudgetRequestStatus,
    BudgetEscalationRule,
)

fake = Faker()


class BudgetPoolFactory(DjangoModelFactory):
    """Factory for BudgetPool model"""
    
    class Meta:
        model = BudgetPool
    
    project = factory.SubFactory('factories.core_factories.ProjectFactory')
    ad_channel = factory.SubFactory('factories.core_factories.AdChannelFactory')
    total_amount = factory.LazyAttribute(
        lambda obj: Decimal(str(round(
            fake.pyfloat(left_digits=6, right_digits=2, min_value=1000.0, max_value=1000000.0),
            2
        )))
    )
    used_amount = factory.LazyAttribute(
        lambda obj: Decimal('0.00')  # Will be set in post_generation
    )
    currency = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'])
    )
    
    @factory.post_generation
    def validate_amounts(self, create, extracted, **kwargs):
        """Set used_amount to a reasonable value (0-80% of total)"""
        if create:
            max_used = self.total_amount * Decimal('0.8')
            self.used_amount = Decimal(str(round(
                float(fake.pyfloat(left_digits=6, right_digits=2, min_value=0.0, max_value=float(max_used))),
                2
            )))
            self.save(update_fields=['used_amount'])


class BudgetRequestFactory(DjangoModelFactory):
    """Factory for BudgetRequest model"""
    
    class Meta:
        model = BudgetRequest
    
    task = factory.LazyAttribute(
        lambda obj: factory.SubFactory('factories.task_factories.TaskFactory').create()
        if fake.boolean(chance_of_getting_true=70) else None
    )
    requested_by = factory.SubFactory('factories.core_factories.CustomUserFactory')
    amount = factory.LazyAttribute(
        lambda obj: Decimal(str(round(
            fake.pyfloat(left_digits=6, right_digits=2, min_value=100.0, max_value=50000.0),
            2
        )))
    )
    currency = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'])
    )
    status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in BudgetRequestStatus.choices]
        )
    )
    submitted_at = factory.LazyAttribute(
        lambda obj: timezone.now() - fake.time_delta(end_datetime=None)
        if fake.boolean(chance_of_getting_true=60) and obj.status != BudgetRequestStatus.DRAFT else None
    )
    is_escalated = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=20))
    budget_pool = factory.SubFactory(BudgetPoolFactory)
    notes = factory.LazyAttribute(
        lambda obj: fake.text(max_nb_chars=500) if fake.boolean(chance_of_getting_true=50) else None
    )
    current_approver = factory.SubFactory('factories.core_factories.CustomUserFactory')
    ad_channel = factory.LazyAttribute(lambda obj: obj.budget_pool.ad_channel)


class BudgetEscalationRuleFactory(DjangoModelFactory):
    """Factory for BudgetEscalationRule model"""
    
    class Meta:
        model = BudgetEscalationRule
        django_get_or_create = ('budget_pool', 'threshold_currency')
    
    budget_pool = factory.SubFactory(BudgetPoolFactory)
    threshold_amount = factory.LazyAttribute(
        lambda obj: Decimal(str(round(
            fake.pyfloat(left_digits=6, right_digits=2, min_value=1000.0, max_value=100000.0),
            2
        )))
    )
    threshold_currency = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY'])
    )
    escalate_to_role = factory.SubFactory('factories.core_factories.RoleFactory')
    is_active = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=80))
