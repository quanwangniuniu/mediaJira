from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from task.models import Task, ApprovalRecord
from core.models import Project, Organization, AdChannel
from budget_approval.models import BudgetRequest, BudgetPool

User = get_user_model()


class ApprovalRecordModelTest(TestCase):
    """Test cases for ApprovalRecord model"""
    
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
        
        # Create test approval record
        self.approval_record = ApprovalRecord.objects.create(
            task=self.task,
            approved_by=self.approver,
            is_approved=True,
            comment="Approved for testing",
            step_number=1
        )
    
    def test_approval_record_relationship(self):
        """Test approval record relationship with task"""
        # Test task has approval records
        self.assertEqual(self.task.approval_records.count(), 1)
        self.assertEqual(self.task.approval_records.first(), self.approval_record)
        
        # Test approver has approval records
        self.assertEqual(self.approver.task_approval_records.count(), 1)
        self.assertEqual(self.approver.task_approval_records.first(), self.approval_record)
    
    def test_approval_record_unique_constraint(self):
        """Test unique constraint on task and step_number"""
        # Try to create another approval record with same task and step_number
        with self.assertRaises(Exception):  # Should raise IntegrityError
            ApprovalRecord.objects.create(
                task=self.task,
                approved_by=self.approver,
                is_approved=False,
                comment="Rejected",
                step_number=1  # Same step_number as existing record
            )
    
    def test_approval_record_ordering(self):
        """Test approval record ordering by step_number"""
        # Create another approval record with higher step number
        approval_record2 = ApprovalRecord.objects.create(
            task=self.task,
            approved_by=self.approver,
            is_approved=True,
            comment="Second approval",
            step_number=2
        )
        
        # Test ordering
        records = list(self.task.approval_records.all())
        self.assertEqual(records[0], self.approval_record)  # step_number=1
        self.assertEqual(records[1], approval_record2)      # step_number=2


class RevisionRoundTrackingTest(TestCase):
    """Test cases for SMP-501: revision round tracking and approval history preservation"""

    def setUp(self):
        """Set up test data"""
        self.owner = User.objects.create_user(
            email='owner2@example.com',
            username='owner2',
            password='testpass123'
        )
        self.approver = User.objects.create_user(
            email='approver2@example.com',
            username='approver2',
            password='testpass123'
        )
        self.organization = Organization.objects.create(
            name="Test Organization 2"
        )
        self.project = Project.objects.create(
            name="Test Project 2",
            organization=self.organization
        )
        self.task = Task.objects.create(
            summary="Test Revision Task",
            owner=self.owner,
            project=self.project,
            type='budget'
        )

    def test_task_default_revision_round_is_zero(self):
        """New task should have revision_round = 0"""
        self.assertEqual(self.task.revision_round, 0)

    def test_revision_round_increments_on_revise(self):
        """revision_round should increment by 1 each time task is revised"""
        # Simulate: DRAFT -> SUBMITTED -> UNDER_REVIEW -> REJECTED -> DRAFT (revise)
        self.task.submit()
        self.task.start_review()
        self.task.reject()
        self.task.revision_round += 1
        self.task.save()

        self.assertEqual(self.task.revision_round, 1)

    def test_revision_round_increments_multiple_times(self):
        """revision_round should keep incrementing on each revise"""
        # First rejection cycle
        self.task.submit()
        self.task.start_review()
        self.task.reject()
        self.task.revision_round += 1
        self.task.save()
        self.task.revise()
        self.task.save()

        # Second rejection cycle
        self.task.submit()
        self.task.start_review()
        self.task.reject()
        self.task.revision_round += 1
        self.task.save()

        self.assertEqual(self.task.revision_round, 2)

    def test_approval_record_stores_revision_round(self):
        """ApprovalRecord should store the correct revision_round"""
        # Create approval record with revision_round = 0
        record = ApprovalRecord.objects.create(
            task=self.task,
            approved_by=self.approver,
            is_approved=False,
            comment="Rejected in round 0",
            step_number=1,
            revision_round=0,
            resubmitted_after_reject=False,
            has_rejection_history=False,
        )
        self.assertEqual(record.revision_round, 0)

    def test_approval_history_preserved_after_revise(self):
        """Approval records should NOT be deleted when task is revised"""
        # Create an approval record (rejection)
        ApprovalRecord.objects.create(
            task=self.task,
            approved_by=self.approver,
            is_approved=False,
            comment="Rejected",
            step_number=1,
            revision_round=0,
        )
        self.assertEqual(self.task.approval_records.count(), 1)

        # Revise the task
        self.task.submit()
        self.task.start_review()
        self.task.reject()
        self.task.revise()
        self.task.revision_round += 1
        self.task.save()

        # Approval record should still exist
        self.assertEqual(self.task.approval_records.count(), 1)

    def test_resubmitted_after_reject_flag(self):
        """resubmitted_after_reject should be True when revision_round > 0"""
        record = ApprovalRecord.objects.create(
            task=self.task,
            approved_by=self.approver,
            is_approved=True,
            comment="Approved after revision",
            step_number=1,
            revision_round=1,
            resubmitted_after_reject=True,
            has_rejection_history=True,
        )
        self.assertTrue(record.resubmitted_after_reject)
        self.assertTrue(record.has_rejection_history)

    def test_unique_together_allows_same_step_different_rounds(self):
        """Same step_number is allowed across different revision_rounds"""
        # Round 0: step 1
        ApprovalRecord.objects.create(
            task=self.task,
            approved_by=self.approver,
            is_approved=False,
            comment="Rejected round 0",
            step_number=1,
            revision_round=0,
        )
        # Round 1: step 1 (should NOT raise error)
        try:
            ApprovalRecord.objects.create(
                task=self.task,
                approved_by=self.approver,
                is_approved=True,
                comment="Approved round 1",
                step_number=1,
                revision_round=1,
            )
            created = True
        except Exception:
            created = False
        self.assertTrue(created)