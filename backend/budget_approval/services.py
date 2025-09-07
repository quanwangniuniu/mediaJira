from django.core.exceptions import ValidationError
from django.db import transaction, OperationalError
from .models import BudgetRequest, BudgetPool, BudgetEscalationRule, BudgetRequestStatus
from .tasks import trigger_escalation
from core.models import AdChannel


class BudgetRequestService:
    """Budget Request Business Logic Service"""
    
    @staticmethod
    def create_budget_request(data):
        """Create a new budget request with validation, and save it as a draft"""
        with transaction.atomic():
            # Validate required fields
            if 'budget_pool' not in data:
                raise ValidationError("budget_pool is required")
            
            if 'ad_channel' not in data:
                raise ValidationError("ad_channel is required")
            
            # Validate that objects are provided (not IDs)
            if not isinstance(data['budget_pool'], BudgetPool):
                raise ValidationError("budget_pool must be a BudgetPool instance")
            
            
            if not isinstance(data['ad_channel'], AdChannel):
                raise ValidationError("ad_channel must be an AdChannel instance")
            
            # Create budget request
            budget_request = BudgetRequest.objects.create(**data)
            
            return budget_request
    
    @staticmethod
    def check_budget_availability(budget_pool, amount):
        """Check if budget pool has sufficient available amount"""
        return budget_pool.available_amount >= amount
    
    @staticmethod
    def check_escalation_rules(budget_request):
        """Check if budget request should be escalated based on rules"""
        escalation_rules = BudgetEscalationRule.objects.filter(
            budget_pool=budget_request.budget_pool,
            threshold_currency=budget_request.currency,
            is_active=True
        )
        
        for rule in escalation_rules:
            if rule.should_escalate(budget_request.amount, budget_request.currency):
                return True
        
        return False
    
    @staticmethod
    def submit_budget_request(budget_request, approver):
        """Submit a budget request (DRAFT --> SUBMITTED)"""
        if not budget_request.can_submit():
            raise ValidationError("Budget request cannot be submitted in current status")
        
        with transaction.atomic():
            # Check budget availability with lock to prevent race conditions
            # Use nowait=True to avoid deadlocks, which will cause concurrent constraint failures - avoid concurrent access
            try:
                budget_pool = BudgetPool.objects.select_for_update(nowait=True).get(id=budget_request.budget_pool.id)
                if not BudgetRequestService.check_budget_availability(budget_pool, budget_request.amount):
                    raise ValidationError("Insufficient budget available in the pool")
            except BudgetPool.DoesNotExist:
                raise ValidationError("Budget pool not found")
            except OperationalError as e:
                # Handle lock acquisition failures
                if "could not obtain lock" in str(e) or "LockNotAvailable" in str(e):
                    raise ValidationError("Budget pool is currently being accessed by another request")
                raise
            
            # Assign approver
            budget_request.current_approver = approver

            # status: DRAFT --> SUBMITTED
            budget_request.submit()
            budget_request.save()
            
            return budget_request
    
    @staticmethod
    def start_review(budget_request):
        """Start review for a budget request (SUBMITTED --> UNDER_REVIEW)"""
        if budget_request.status != BudgetRequestStatus.SUBMITTED:
            raise ValidationError("Budget request must be in SUBMITTED status to start review")
        
        with transaction.atomic():
            # status: SUBMITTED --> UNDER_REVIEW
            budget_request.send_for_review()
            budget_request.save()
            
            # Check if escalation rules are met
            if BudgetRequestService.check_escalation_rules(budget_request):
                # If escalation rules are met
                budget_request.is_escalated = True
                budget_request.save()
                # Trigger async escalation task
                trigger_escalation.delay(budget_request.id)
            
            return budget_request
    
    @staticmethod
    def process_approval(budget_request, approver, is_approved, comment, next_approver=None):
        """Process approval or rejection of a budget request
        
        Args:
            budget_request: The BudgetRequest instance to process
            approver: The User who is making the approval decision
            is_approved: Boolean indicating approval (True) or rejection (False)
            comment: Comment from the approver
            next_approver: Optional User to forward the request to (for multi-step approval)
            
        Returns:
            BudgetRequest: A fresh instance from the database with the updated state.
                          This ensures the returned object reflects all changes made during
                          the atomic transaction, including any status transitions and field updates.
                          
        Note:
            This method returns a new object instance (not the same Python object passed in)
            to ensure consistency with the database state after the atomic transaction.
            The original object's ID remains unchanged - only the Python object reference changes.
        """
        # Check if current approver matches (super admin can bypass this check)
        if not approver.is_superuser and budget_request.current_approver != approver:
            raise ValidationError("Only the assigned approver can process this request")
        
        if not budget_request.can_approve() and not budget_request.can_reject():
            raise ValidationError("Budget request cannot be processed in current status")
        
        with transaction.atomic():
            # Lock the budget request for update to ensure atomic state transition
            locked_request = BudgetRequest.objects.select_for_update().get(id=budget_request.id)
            
            # Re-check if the request can still be processed (status might have changed)
            if not locked_request.can_approve() and not locked_request.can_reject():
                raise ValidationError("Budget request cannot be processed in current status")
            
            
            # status: UNDER_REVIEW --> APPROVED
            if is_approved:
                locked_request.approve()
                locked_request.save()

                # status: APPROVED --> UNDER_REVIEW
                if next_approver:
                    locked_request.forward_to_next()
                    locked_request.current_approver = next_approver
                    locked_request.save()
                else:
                    # status: APPROVED --> LOCKED
                    locked_request.lock()
                    locked_request.save()

            # status: UNDER_REVIEW --> REJECTED
            else:
                locked_request.reject()
                locked_request.save()
            
            return locked_request

    @staticmethod
    def revise_rejected_request(budget_request, revised_data):
        """Revise a rejected budget request by modifying existing data, and save it as a draft"""
        if not budget_request.can_revise():
            raise ValidationError("Only rejected budget requests can be revised")
    
        with transaction.atomic():
            # Update budget request data
            for field, value in revised_data.items():
                if hasattr(budget_request, field):
                    setattr(budget_request, field, value)
        
            # status: REJECTED --> DRAFT
            budget_request.revise()
            budget_request.save()
        
            return budget_request    

    @staticmethod
    def lock_budget_request(budget_request):
        """Lock budget request and deduct amount from pool"""
        if not budget_request.can_lock():
            raise ValidationError("Budget request cannot be locked in current status")
        
        with transaction.atomic():
            # Lock the budget request for update to prevent concurrent lock operations
            locked_request = BudgetRequest.objects.select_for_update().get(id=budget_request.id)
            
            # Re-check if the request can still be locked (status might have changed)
            if not locked_request.can_lock():
                raise ValidationError("Budget request cannot be locked in current status")
            
            # Lock the budget pool to prevent concurrent modifications
            budget_pool = BudgetPool.objects.select_for_update().get(id=locked_request.budget_pool.id)
            
            # Validate budget availability before locking (critical check)
            if not BudgetRequestService.check_budget_availability(budget_pool, locked_request.amount):
                raise ValidationError("Insufficient budget available for locking")

            # TODO: send pool underflow notification - need to reallocate the budget pool
            
            # status: APPROVED --> LOCKED or REJECTED --> LOCKED
            # The lock() method in the model will automatically deduct from budget pool
            locked_request.lock()
            locked_request.save()
            
            return locked_request
    


class BudgetPoolService:
    """Budget Pool Business Logic Service"""
    
    @staticmethod
    def get_budget_pool_summary(budget_pool):
        """Get summary information for a budget pool"""
        # Get all budget requests for this pool
        budget_requests = budget_pool.budget_requests.all()
        
        # Calculate statistics
        total_requests = budget_requests.count()
        pending_requests = budget_requests.filter(status=BudgetRequestStatus.UNDER_REVIEW).count()
        approved_requests = budget_requests.filter(status=BudgetRequestStatus.APPROVED).count()
        rejected_requests = budget_requests.filter(status=BudgetRequestStatus.REJECTED).count()
        locked_requests = budget_requests.filter(status=BudgetRequestStatus.LOCKED).count()
        
        # Calculate total requested amount
        total_requested = sum(req.amount for req in budget_requests if req.status != BudgetRequestStatus.REJECTED)
        
        return {
            'pool_id': budget_pool.id,
            'total_amount': budget_pool.total_amount,
            'used_amount': budget_pool.used_amount,
            'available_amount': budget_pool.available_amount,
            'currency': budget_pool.currency,
            'statistics': {
                'total_requests': total_requests,
                'pending_requests': pending_requests,
                'approved_requests': approved_requests,
                'rejected_requests': rejected_requests,
                'locked_requests': locked_requests,
                'total_requested_amount': total_requested
            }
        }

