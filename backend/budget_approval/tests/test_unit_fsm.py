import pytest
from django.utils import timezone
from freezegun import freeze_time
from budget_approval.models import BudgetRequestStatus

@pytest.mark.django_db
class TestBudgetRequestFSM:
    """Test BudgetRequest FSM transitions"""
    
    def test_draft_to_submitted_transition(self, budget_request_draft):
        """Test DRAFT -> SUBMITTED transition"""
        assert budget_request_draft.status == BudgetRequestStatus.DRAFT
        assert budget_request_draft.can_submit() is True
        
        budget_request_draft.submit()
        assert budget_request_draft.status == BudgetRequestStatus.SUBMITTED
        assert budget_request_draft.submitted_at is not None
    
    def test_submitted_to_under_review_transition(self, budget_request_submitted):
        """Test SUBMITTED -> UNDER_REVIEW transition"""
        assert budget_request_submitted.status == BudgetRequestStatus.SUBMITTED
        assert budget_request_submitted.can_approve() is False
        
        budget_request_submitted.send_for_review()
        assert budget_request_submitted.status == BudgetRequestStatus.UNDER_REVIEW
        assert budget_request_submitted.can_approve() is True
    
    def test_under_review_to_approved_transition(self, budget_request_under_review):
        """Test UNDER_REVIEW -> APPROVED transition"""
        assert budget_request_under_review.status == BudgetRequestStatus.UNDER_REVIEW
        assert budget_request_under_review.can_approve() is True
        
        budget_request_under_review.approve()
        assert budget_request_under_review.status == BudgetRequestStatus.APPROVED
    
    def test_under_review_to_rejected_transition(self, budget_request_under_review):
        """Test UNDER_REVIEW -> REJECTED transition"""
        assert budget_request_under_review.status == BudgetRequestStatus.UNDER_REVIEW
        assert budget_request_under_review.can_reject() is True
        
        budget_request_under_review.reject()
        assert budget_request_under_review.status == BudgetRequestStatus.REJECTED
    
    def test_approved_to_locked_transition(self, budget_request_under_review, budget_pool):
        """Test APPROVED -> LOCKED transition with budget deduction"""
        # First approve the request
        budget_request_under_review.approve()
        assert budget_request_under_review.status == BudgetRequestStatus.APPROVED
        
        # Check initial budget pool state
        initial_used = budget_pool.used_amount
        request_amount = budget_request_under_review.amount
        
        # Lock the request
        budget_request_under_review.lock()
        assert budget_request_under_review.status == BudgetRequestStatus.LOCKED
        
        # Verify budget pool was updated
        budget_pool.refresh_from_db()
        assert budget_pool.used_amount == initial_used + request_amount
    
    def test_rejected_to_draft_transition(self, budget_request_under_review):
        """Test REJECTED -> DRAFT transition (revision)"""
        # First reject the request
        budget_request_under_review.reject()
        assert budget_request_under_review.status == BudgetRequestStatus.REJECTED
        assert budget_request_under_review.can_revise() is True
        
        # Revise the request
        budget_request_under_review.revise()
        assert budget_request_under_review.status == BudgetRequestStatus.DRAFT
    
    def test_approved_to_under_review_transition(self, budget_request_under_review):
        """Test APPROVED -> UNDER_REVIEW transition (forward to next approver)"""
        # First approve the request
        budget_request_under_review.approve()
        assert budget_request_under_review.status == BudgetRequestStatus.APPROVED
        assert budget_request_under_review.can_forward() is True
        
        # Forward to next approver
        budget_request_under_review.forward_to_next()
        assert budget_request_under_review.status == BudgetRequestStatus.UNDER_REVIEW
    
    def test_invalid_transitions(self, budget_request_draft):
        """Test invalid FSM transitions"""
        # Cannot approve from DRAFT
        assert budget_request_draft.can_approve() is False
        
        # Cannot reject from DRAFT
        assert budget_request_draft.can_reject() is False
        
        # Cannot lock from DRAFT
        assert budget_request_draft.can_lock() is False
    
    @freeze_time("2024-01-01 10:00:00")
    def test_submit_sets_timestamp(self, budget_request_draft):
        """Test that submit() sets the submitted_at timestamp"""
        assert budget_request_draft.submitted_at is None
        
        budget_request_draft.submit()
        assert budget_request_draft.submitted_at == timezone.now()