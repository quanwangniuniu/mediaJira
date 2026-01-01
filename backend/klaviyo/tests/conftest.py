"""
Pytest fixtures for klaviyo tests
"""
import os
import pytest

# Disable OpenTelemetry in test environment to avoid connection errors
# This must be set before importing Django settings
os.environ['OTEL_ENABLED'] = 'False'

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Delay imports until Django is configured
import django
from django.conf import settings

if not settings.configured:
    django.setup()

# Disable test database serialization to avoid errors with missing tables
# This prevents Django from trying to serialize data before migrations run
if 'default' in settings.DATABASES:
    test_config = settings.DATABASES['default'].get('TEST', {})
    test_config['SERIALIZE'] = False
    settings.DATABASES['default']['TEST'] = test_config


def pytest_configure(config):
    """Configure pytest to disable test database serialization"""
    # Ensure Django settings are configured
    if not settings.configured:
        django.setup()
    
    # Disable test database serialization
    if 'default' in settings.DATABASES:
        test_config = settings.DATABASES['default'].get('TEST', {})
        test_config['SERIALIZE'] = False
        settings.DATABASES['default']['TEST'] = test_config


from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture(scope='session', autouse=True)
def django_db_setup_ensure_migrations(django_db_setup, django_db_blocker):
    """
    Ensure all required app migrations are applied.
    This fixture runs automatically before any tests to ensure database is ready.
    """
    with django_db_blocker.unblock():
        try:
            from django.core.management import call_command
            # Run migrations for all apps to ensure database schema is complete
            call_command('migrate', verbosity=0, interactive=False)
        except Exception:
            # If migration fails, continue - it might already be applied
            pass

