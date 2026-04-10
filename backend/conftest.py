"""
Ensure Django settings are available before test modules import DRF (e.g. APIClient).
See pytest-django: DJANGO_SETTINGS_MODULE / --ds must apply before collection imports.
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
