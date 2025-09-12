import os
import pytest
from decimal import Decimal

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Configure Django before any imports
import django
from django.conf import settings

if not settings.configured:
    django.setup()

# Now safe to import Django components
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from freezegun import freeze_time
from rest_framework.test import APIClient

# Import models after Django is configured
from core.models import Organization, Project, AdChannel, Team
# from task.models import Task
from access_control.models import Role, UserRole, RolePermission
from retrospective.models import (
    RetrospectiveTask, Insight, 
    RetrospectiveStatus, InsightSeverity
)

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
    import uuid
    unique_name = f"Test Organization {uuid.uuid4().hex[:8]}"
    return Organization.objects.create(
        name=unique_name,
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
    from django.apps import apps
    Task = apps.get_model('task', 'Task')
    return Task.objects.create(
        summary="Test Task",
        type="retrospective",
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
def role(organization):
    """Create a test role"""
    return Role.objects.create(
        name="Retrospective Manager",
        organization=organization,
        level=5
    )


@pytest.fixture
@pytest.mark.django_db
def permissions():
    """Create test permissions"""
    from core.models import Permission
    
    permissions = []
    # Create permissions for retrospective module
    permissions.append(Permission.objects.create(module='RETROSPECTIVE', action='VIEW'))
    permissions.append(Permission.objects.create(module='RETROSPECTIVE', action='EDIT'))
    permissions.append(Permission.objects.create(module='RETROSPECTIVE', action='CREATE'))
    permissions.append(Permission.objects.create(module='RETROSPECTIVE', action='DELETE'))
    
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
    import uuid
    unique_name = f"Different Organization {uuid.uuid4().hex[:8]}"
    return Organization.objects.create(
        name=unique_name,
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
    from django.apps import apps
    Task = apps.get_model('task', 'Task')
    return Task.objects.create(
        summary="Different Task",
        type="retrospective",
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
def retrospective_task_scheduled(user1, project):
    """Create a scheduled retrospective task"""
    return RetrospectiveTask.objects.create(
        campaign=project,
        created_by=user1,
        status=RetrospectiveStatus.SCHEDULED,
        scheduled_at=timezone.now()
    )


@pytest.fixture
@pytest.mark.django_db
def retrospective_task_in_progress(user1, project):
    """Create an in-progress retrospective task"""
    return RetrospectiveTask.objects.create(
        campaign=project,
        created_by=user1,
        status=RetrospectiveStatus.IN_PROGRESS,
        scheduled_at=timezone.now(),
        started_at=timezone.now()
    )


@pytest.fixture
@pytest.mark.django_db
def retrospective_task_completed(user1, project):
    """Create a completed retrospective task"""
    return RetrospectiveTask.objects.create(
        campaign=project,
        created_by=user1,
        status=RetrospectiveStatus.COMPLETED,
        scheduled_at=timezone.now(),
        started_at=timezone.now(),
        completed_at=timezone.now()
    )


@pytest.fixture
@pytest.mark.django_db
def insight_high_severity(user1, retrospective_task_in_progress):
    """Create a high severity insight"""
    return Insight.objects.create(
        retrospective_task=retrospective_task_in_progress,
        title="High Severity Insight",
        description="This is a high severity insight",
        severity=InsightSeverity.HIGH,
        created_by=user1
    )


@pytest.fixture
@pytest.mark.django_db
def insight_critical_severity(user1, retrospective_task_in_progress):
    """Create a critical severity insight"""
    return Insight.objects.create(
        retrospective_task=retrospective_task_in_progress,
        title="Critical Severity Insight",
        description="This is a critical severity insight",
        severity=InsightSeverity.CRITICAL,
        created_by=user1
    )


@pytest.fixture
@pytest.mark.django_db
def insight_medium_severity(user1, retrospective_task_in_progress):
    """Create a medium severity insight"""
    return Insight.objects.create(
        retrospective_task=retrospective_task_in_progress,
        title="Medium Severity Insight",
        description="This is a medium severity insight",
        severity=InsightSeverity.MEDIUM,
        created_by=user1
    )


@pytest.fixture
@pytest.mark.django_db
def insight_low_severity(user1, retrospective_task_in_progress):
    """Create a low severity insight"""
    return Insight.objects.create(
        retrospective_task=retrospective_task_in_progress,
        title="Low Severity Insight",
        description="This is a low severity insight",
        severity=InsightSeverity.LOW,
        created_by=user1
    )


@pytest.fixture
@freeze_time("2024-01-01 10:00:00")
def frozen_time():
    """Freeze time for consistent testing"""
    return "2024-01-01 10:00:00"
