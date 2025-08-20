from django.test import TestCase
from django.contrib.auth import get_user_model
from django_fsm import TransitionNotAllowed
from task.models import Task, ApprovalRecord
from core.models import Project, Organization

User = get_user_model()


class TaskTransitionTest(TestCase):
    """Test cases for Task FSM state transitions"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.owner = User.objects.create_user(
            email='owner@example.com',
            username='owner',
            password='testpass123'
        )
        self.approver = User.objects.create_user(
            email='approver@example.com',
            username='approver',
            password='testpass123'
        )
        
        # Create test organization and project
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.project = Project.objects.create(
            name="Test Project", 
            organization=self.organization
        )
        
        # Create test task
        self.task = Task.objects.create(
            summary="Test Task",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
    
    def test_submit_transition(self):
        """Test submit transition from DRAFT to SUBMITTED"""
        self.assertEqual(self.task.status, Task.Status.DRAFT)
        
        # Execute submit transition
        self.task.submit()
        
        # Verify state change
        self.assertEqual(self.task.status, Task.Status.SUBMITTED)
    
    def test_start_review_transition(self):
        """Test start_review transition from SUBMITTED to UNDER_REVIEW"""
        # First submit the task
        self.task.submit()
        self.assertEqual(self.task.status, Task.Status.SUBMITTED)
        
        # Execute start_review transition
        self.task.start_review()
        
        # Verify state change
        self.assertEqual(self.task.status, Task.Status.UNDER_REVIEW)
    
    def test_approve_transition(self):
        """Test approve transition from UNDER_REVIEW to APPROVED"""
        # Setup: DRAFT -> SUBMITTED -> UNDER_REVIEW
        self.task.submit()
        self.task.start_review()
        self.assertEqual(self.task.status, Task.Status.UNDER_REVIEW)
        
        # Execute approve transition
        self.task.approve()
        
        # Verify state change
        self.assertEqual(self.task.status, Task.Status.APPROVED)
    
    def test_reject_transition(self):
        """Test reject transition from UNDER_REVIEW to REJECTED"""
        # Setup: DRAFT -> SUBMITTED -> UNDER_REVIEW
        self.task.submit()
        self.task.start_review()
        self.assertEqual(self.task.status, Task.Status.UNDER_REVIEW)
        
        # Execute reject transition
        self.task.reject()
        
        # Verify state change
        self.assertEqual(self.task.status, Task.Status.REJECTED)
    
    def test_lock_transition(self):
        """Test lock transition from APPROVED to LOCKED"""
        # Setup: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED
        self.task.submit()
        self.task.start_review()
        self.task.approve()
        self.assertEqual(self.task.status, Task.Status.APPROVED)
        
        # Execute lock transition
        self.task.lock()
        
        # Verify state change
        self.assertEqual(self.task.status, Task.Status.LOCKED)
    
    def test_cancel_transition(self):
        """Test cancel transition from allowed states to CANCELLED"""
        # Test cancel from SUBMITTED
        self.task.submit()
        self.assertEqual(self.task.status, Task.Status.SUBMITTED)
        self.task.cancel()
        self.assertEqual(self.task.status, Task.Status.CANCELLED)
        
        # Create new task and test cancel from UNDER_REVIEW
        task2 = Task.objects.create(
            summary="Test Task 2",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        task2.submit()
        task2.start_review()
        self.assertEqual(task2.status, Task.Status.UNDER_REVIEW)
        task2.cancel()
        self.assertEqual(task2.status, Task.Status.CANCELLED)
        
        # Test cancel from APPROVED
        task3 = Task.objects.create(
            summary="Test Task 3",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        task3.submit()
        task3.start_review()
        task3.approve()
        self.assertEqual(task3.status, Task.Status.APPROVED)
        task3.cancel()
        self.assertEqual(task3.status, Task.Status.CANCELLED)
        
        # Test cancel from REJECTED
        task4 = Task.objects.create(
            summary="Test Task 4",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        task4.submit()
        task4.start_review()
        task4.reject()
        self.assertEqual(task4.status, Task.Status.REJECTED)
        task4.cancel()
        self.assertEqual(task4.status, Task.Status.CANCELLED)
    
    def test_revise_transition(self):
        """Test revise transition from REJECTED/CANCELLED to DRAFT"""
        # Setup: DRAFT -> SUBMITTED -> UNDER_REVIEW -> REJECTED
        self.task.submit()
        self.task.start_review()
        self.task.reject()
        self.assertEqual(self.task.status, Task.Status.REJECTED)
        
        # Execute revise transition
        self.task.revise()
        
        # Verify state change
        self.assertEqual(self.task.status, Task.Status.DRAFT)
        
        # Test revise from CANCELLED
        task2 = Task.objects.create(
            summary="Test Task 3",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        # First submit then cancel to get to CANCELLED state
        task2.submit()
        task2.cancel()
        self.assertEqual(task2.status, Task.Status.CANCELLED)
        task2.revise()
        self.assertEqual(task2.status, Task.Status.DRAFT)
    
    def test_forward_to_next_transition(self):
        """Test forward_to_next transition from APPROVED to UNDER_REVIEW"""
        # Setup: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED
        self.task.submit()
        self.task.start_review()
        self.task.approve()
        self.assertEqual(self.task.status, Task.Status.APPROVED)
        
        # Execute forward_to_next transition
        self.task.forward_to_next()
        
        # Verify state change
        self.assertEqual(self.task.status, Task.Status.UNDER_REVIEW)
    
    def test_invalid_transitions(self):
        """Test invalid state transitions"""
        # Cannot submit from SUBMITTED
        self.task.submit()
        with self.assertRaises(TransitionNotAllowed):
            self.task.submit()
        
        # Cannot approve from DRAFT
        task2 = Task.objects.create(
            summary="Test Task 2",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        with self.assertRaises(TransitionNotAllowed):
            task2.approve()
        
        # Cannot reject from DRAFT
        with self.assertRaises(TransitionNotAllowed):
            task2.reject()
        
        # Cannot lock from DRAFT
        with self.assertRaises(TransitionNotAllowed):
            task2.lock()
        
        # Cannot revise from DRAFT
        with self.assertRaises(TransitionNotAllowed):
            task2.revise()
        
        # Cannot forward from DRAFT
        with self.assertRaises(TransitionNotAllowed):
            task2.forward_to_next()
        
        # Cannot cancel from DRAFT
        with self.assertRaises(TransitionNotAllowed):
            task2.cancel()
        
        # Cannot cancel from LOCKED
        task3 = Task.objects.create(
            summary="Test Task 3",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        # Setup: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> LOCKED
        task3.submit()
        task3.start_review()
        task3.approve()
        task3.lock()
        self.assertEqual(task3.status, Task.Status.LOCKED)
        
        with self.assertRaises(TransitionNotAllowed):
            task3.cancel()
    
    def test_transition_workflow(self):
        """Test complete workflow transitions"""
        # Complete workflow: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED -> LOCKED
        self.assertEqual(self.task.status, Task.Status.DRAFT)
        
        self.task.submit()
        self.assertEqual(self.task.status, Task.Status.SUBMITTED)
        
        self.task.start_review()
        self.assertEqual(self.task.status, Task.Status.UNDER_REVIEW)
        
        self.task.approve()
        self.assertEqual(self.task.status, Task.Status.APPROVED)
        
        self.task.lock()
        self.assertEqual(self.task.status, Task.Status.LOCKED)
    
    def test_rejection_workflow(self):
        """Test rejection workflow"""
        # Workflow: DRAFT -> SUBMITTED -> UNDER_REVIEW -> REJECTED -> DRAFT
        self.assertEqual(self.task.status, Task.Status.DRAFT)
        
        self.task.submit()
        self.assertEqual(self.task.status, Task.Status.SUBMITTED)
        
        self.task.start_review()
        self.assertEqual(self.task.status, Task.Status.UNDER_REVIEW)
        
        self.task.reject()
        self.assertEqual(self.task.status, Task.Status.REJECTED)
        
        self.task.revise()
        self.assertEqual(self.task.status, Task.Status.DRAFT)
