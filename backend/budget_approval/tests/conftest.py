import os
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import Client
from freezegun import freeze_time
from django.utils import timezone

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Delay imports until Django is configured
import django
from django.conf import settings

if not settings.configured:
    django.setup()

from rest_framework.test import APIClient
from core.models import Organization, Project, AdChannel, Team
from task.models import Task
from access_control.models import Role, UserRole, RolePermission
from budget_approval.models import BudgetPool, BudgetRequest, BudgetEscalationRule, BudgetRequestStatus

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for testing"""
    return APIClient()


@pytest.fixture
def django_client():
    """Django test client"""
    return Client()


@pytest.fixture
@pytest.mark.django_db
def organization():
    """Create a test organization"""
    return Organization.objects.create(
        name="Test Organization",
        email_domain="test.com"
    )


@pytest.fixture
@pytest.mark.django_db
def team(organization):
    """Create a test team"""
    return Team.objects.create(
        name="Test Team",
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def project(organization):
    """Create a test project"""
    return Project.objects.create(
        name="Test Project",
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def task(project):
    """Create a test task"""
    return Task.objects.create(
        summary="Test Task",
        type="budget",
        project=project
    )


@pytest.fixture
@pytest.mark.django_db
def ad_channel(project):
    """Create a test ad channel"""
    return AdChannel.objects.create(
        name="Test Ad Channel",
        project=project
    )


@pytest.fixture
@pytest.mark.django_db
def budget_pool(project, ad_channel):
    """Create a test budget pool"""
    return BudgetPool.objects.create(
        project=project,
        ad_channel=ad_channel,
        total_amount=Decimal('10000.00'),
        used_amount=Decimal('0.00'),
        currency='AUD'
    )


@pytest.fixture
@pytest.mark.django_db
def role(organization):
    """Create a test role"""
    return Role.objects.create(
        name="Budget Approver",
        organization=organization,
        level=5
    )


@pytest.fixture
@pytest.mark.django_db
def permissions():
    """Create test permissions"""
    from core.models import Permission
    
    permissions = []
    # Create permissions for budget request module
    permissions.append(Permission.objects.get_or_create(module='BUDGET_REQUEST', action='VIEW')[0])
    permissions.append(Permission.objects.get_or_create(module='BUDGET_REQUEST', action='EDIT')[0])
    permissions.append(Permission.objects.get_or_create(module='BUDGET_REQUEST', action='APPROVE')[0])
    
    # Create permissions for budget pool module
    permissions.append(Permission.objects.get_or_create(module='BUDGET_POOL', action='VIEW')[0])
    permissions.append(Permission.objects.get_or_create(module='BUDGET_POOL', action='EDIT')[0])
    
    # Create permissions for budget escalation module
    permissions.append(Permission.objects.get_or_create(module='BUDGET_ESCALATION', action='VIEW')[0])
    permissions.append(Permission.objects.get_or_create(module='BUDGET_ESCALATION', action='EDIT')[0])
    
    return permissions


@pytest.fixture
@pytest.mark.django_db
def role_permissions(role, permissions):
    """Create role permissions"""
    role_permissions = []
    for permission in permissions:
        role_permissions.append(RolePermission.objects.create(
            role=role,
            permission=permission
        ))
    return role_permissions


@pytest.fixture
@pytest.mark.django_db
def user1(organization):
    """Create test user 1"""
    return User.objects.create_user(
        username='user1',
        email='user1@test.com',
        password='testpass123',
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def user2(organization):
    """Create test user 2"""
    return User.objects.create_user(
        username='user2',
        email='user2@test.com',
        password='testpass123',
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def user3(organization):
    """Create test user 3"""
    return User.objects.create_user(
        username='user3',
        email='user3@test.com',
        password='testpass123',
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def superuser():
    """Create a superuser for testing"""
    return User.objects.create_superuser(
        username='superuser',
        email='superuser@test.com',
        password='testpass123'
    )


@pytest.fixture
@pytest.mark.django_db
def different_organization():
    """Create a different organization for cross-org testing"""
    return Organization.objects.create(
        name="Different Organization",
        email_domain="different.com"
    )


@pytest.fixture
@pytest.mark.django_db
def different_project(different_organization):
    """Create a project in different organization"""
    return Project.objects.create(
        name="Different Project",
        organization=different_organization
    )


@pytest.fixture
@pytest.mark.django_db
def different_task(different_project):
    """Create a task in different organization"""
    return Task.objects.create(
        summary="Different Task",
        type="budget",
        project=different_project
    )


@pytest.fixture
@pytest.mark.django_db
def different_ad_channel(different_project):
    """Create an ad channel in different organization"""
    return AdChannel.objects.create(
        name="Different Ad Channel",
        project=different_project
    )


@pytest.fixture
@pytest.mark.django_db
def different_budget_pool(different_project, different_ad_channel):
    """Create a budget pool in different organization"""
    return BudgetPool.objects.create(
        project=different_project,
        ad_channel=different_ad_channel,
        total_amount=Decimal('5000.00'),
        used_amount=Decimal('0.00'),
        currency='AUD'
    )


@pytest.fixture
@pytest.mark.django_db
def budget_request_different_org(user1, different_task, different_budget_pool, user2, different_ad_channel):
    """Create a budget request in different organization"""
    return BudgetRequest.objects.create(
        task=different_task,
        requested_by=user1,
        amount=Decimal('500.00'),
        currency='AUD',
        status=BudgetRequestStatus.DRAFT,
        budget_pool=different_budget_pool,
        current_approver=user2,
        ad_channel=different_ad_channel,
        notes="Test budget request in different org"
    )


@pytest.fixture
@pytest.mark.django_db
def user_role1(user1, role, team):
    """Create user role for user1"""
    return UserRole.objects.create(
        user=user1,
        role=role,
        team=team,
        valid_from=timezone.now()
    )


@pytest.fixture
@pytest.mark.django_db
def user_role2(user2, role, team):
    """Create user role for user2"""
    return UserRole.objects.create(
        user=user2,
        role=role,
        team=team,
        valid_from=timezone.now()
    )


@pytest.fixture
@pytest.mark.django_db
def user_role3(user3, role, team):
    """Create user role for user3"""
    return UserRole.objects.create(
        user=user3,
        role=role,
        team=team,
        valid_from=timezone.now()
    )


@pytest.fixture
@pytest.mark.django_db
def escalation_rule(budget_pool, role):
    """Create a test escalation rule"""
    return BudgetEscalationRule.objects.create(
        budget_pool=budget_pool,
        threshold_amount=Decimal('5000.00'),
        threshold_currency='AUD',
        escalate_to_role=role,
        is_active=True
    )


@pytest.fixture
@pytest.mark.django_db
def budget_request_draft(user1, task, budget_pool, user2, ad_channel):
    """Create a draft budget request"""
    return BudgetRequest.objects.create(
        task=task,
        requested_by=user1,
        amount=Decimal('1000.00'),
        currency='AUD',
        status=BudgetRequestStatus.DRAFT,
        budget_pool=budget_pool,
        current_approver=user2,
        ad_channel=ad_channel,
        notes="Test budget request"
    )


@pytest.fixture
@pytest.mark.django_db
def budget_request_submitted(user1, task, budget_pool, user2, ad_channel):
    """Create a submitted budget request"""
    return BudgetRequest.objects.create(
        task=task,
        requested_by=user1,
        amount=Decimal('1000.00'),
        currency='AUD',
        status=BudgetRequestStatus.SUBMITTED,
        budget_pool=budget_pool,
        current_approver=user2,
        ad_channel=ad_channel,
        notes="Test budget request"
    )


@pytest.fixture
@pytest.mark.django_db
def budget_request_under_review(user1, task, budget_pool, user2, ad_channel):
    """Create a budget request under review"""
    return BudgetRequest.objects.create(
        task=task,
        requested_by=user1,
        amount=Decimal('1000.00'),
        currency='AUD',
        status=BudgetRequestStatus.UNDER_REVIEW,
        budget_pool=budget_pool,
        current_approver=user2,
        ad_channel=ad_channel,
        notes="Test budget request"
    )


@pytest.fixture
@freeze_time("2024-01-01 10:00:00")
def frozen_time():
    """Freeze time for consistent testing"""
    return "2024-01-01 10:00:00" 
