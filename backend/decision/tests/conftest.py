import os

import django
from django.conf import settings


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

if not settings.configured:
    django.setup()
