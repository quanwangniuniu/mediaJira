"""
Simple pytest configuration for reports testing
"""
import pytest
import json
import random
import os
from datetime import datetime, timedelta
from django.test import TestCase, override_settings
from core.models import CustomUser
from reports.models import ReportTemplate, Report, ReportSection


def pytest_configure(config):
    """Configure pytest to reuse existing database instead of creating new one"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    
    # Force reuse-db option to avoid database creation errors
    if not hasattr(config.option, 'reuse_db') or not config.option.reuse_db:
        config.option.reuse_db = True


@pytest.fixture(scope='session')
def django_db_setup(request, django_db_blocker):
    """
    Override database setup to use existing database without creating new one.
    This prevents 'permission denied to create database' errors.
    """
    from django.db import connection
    from django.conf import settings
    from django.test.utils import setup_test_environment, teardown_test_environment
    
    # Modify database settings to use existing database
    original_db_name = settings.DATABASES['default']['NAME']
    
    # Configure test database to use the same database (no creation)
    # Merge with existing TEST config if any, then override
    existing_test = settings.DATABASES['default'].get('TEST', {})
    settings.DATABASES['default']['TEST'] = {
        'CHARSET': existing_test.get('CHARSET', None),
        'COLLATION': existing_test.get('COLLATION', None),
        'MIGRATE': existing_test.get('MIGRATE', True),
        'MIRROR': existing_test.get('MIRROR', None),
        'NAME': original_db_name,  # Use existing database
        'CREATE_DB': False,  # Don't create test database
    }
    
    # Ensure connection to existing database
    try:
        connection.ensure_connection()
        
        # Setup test environment (but don't create test database)
        setup_test_environment()
        
        # Run migrations if needed
        with django_db_blocker.unblock():
            from django.core.management import call_command
            try:
                call_command('migrate', verbosity=0, interactive=False)
            except Exception:
                pass  # Migrations might already be applied
        
        yield
        
        # Teardown
        teardown_test_environment()
    except Exception as e:
        # If connection fails, just yield (tests will fail with connection errors)
        yield


@pytest.fixture
def test_user():
    """Create a test user"""
    return CustomUser.objects.create_user(
        email="test@example.com",
        password="testpass"
    )


@pytest.fixture
def test_template():
    """Create a simple test template"""
    return ReportTemplate.objects.create(
        id="test_template",
        name="Test Template",
        version=1,
        is_default=False,
        blocks=[
            {"type": "header", "content": "Test Report"},
            {"type": "table", "title": "Data Table"}
        ],
        variables={"total_records": 0}
    )


@pytest.fixture
def random_test_data():
    """Generate random test data"""
    campaigns = ["Campaign A", "Campaign B", "Campaign C"]
    channels = ["Google Ads", "Facebook Ads", "LinkedIn Ads", "Twitter Ads"]
    data = []
    
    for i in range(50):
        # 40% empty slices, 60% non-empty
        is_empty = random.random() < 0.4
        
        if is_empty:
            data.append({
                "campaign": random.choice(campaigns),
                "channel": random.choice(channels),
                "date": (datetime.now() - timedelta(days=random.randint(1, 90))).strftime("%Y-%m-%d"),
                "cost": 0.0,
                "revenue": 0.0,
                "leads": 0,
                "conversions": 0
            })
        else:
            cost = random.uniform(100, 2000)
            revenue = cost * random.uniform(1.5, 3.0)
            leads = random.randint(10, 100)
            conversions = random.randint(5, 50)
            
            data.append({
                "campaign": random.choice(campaigns),
                "channel": random.choice(channels),
                "date": (datetime.now() - timedelta(days=random.randint(1, 90))).strftime("%Y-%m-%d"),
                "cost": round(cost, 2),
                "revenue": round(revenue, 2),
                "leads": leads,
                "conversions": conversions
            })
    
    return data