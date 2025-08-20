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
