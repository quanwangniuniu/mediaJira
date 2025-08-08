from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta
from asset.models import Task, Asset, ReviewAssignment
from core.models import Organization, Team

User = get_user_model()


class ReviewAssignmentModelTest(TestCase):
    """Test cases for ReviewAssignment model"""
    
    def setUp(self):
        # Create test users
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            username='user2',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_review_assignment_creation(self):
        """Test basic review assignment creation"""
        assignment = ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1
        )
        
        self.assertEqual(assignment.asset, self.asset)
        self.assertEqual(assignment.user, self.user2)
        self.assertEqual(assignment.role, 'reviewer')
        self.assertEqual(assignment.assigned_by, self.user1)
        self.assertIsNotNone(assignment.assigned_at)
        self.assertIsNone(assignment.valid_until)
    
    def test_review_assignment_string_representation(self):
        """Test review assignment string representation"""
        assignment = ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1
        )
        expected = f"Reviewer assignment for Asset {self.asset.id} - {self.user2.username}"
        self.assertEqual(str(assignment), expected)
    
    def test_review_assignment_table_name(self):
        """Test review assignment table name"""
        assignment = ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1
        )
        self.assertEqual(assignment._meta.db_table, 'review_assignments')
    
    def test_review_assignment_unique_constraint(self):
        """Test unique constraint on asset_id, user_id, and role"""
        ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1
        )
        
        # Should raise IntegrityError for duplicate assignment
        with self.assertRaises(IntegrityError):
            ReviewAssignment.objects.create(
                asset=self.asset,
                user=self.user2,
                role='reviewer',
                assigned_by=self.user1
            )
    
    def test_review_assignment_role_choices(self):
        """Test role choices validation"""
        # Valid roles
        reviewer_assignment = ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1
        )
        self.assertEqual(reviewer_assignment.role, 'reviewer')
        
        approver_assignment = ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='approver',
            assigned_by=self.user1
        )
        self.assertEqual(approver_assignment.role, 'approver')
    
    def test_review_assignment_with_expiry(self):
        """Test review assignment with expiry date"""
        expiry_date = timezone.now() + timedelta(days=7)
        assignment = ReviewAssignment.objects.create(
            asset=self.asset,
            user=self.user2,
            role='reviewer',
            assigned_by=self.user1,
            valid_until=expiry_date
        )
        
        self.assertEqual(assignment.valid_until, expiry_date) 