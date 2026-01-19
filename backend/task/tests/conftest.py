"""
Shared fixtures for task app tests.
"""
import os
import pytest

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Delay imports until Django is configured
import django
from django.conf import settings

if not settings.configured:
    django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from core.models import Organization, Project, ProjectMember

User = get_user_model()


@pytest.fixture
def api_client():
    """API client for testing"""
    return APIClient()


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
def user(organization):
    """Create a test user"""
    return User.objects.create_user(
        username='testuser',
        email='testuser@test.com',
        password='testpass123',
        organization=organization
    )


@pytest.fixture
@pytest.mark.django_db
def project(organization, user):
    """Create a test project with owner"""
    project = Project.objects.create(
        name="Test Project",
        organization=organization,
        owner=user,
        objectives=["awareness"],
        kpis={"ctr": {"target": 0.02}}
    )
    # Create membership
    ProjectMember.objects.create(
        user=user,
        project=project,
        role='Team Leader',
        is_active=True
    )
    return project


@pytest.fixture
@pytest.mark.django_db
def project2(organization, user):
    """Create a second test project"""
    project = Project.objects.create(
        name="Test Project 2",
        organization=organization,
        owner=user,
        objectives=["conversion"],
        kpis={"roas": {"target": 3.0}}
    )
    # Create membership
    ProjectMember.objects.create(
        user=user,
        project=project,
        role='Team Leader',
        is_active=True
    )
    return project


@pytest.fixture
@pytest.mark.django_db
def authenticated_client(api_client, user):
    """API client authenticated as user"""
    api_client.force_authenticate(user=user)
    return api_client

