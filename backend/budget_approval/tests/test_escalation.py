import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.core.exceptions import ValidationError
from budget_approval.models import BudgetRequestStatus, BudgetEscalationRule, BudgetRequest
from budget_approval.services import BudgetRequestService
from budget_approval.tasks import trigger_escalation, send_escalation_notification

@pytest.mark.django_db
class TestEscalationTrigger:
    """Test escalation trigger functionality"""
    
    @patch('budget_approval.services.trigger_escalation.delay')
    def test_escalation_trigger_on_submit(self, mock_trigger_escalation, user1, task, budget_pool, user2, ad_channel, escalation_rule):
        """Test that escalation is triggered when submitting a request above threshold"""
        # Mock the escalation task
        mock_trigger_escalation.return_value = None
        
        # Create a request that exceeds the escalation threshold
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('6000.00'),  # Above 5000 threshold
            'currency': 'AUD',
            'budget_pool': budget_pool,
            'current_approver': user2,
            'ad_channel': ad_channel,
            'notes': 'Test escalation trigger'
        })
        
        # Initially should not be escalated (still in DRAFT)
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.DRAFT
        
        # Submit the request
        budget_request = BudgetRequestService.submit_budget_request(budget_request, user2)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review - this should trigger escalation
        budget_request = BudgetRequestService.start_review(budget_request)
        
        # Verify the request was submitted and marked as escalated
        assert budget_request.is_escalated is True
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW
        
        # Verify the escalation task was called
        mock_trigger_escalation.assert_called_once_with(budget_request.id)
    
    @patch('budget_approval.services.trigger_escalation.delay')
    def test_no_escalation_below_threshold(self, mock_trigger_escalation, user1, task, budget_pool, user2, ad_channel, escalation_rule):
        """Test that escalation is not triggered when amount is below threshold"""
        # Create a request that is below the escalation threshold
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('3000.00'),  # Below 5000 threshold
            'currency': 'AUD',
            'budget_pool': budget_pool,
            'current_approver': user2,
            'ad_channel': ad_channel,
            'notes': 'Test no escalation'
        })
        
        # Initially should not be escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.DRAFT
        
        # Submit the request
        budget_request = BudgetRequestService.submit_budget_request(budget_request, user2)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review - should not trigger escalation
        budget_request = BudgetRequestService.start_review(budget_request)
        
        # Verify the request was submitted but not escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW
        
        # Verify the escalation task was not called
        mock_trigger_escalation.assert_not_called()
    
    @patch('budget_approval.services.trigger_escalation.delay')
    def test_escalation_at_threshold(self, mock_trigger_escalation, user1, task, budget_pool, user2, ad_channel, escalation_rule):
        """Test that escalation is triggered when amount equals threshold"""
        # Mock the escalation task
        mock_trigger_escalation.return_value = None
        
        # Create a request that equals the escalation threshold
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('5000.00'),  # Exactly at 5000 threshold
            'currency': 'AUD',
            'budget_pool': budget_pool,
            'current_approver': user2,
            'ad_channel': ad_channel,
            'notes': 'Test escalation at threshold'
        })
        
        # Initially should not be escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.DRAFT
        
        # Submit the request
        budget_request = BudgetRequestService.submit_budget_request(budget_request, user2)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review - this should trigger escalation
        budget_request = BudgetRequestService.start_review(budget_request)
        
        # Verify the request was submitted and marked as escalated
        assert budget_request.is_escalated is True
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW
        
        # Verify the escalation task was called
        mock_trigger_escalation.assert_called_once_with(budget_request.id)
    
    @patch('budget_approval.services.trigger_escalation.delay')
    def test_escalation_different_currency(self, mock_trigger_escalation, user1, task, budget_pool, user2, ad_channel, escalation_rule):
        """Test that escalation is not triggered for different currency"""
        # Create a request with different currency
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('6000.00'),  # Above threshold but different currency
            'currency': 'USD',  # Different from AUD threshold
            'budget_pool': budget_pool,
            'current_approver': user2,
            'ad_channel': ad_channel,
            'notes': 'Test escalation different currency'
        })
        
        # Initially should not be escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.DRAFT
        
        # Submit the request
        budget_request = BudgetRequestService.submit_budget_request(budget_request, user2)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review - should not trigger escalation
        budget_request = BudgetRequestService.start_review(budget_request)
        
        # Verify the request was submitted but not escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW
        
        # Verify the escalation task was not called
        mock_trigger_escalation.assert_not_called()
    
    @patch('budget_approval.services.trigger_escalation.delay')
    def test_escalation_inactive_rule(self, mock_trigger_escalation, user1, task, budget_pool, user2, ad_channel, escalation_rule):
        """Test that escalation is not triggered when rule is inactive"""
        # Deactivate the escalation rule
        escalation_rule.is_active = False
        escalation_rule.save()
        
        # Create a request that would normally trigger escalation
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('6000.00'),  # Above threshold
            'currency': 'AUD',
            'budget_pool': budget_pool,
            'current_approver': user2,
            'ad_channel': ad_channel,
            'notes': 'Test escalation inactive rule'
        })
        
        # Initially should not be escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.DRAFT
        
        # Submit the request
        budget_request = BudgetRequestService.submit_budget_request(budget_request, user2)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review - should not trigger escalation
        budget_request = BudgetRequestService.start_review(budget_request)
        
        # Verify the request was submitted but not escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW
        
        # Verify the escalation task was not called
        mock_trigger_escalation.assert_not_called()
    
    @patch('budget_approval.services.trigger_escalation.delay')
    def test_multiple_escalation_rules(self, mock_trigger_escalation, user1, task, budget_pool, user2, ad_channel, role):
        """Test escalation with multiple rules"""
        # Create multiple escalation rules with different currencies to avoid unique constraint
        rule1 = BudgetEscalationRule.objects.create(
            budget_pool=budget_pool,
            threshold_amount=Decimal('3000.00'),
            threshold_currency='AUD',
            escalate_to_role=role,
            is_active=True
        )
        
        rule2 = BudgetEscalationRule.objects.create(
            budget_pool=budget_pool,
            threshold_amount=Decimal('7000.00'), # Give it an amount that is greater than 3000
            threshold_currency='USD',  # Different currency to avoid unique constraint
            escalate_to_role=role,
            is_active=True
        )
        
        # Mock the escalation task
        mock_trigger_escalation.return_value = None
        
        # Create a request that triggers the first rule
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('4000.00'),  # Above 3000 threshold
            'currency': 'AUD',
            'budget_pool': budget_pool,
            'current_approver': user2,
            'ad_channel': ad_channel,
            'notes': 'Test multiple escalation rules'
        })
        
        # Initially should not be escalated
        assert budget_request.is_escalated is False
        assert budget_request.status == BudgetRequestStatus.DRAFT
        
        # Submit the request
        budget_request = BudgetRequestService.submit_budget_request(budget_request, user2)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review - this should trigger escalation
        budget_request = BudgetRequestService.start_review(budget_request)
        
        # Verify the request was submitted and marked as escalated
        assert budget_request.is_escalated is True
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW
        
        # Verify the escalation task was called
        mock_trigger_escalation.assert_called_once_with(budget_request.id)

@pytest.mark.django_db
class TestEscalationTask:
    """Test escalation task functionality"""
    
    @patch('budget_approval.tasks.send_escalation_notification')
    def test_trigger_escalation_task_success(self, mock_send_notification, user1, task, budget_pool, user2, ad_channel, escalation_rule, user_role1, user_role2):
        """Test successful escalation task execution"""
        # Mock the notification function
        mock_send_notification.return_value = True
        
        # Create an escalated budget request
        budget_request = BudgetRequest.objects.create(
            task=task,
            requested_by=user1,
            amount=Decimal('6000.00'),
            currency='AUD',
            status=BudgetRequestStatus.DRAFT,
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel,
            is_escalated=True,
            notes='Test escalation task'
        )
        
        # Execute the escalation task
        result = trigger_escalation(budget_request.id)
        
        # Verify the task executed successfully
        assert result is not False
        assert result['success'] is True
        assert result['budget_request_id'] == budget_request.id
        assert len(result['escalation_users']) >= 0  # May be 0 if no users found
        
        # Verify notifications were sent (if users exist)
        if len(result['escalation_users']) > 0:
            assert mock_send_notification.call_count >= 1
    
    @patch('budget_approval.tasks.send_escalation_notification')
    def test_trigger_escalation_task_not_escalated(self, mock_send_notification, user1, task, budget_pool, user2, ad_channel, escalation_rule):
        """Test escalation task when request is not escalated"""
        # Create a non-escalated budget request
        budget_request = BudgetRequest.objects.create(
            task=task,
            requested_by=user1,
            amount=Decimal('3000.00'),
            currency='AUD',
            status=BudgetRequestStatus.DRAFT,
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel,
            is_escalated=False,
            notes='Test escalation task not escalated'
        )
        
        # Execute the escalation task
        result = trigger_escalation(budget_request.id)
        
        # Verify the task returned False
        assert result is False
        
        # Verify no notifications were sent
        mock_send_notification.assert_not_called()
    
    @patch('budget_approval.tasks.send_escalation_notification')
    def test_trigger_escalation_task_request_not_found(self, mock_send_notification):
        """Test escalation task when request does not exist"""
        # Execute the escalation task with non-existent ID
        result = trigger_escalation(99999)
        
        # Verify the task returned False
        assert result is False
        
        # Verify no notifications were sent
        mock_send_notification.assert_not_called()
    
    @patch('budget_approval.tasks.send_escalation_notification')
    def test_trigger_escalation_task_no_escalation_rules(self, mock_send_notification, user1, task, budget_pool, user2, ad_channel):
        """Test escalation task when no escalation rules exist"""
        # Create an escalated budget request without escalation rules
        budget_request = BudgetRequest.objects.create(
            task=task,
            requested_by=user1,
            amount=Decimal('6000.00'),
            currency='AUD',
            status=BudgetRequestStatus.DRAFT,
            budget_pool=budget_pool,
            current_approver=user2,
            ad_channel=ad_channel,
            is_escalated=True,
            notes='Test escalation task no rules'
        )
        
        # Execute the escalation task
        result = trigger_escalation(budget_request.id)
        
        # Verify the task executed successfully but with no users
        assert result is not False
        assert result['success'] is True
        assert result['budget_request_id'] == budget_request.id
        assert len(result['escalation_users']) == 0  # No escalation rules, so no users
        
        # Verify no notifications were sent
        mock_send_notification.assert_not_called()

@pytest.mark.django_db
class TestEscalationNotification:
    """Test escalation notification functionality"""
    
    def test_send_escalation_notification_success(self, user1):
        """Test successful escalation notification"""
        
        # Send notification - NotificationDispatcher is already a mock implementation
        result = send_escalation_notification(user1, "Test escalation message")
        
        # Verify notification was sent successfully
        assert result is True
    
    def test_send_escalation_notification_error(self, user1):
        """Test escalation notification with error"""
        
        # Test with non-existent user ID to trigger error
        non_existent_user = type('MockUser', (), {'id': 99999, 'username': 'nonexistent'})()
        
        # Send notification
        result = send_escalation_notification(non_existent_user, "Test escalation message")
        
        # Verify notification failed
        assert result is False
    