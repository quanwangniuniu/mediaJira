import pytest
import threading
import time
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from budget_approval.models import BudgetRequestStatus, BudgetRequest, BudgetPool
from budget_approval.services import BudgetRequestService
from core.models import AdChannel
from task.models import Task


@pytest.mark.django_db(transaction=True)
class TestConcurrentSubmissions:
    """Test concurrent submissions to the same budget pool"""

    @staticmethod
    def submit_request(user_id, task_id, amount, budget_pool_id, approver_id, ad_channel_id, results, errors):
        """Helper function to submit a budget request"""
        try:
            with transaction.atomic():
                # Re-fetch objects in the thread context to avoid database connection issues
                User = get_user_model()
                user = User.objects.get(id=user_id)
                task = Task.objects.get(id=task_id)
                budget_pool = BudgetPool.objects.get(id=budget_pool_id)
                approver = User.objects.get(id=approver_id)
                ad_channel = AdChannel.objects.get(id=ad_channel_id)
                
                # Create budget request (draft) - pass objects, not IDs
                budget_request = BudgetRequestService.create_budget_request({
                    'task': task,
                    'requested_by': user,
                    'amount': amount,
                    'currency': 'AUD',
                    'budget_pool': budget_pool,
                    'current_approver': approver,
                    'ad_channel': ad_channel,
                    'notes': f'Concurrent request from {user.username}'
                })
                
                # Submit the budget request (draft -> submitted)
                budget_request = BudgetRequestService.submit_budget_request(budget_request, approver)
                
                # Start review (submitted -> under_review)
                budget_request = BudgetRequestService.start_review(budget_request)
                
                results.append({
                    'user': user.username,
                    'success': True,
                    'request_id': budget_request.id,
                    'amount': amount,
                    'status': budget_request.status
                })
        except Exception as e:
            errors.append({
                'user': user_id,
                'success': False,
                'error': str(e),
                'amount': amount
            })
    
    def test_concurrent_submissions_same_pool(self, user1, user2, task, budget_pool, ad_channel):
        """Test 2 users submitting to same pool simultaneously when the pool has enough budget"""
        # Note: The budget constraint check happens during the submission phase
        # This test demonstrates that all the requests can be created successfully, but only one request can be submitted successfully
        # due to concurrency control using select_for_update(nowait=True)
        
        # Create an approver user
        User = get_user_model()
        approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            password='testpass123',
            organization=user1.organization
        )
        
        # Create a second task for user2
        task2 = Task.objects.create(
            summary="Test Task 2",
            type="budget",
            project=task.project
        )
        
        results = []
        errors = []
        
        # Create two threads for concurrent submissions
        thread1 = threading.Thread(
            target=TestConcurrentSubmissions.submit_request,
            args=(user1.id, task.id, Decimal('4000.00'), budget_pool.id, approver.id, ad_channel.id, results, errors)
        )
        thread2 = threading.Thread(
            target=TestConcurrentSubmissions.submit_request,
            args=(user2.id, task2.id, Decimal('5000.00'), budget_pool.id, approver.id, ad_channel.id, results, errors)
        )
        
        # Start both threads simultaneously
        thread1.start()
        thread2.start()
        
        # Wait for both threads to complete
        thread1.join()
        thread2.join()
        
        # Analyze results
        successful_requests = [r for r in results if r['success']]
        failed_requests = errors
        
        assert len(successful_requests) == 1, "Only one request should succeed"
        assert len(failed_requests) == 1, "One request should fail"
        
        # Verify that successful requests are in UNDER_REVIEW status
        for request in successful_requests:
            assert request['status'] == BudgetRequestStatus.UNDER_REVIEW, \
                f"Request should be in UNDER_REVIEW status, got {request['status']}"
        
        # Verify budget pool state - used_amount should still be 0 since requests are not locked yet
        budget_pool.refresh_from_db()
        assert budget_pool.used_amount == Decimal('0.00'), \
            f"Budget pool used_amount should be 0.00, got {budget_pool.used_amount}"
        
    def test_concurrent_submissions_exceeding_pool(self, user1, user2, task, budget_pool, ad_channel):
        """Test concurrent submissions that would exceed pool capacity"""
        # Note: The budget constraint check happens during the submission phase
        # This test demonstrates that all the requests can be created successfully, but only one request can be submitted successfully
        # due to concurrency control using select_for_update(nowait=True)

        # Create an approver user
        User = get_user_model()
        approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            password='testpass123',
            organization=user1.organization
        )
        
        # Create a second task for user2
        task2 = Task.objects.create(
            summary="Test Task 2",
            type="budget",
            project=task.project
        )
        
        results = []
        errors = []
        
        # Create two threads for concurrent submissions that exceed pool
        thread1 = threading.Thread(
            target=TestConcurrentSubmissions.submit_request,
            args=(user1.id, task.id, Decimal('7000.00'), budget_pool.id, approver.id, ad_channel.id, results, errors)
        )
        thread2 = threading.Thread(
            target=TestConcurrentSubmissions.submit_request,
            args=(user2.id, task2.id, Decimal('6000.00'), budget_pool.id, approver.id, ad_channel.id, results, errors)
        )
        
        # Start both threads simultaneously
        thread1.start()
        thread2.start()
        
        # Wait for both threads to complete
        thread1.join()
        thread2.join()
        
        # Analyze results
        successful_requests = [r for r in results if r['success']]
        failed_requests = errors
        
        # At most one request should succeed (due to pool constraints during submission)
        assert len(successful_requests) == 1, "Only one request should succeed"
        
        # At least one request should fail
        assert len(failed_requests) == 1, "Only one request should fail"
        
        # Verify that failed requests have appropriate error messages
        for failed_request in failed_requests:
            # Accept various concurrent constraint failure messages
            error_msg = failed_request['error']
            assert ("Insufficient budget" in error_msg or 
                   "could not obtain lock" in error_msg or
                   "LockNotAvailable" in error_msg or
                   "Budget pool is currently being accessed" in error_msg), \
                f"Failed request should have appropriate concurrent constraint error: {error_msg}"
    
    def test_concurrent_approvals_same_request(self, user1, task, budget_pool, ad_channel):
        """Test concurrent approvals of the same request - simulate user double-making the decision due to network lag"""
        
        # Create an approver user
        User = get_user_model()
        approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            password='testpass123',
            organization=user1.organization
        )
        
        # Create a budget request
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('1000.00'),
            'currency': 'AUD',
            'budget_pool': budget_pool,
            'current_approver': approver,
            'ad_channel': ad_channel,
            'notes': 'Test concurrent approvals'
        })

        # Submit the request
        BudgetRequestService.submit_budget_request(budget_request, approver)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review
        budget_request = BudgetRequestService.start_review(budget_request)
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW

        results = []
        errors = []

        def approve_request(approver_id, is_approved, request_id):
            """Helper function to approve a budget request"""
            try:
                with transaction.atomic():
                    # Re-fetch objects in the thread context
                    User = get_user_model()
                    approver = User.objects.get(id=approver_id)
                    current_request = BudgetRequest.objects.get(id=request_id)
                    
                    BudgetRequestService.process_approval(
                        budget_request=current_request,
                        approver=approver,
                        is_approved=is_approved,
                        comment=f'Concurrent approval: {"approve" if is_approved else "reject"}'
                    )
                    results.append({
                        'approver': approver.username,
                        'decision': "approve" if is_approved else "reject",
                        'success': True
                    })
            except Exception as e:
                errors.append({
                    'approver': approver_id,
                    'decision': "approve" if is_approved else "reject",
                    'success': False,
                    'error': str(e)
                })

        # Create two threads for concurrent approvals
        thread1 = threading.Thread(
            target=approve_request,
            args=(approver.id, True, budget_request.id)  # approve
        )
        thread2 = threading.Thread(
            target=approve_request,
            args=(approver.id, False, budget_request.id)  # reject
        )

        # Start both threads simultaneously
        thread1.start()
        thread2.start()

        # Wait for both threads to complete
        thread1.join()
        thread2.join()

        # Analyze results
        successful_approvals = [r for r in results if r['success']]
        failed_approvals = errors

        # Only one approval should succeed (due to FSM constraints)
        assert len(successful_approvals) == 1, "Only one approval should succeed"
        assert len(failed_approvals) == 1, "One approval should fail"

        # Verify the request state - use a new query to avoid FSM issues
        final_request = BudgetRequest.objects.get(id=budget_request.id)
        assert final_request.status in [BudgetRequestStatus.APPROVED, BudgetRequestStatus.REJECTED, BudgetRequestStatus.LOCKED]

    def test_concurrent_lock_operations(self, user1, task, budget_pool, ad_channel):
        """Test concurrent lock operations on the same request - simulating user double-clicking due to network lag"""
        # Create an approver user
        User = get_user_model()
        approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            password='testpass123',
            organization=user1.organization
        )
        
        # Create a budget request
        budget_request = BudgetRequestService.create_budget_request({
            'task': task,
            'requested_by': user1,
            'amount': Decimal('1000.00'),
            'currency': 'AUD',
            'budget_pool': budget_pool,
            'current_approver': approver,
            'ad_channel': ad_channel,
            'notes': 'Test concurrent locks'
        })

        # Submit the request
        BudgetRequestService.submit_budget_request(budget_request, approver)
        assert budget_request.status == BudgetRequestStatus.SUBMITTED
        
        # Start review
        budget_request = BudgetRequestService.start_review(budget_request)
        assert budget_request.status == BudgetRequestStatus.UNDER_REVIEW
        
        # Approve the request using FSM method to get it to APPROVED state
        budget_request.approve()
        budget_request.save()
        
        # Verify the request is in APPROVED state
        final_request = BudgetRequest.objects.get(id=budget_request.id)
        assert final_request.status == BudgetRequestStatus.APPROVED, f"Request should be in APPROVED state, got {final_request.status}"

        # Now test concurrent lock operations (simulating user double-clicking the lock button)
        results = []
        errors = []

        def lock_request():
            """Helper function to lock a budget request"""
            try:
                with transaction.atomic():
                    # Re-fetch the request in the thread context
                    current_request = BudgetRequest.objects.get(id=budget_request.id)
                    BudgetRequestService.lock_budget_request(current_request)
                    results.append({
                        'success': True
                    })
            except Exception as e:
                errors.append({
                    'success': False,
                    'error': str(e)
                })

        # Create two threads for concurrent lock operations
        thread1 = threading.Thread(target=lock_request)
        thread2 = threading.Thread(target=lock_request)

        # Start both threads simultaneously
        thread1.start()
        thread2.start()

        # Wait for both threads to complete
        thread1.join()
        thread2.join()

        # Analyze results
        successful_locks = [r for r in results if r['success']]
        failed_locks = errors

        # Only one lock operation should succeed
        assert len(successful_locks) == 1, "Only one lock operation should succeed"
        assert len(failed_locks) == 1, "One lock operation should fail"

        # Verify the request is now locked
        final_request = BudgetRequest.objects.get(id=budget_request.id)
        assert final_request.status == BudgetRequestStatus.LOCKED 