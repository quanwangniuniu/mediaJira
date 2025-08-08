import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from budget_approval.models import BudgetRequest, BudgetPool, BudgetEscalationRule


@pytest.mark.django_db
class TestBudgetValidation:
    """Test budget amount validation"""
    
    def test_positive_amount_validation(self, user1, task, budget_pool, user2, ad_channel):
        """Test that negative amounts are not allowed"""
        request = BudgetRequest(
            task=task,
            requested_by=user1,
            amount=Decimal('-100.00'),
            currency='AUD',
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel,
        )
        try:
            request.clean_fields(exclude=['status'])
        except ValidationError as e:
            assert 'amount' in e.message_dict
    
    def test_zero_amount_validation(self, user1, task, budget_pool, user2, ad_channel):
        """Test that zero amounts are not allowed"""
        request = BudgetRequest(
            task=task,
            requested_by=user1,
            amount=Decimal('0.00'),
            currency='AUD',
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel
        )
        try:
            request.clean_fields(exclude=['status'])
        except ValidationError as e:
            assert 'amount' in e.message_dict
    
    def test_three_decimal_places_validation(self, user1, task, budget_pool, user2, ad_channel):
        """Test that 3 decimal places are not allowed"""
        request = BudgetRequest(
            task=task,
            requested_by=user1,
            amount=Decimal('1234.567'),
            currency='AUD',
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel
        )
        try:
            request.clean_fields(exclude=['status'])
        except ValidationError as e:
            assert 'amount' in e.message_dict

    def test_zero_decimal_places_validation(self, user1, task, budget_pool, user2, ad_channel):
        """Test that 0 decimal places are allowed"""
        request = BudgetRequest.objects.create(
            task=task,
            requested_by=user1,
            amount=Decimal('1234'),
            currency='AUD',
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel
        )
        assert request.amount == Decimal('1234.00')  # Django will automatically add zeros

    def test_one_decimal_place_validation(self, user1, task, budget_pool, user2, ad_channel):
        """Test that 1 decimal place is allowed"""
        request = BudgetRequest.objects.create(
            task=task,
            requested_by=user1,
            amount=Decimal('1234.5'),
            currency='AUD',
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel
        )
        assert request.amount == Decimal('1234.50')  # Django will automatically add zeros


@pytest.mark.django_db
class TestBudgetPoolValidation:
    """Test BudgetPool amount validation"""

    def test_negative_total_amount_validation(self, project, ad_channel):
        """Test that negative total_amount is not allowed"""
        pool = BudgetPool(
            project=project,
            ad_channel=ad_channel,
            total_amount=Decimal('-1000.00'),
            used_amount=Decimal('0.00'),
            currency='AUD'
        )
        with pytest.raises(ValidationError) as e:
            pool.full_clean()
        assert 'total_amount' in e.value.message_dict

    def test_negative_used_amount_validation(self, project, ad_channel):
        """Test that negative used_amount is not allowed"""
        pool = BudgetPool(
            project=project,
            ad_channel=ad_channel,
            total_amount=Decimal('10000.00'),
            used_amount=Decimal('-1000.00'),
            currency='AUD'
        )
        with pytest.raises(ValidationError) as e:
            pool.full_clean()
        assert 'used_amount' in e.value.message_dict

    def test_used_amount_exceeds_total_validation(self, project, ad_channel):
        """Test that used_amount cannot exceed total_amount"""
        pool = BudgetPool(
            project=project,
            ad_channel=ad_channel,
            total_amount=Decimal('10000.00'),
            used_amount=Decimal('15000.00'),
            currency='AUD'
        )
        with pytest.raises(ValidationError) as e:
            pool.full_clean()
        assert 'used_amount' in e.value.message_dict

    def test_budget_pool_three_decimal_places_validation(self, project, ad_channel):
        """Test that BudgetPool doesn't allow 3 decimal places"""
        pool = BudgetPool(
            project=project,
            ad_channel=ad_channel,
            total_amount=Decimal('12345.678'),
            used_amount=Decimal('0.00'),
            currency='AUD'
        )
        with pytest.raises(ValidationError) as e:
            pool.full_clean()
        assert 'total_amount' in e.value.message_dict

    def test_available_amount_computation(self, project, ad_channel):
        """Test that available_amount is computed correctly"""
        pool = BudgetPool(
            project=project,
            ad_channel=ad_channel,
            total_amount=Decimal('10000.00'),
            used_amount=Decimal('1234.56'),
            currency='AUD'
        )
        assert pool.available_amount == Decimal('8765.44')


@pytest.mark.django_db
class TestBudgetEscalationRuleValidation:
    """Test BudgetEscalationRule amount validation"""

    def test_negative_threshold_amount_validation(self, budget_pool, role):
        """Test that negative threshold_amount is not allowed"""
        rule = BudgetEscalationRule(
            budget_pool=budget_pool,
            threshold_amount=Decimal('-1000.00'),
            threshold_currency='AUD',
            escalate_to_role=role,
            is_active=True
        )
        with pytest.raises(ValidationError) as e:
            rule.full_clean()
        assert 'threshold_amount' in e.value.message_dict

    def test_three_decimal_places_validation(self, budget_pool, role):
        """Test that 3 decimal places are not allowed"""
        rule = BudgetEscalationRule(
            budget_pool=budget_pool,
            threshold_amount=Decimal('1234.567'),
            threshold_currency='AUD',
            escalate_to_role=role,
            is_active=True
        )
        with pytest.raises(ValidationError) as e:
            rule.full_clean()
        assert 'threshold_amount' in e.value.message_dict

    

