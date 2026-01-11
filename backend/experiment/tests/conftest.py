"""
Pytest configuration for experiment tests
Overrides cache settings to avoid django_redis dependency
"""
import os
import pytest
from django.conf import settings

# Disable OpenTelemetry in test environment
os.environ['OTEL_ENABLED'] = 'False'

# Override cache settings before Django setup
@pytest.fixture(scope='session', autouse=True)
def configure_test_cache():
    """Configure dummy cache for all tests"""
    settings.CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

