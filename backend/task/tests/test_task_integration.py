from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from task.models import Task, ApprovalRecord
from core.models import Project, Organization, Team, AdChannel
from budget_approval.models import BudgetRequest, BudgetPool
from asset.models import Asset
from retrospective.models import RetrospectiveTask

User = get_user_model()


class TaskBudgetIntegrationTest(TestCase):
    """Test Task integration with BudgetRequest"""
    
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
        
        # Create test ad channel and budget pool
        self.ad_channel = AdChannel.objects.create(
            name="Test Channel",
            project=self.project
        )
        self.budget_pool = BudgetPool.objects.create(
            project=self.project,
            ad_channel=self.ad_channel,
            total_amount=10000.00,
            currency="AUD"
        )
        
        # Create test task
        self.task = Task.objects.create(
            summary="Budget Request Task",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        
        # Create test budget request
        self.budget_request = BudgetRequest.objects.create(
            task=self.task,
            requested_by=self.owner,
            amount=1000.00,
            currency="AUD",
            budget_pool=self.budget_pool,
            current_approver=self.approver,
            ad_channel=self.ad_channel
        )
    
    def test_task_budget_linking(self):
        """Test linking task to budget request"""
        # Link task to budget request
        self.task.link_to_object(self.budget_request)
        
        # Verify linking
        self.assertTrue(self.task.is_linked)
        self.assertEqual(self.task.content_type, ContentType.objects.get_for_model(BudgetRequest))
        self.assertEqual(str(self.task.object_id), str(self.budget_request.id))
        self.assertEqual(self.task.task_type, 'budgetrequest')
        self.assertEqual(self.task.linked_status, self.budget_request.status)
    

class TaskAssetIntegrationTest(TestCase):
    """Test Task integration with Asset"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.owner = User.objects.create_user(
            email='owner@example.com',
            username='owner',
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
        
        # Create test team
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test task
        self.task = Task.objects.create(
            summary="Asset Review Task",
            owner=self.owner,
            project=self.project,
            type='asset'
        )
        
        # Create test asset (without linking to task initially)
        self.asset = Asset.objects.create(
            owner=self.owner,
            team=self.team
        )
    
    def test_task_asset_linking(self):
        """Test linking task to asset"""
        # Link task to asset
        self.task.link_to_object(self.asset)
        
        # Verify linking
        self.assertTrue(self.task.is_linked)
        self.assertEqual(self.task.content_type, ContentType.objects.get_for_model(Asset))
        self.assertEqual(str(self.task.object_id), str(self.asset.id))
        self.assertEqual(self.task.task_type, 'asset')
        self.assertEqual(self.task.linked_status, self.asset.status)


class TaskRetrospectiveIntegrationTest(TestCase):
    """Test Task integration with RetrospectiveTask"""
    
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.owner = User.objects.create_user(
            email='owner@example.com',
            username='owner',
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
            summary="Retrospective Task",
            owner=self.owner,
            project=self.project,
            type='retrospective'
        )
        
        # Create test retrospective task
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.project,
            created_by=self.owner
        )
    
    def test_task_retrospective_linking(self):
        """Test linking task to retrospective task"""
        # Link task to retrospective task
        self.task.link_to_object(self.retrospective)
        
        # Verify linking
        self.assertTrue(self.task.is_linked)
        self.assertEqual(self.task.content_type, ContentType.objects.get_for_model(RetrospectiveTask))
        self.assertEqual(str(self.task.object_id), str(self.retrospective.id))
        self.assertEqual(self.task.task_type, 'retrospectivetask')
        self.assertEqual(self.task.linked_status, self.retrospective.status)
    

class TaskCrossDomainWorkflowTest(TestCase):
    """Test cross-domain workflow scenarios"""
    
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
        
        # Create test ad channel and budget pool
        self.ad_channel = AdChannel.objects.create(
            name="Test Channel",
            project=self.project
        )
        self.budget_pool = BudgetPool.objects.create(
            project=self.project,
            ad_channel=self.ad_channel,
            total_amount=10000.00,
            currency="AUD"
        )
        
        # Create test team
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
    
    def test_budget_workflow_with_task(self):
        """Test complete budget workflow with task integration"""
        # Create task
        task = Task.objects.create(
            summary="Budget Request Task",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        
        # Create budget request
        budget_request = BudgetRequest.objects.create(
            task=task,
            requested_by=self.owner,
            amount=1000.00,
            currency="AUD",
            budget_pool=self.budget_pool,
            current_approver=self.approver,
            ad_channel=self.ad_channel
        )
        
        # Link task to budget request
        task.link_to_object(budget_request)
        
        # Test workflow: Task DRAFT -> SUBMITTED
        self.assertEqual(task.status, Task.Status.DRAFT)
        task.submit()
        self.assertEqual(task.status, Task.Status.SUBMITTED)
        
        # Test workflow: Task SUBMITTED -> UNDER_REVIEW
        task.start_review()
        self.assertEqual(task.status, Task.Status.UNDER_REVIEW)
        
        # Test workflow: Task UNDER_REVIEW -> APPROVED
        task.approve()
        self.assertEqual(task.status, Task.Status.APPROVED)
        
        # Verify linked object status is synchronized
        # Note: We can't refresh budget_request due to FSM protection
        # Instead, we'll check the task's linked_status directly
        self.assertEqual(task.linked_status, budget_request.status)
    
    def test_asset_workflow_with_task(self):
        """Test complete asset workflow with task integration"""
        # Create task
        task = Task.objects.create(
            summary="Asset Review Task",
            owner=self.owner,
            project=self.project,
            type='asset'
        )
        
        # Create asset
        asset = Asset.objects.create(
            owner=self.owner,
            team=self.team
        )
        
        # Link task to asset
        task.link_to_object(asset)
        
        # Test workflow: Task DRAFT -> SUBMITTED
        self.assertEqual(task.status, Task.Status.DRAFT)
        task.submit()
        self.assertEqual(task.status, Task.Status.SUBMITTED)
        
        # Test workflow: Task SUBMITTED -> UNDER_REVIEW
        task.start_review()
        self.assertEqual(task.status, Task.Status.UNDER_REVIEW)
        
        # Test workflow: Task UNDER_REVIEW -> APPROVED
        task.approve()
        self.assertEqual(task.status, Task.Status.APPROVED)
        
        # Verify linked object status is synchronized
        asset.refresh_from_db()
        self.assertEqual(task.linked_status, asset.status)
    
    def test_multiple_tasks_same_project(self):
        """Test multiple tasks of different types in same project"""
        # Create budget task
        budget_task = Task.objects.create(
            summary="Budget Task",
            owner=self.owner,
            project=self.project,
            type='budget'
        )
        
        # Create asset task
        asset_task = Task.objects.create(
            summary="Asset Task",
            owner=self.owner,
            project=self.project,
            type='asset'
        )
        
        # Create retrospective task
        retrospective_task = Task.objects.create(
            summary="Retrospective Task",
            owner=self.owner,
            project=self.project,
            type='retrospective'
        )
        
        # Verify all tasks belong to same project
        self.assertEqual(budget_task.project, self.project)
        self.assertEqual(asset_task.project, self.project)
        self.assertEqual(retrospective_task.project, self.project)
        
        # Verify different types
        self.assertEqual(budget_task.type, 'budget')
        self.assertEqual(asset_task.type, 'asset')
        self.assertEqual(retrospective_task.type, 'retrospective')
        
        # Verify all start in DRAFT state
        self.assertEqual(budget_task.status, Task.Status.DRAFT)
        self.assertEqual(asset_task.status, Task.Status.DRAFT)
        self.assertEqual(retrospective_task.status, Task.Status.DRAFT)
