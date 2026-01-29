"""
Authentication Tests Configuration (pytest only)

IMPORTANT: This configuration file is ONLY used by pytest, NOT by Django's 
'manage.py test' runner. 

If you're running tests with 'python manage.py test', the fixtures and environment
variables defined here will NOT be loaded. Instead, those tests should use Django's
@override_settings decorator directly on test classes or methods.

For pytest tests (run with 'pytest' command):
- This file provides fixtures and sets up the test environment
- Environment variables are set before Django initialization
- All fixtures defined here are available to pytest-style tests

For Django unittest tests (run with 'python manage.py test'):
- Use @override_settings decorator on test classes/methods
- See test_google_oauth.py and test_sso.py for examples
"""
import pytest
import os
from django.conf import settings

# Set Google OAuth test settings before Django setup
# NOTE: These only apply when running tests with pytest, not 'manage.py test'
os.environ.setdefault('GOOGLE_CLIENT_ID', 'test-client-id-12345')
os.environ.setdefault('GOOGLE_CLIENT_SECRET', 'test-client-secret-67890')
os.environ.setdefault('GOOGLE_OAUTH_REDIRECT_URI', 'http://localhost:8000/auth/google/callback/')
os.environ.setdefault('FRONTEND_URL', 'http://localhost:3000')

# Ensure Django is set up
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from core.models import Organization, Role

User = get_user_model()


@pytest.fixture
def api_client():
    """Provide an API client for tests"""
    return APIClient()


@pytest.fixture
def test_organization(db):
    """Create a test organization"""
    return Organization.objects.create(
        name="Test Organization",
        email_domain="testorg.com"
    )


@pytest.fixture
def test_user(db, test_organization):
    """Create a test user"""
    user = User.objects.create_user(
        username="testuser",
        email="testuser@testorg.com",
        password="TestPassword123!",
        organization=test_organization,
        is_verified=True,
        is_active=True
    )
    return user


@pytest.fixture
def authenticated_client(api_client, test_user):
    """Provide an authenticated API client"""
    api_client.force_authenticate(user=test_user)
    return api_client


@pytest.fixture
def test_role(db, test_organization):
    """Create a test role"""
    return Role.objects.create(
        organization=test_organization,
        name="Test Role",
        level=30
    )
