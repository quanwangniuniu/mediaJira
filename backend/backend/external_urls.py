"""
Routes of the external API, kept apart from the internal API in urls.py.

- /api/v1/...            called by external systems with an API key or OAuth 2.0 token
- /api/external-api/...  the admin console that manages credentials and webhooks
"""

from django.urls import include, path

urlpatterns = [
    path('api/v1/', include('external_api.urls')),
    path('api/external-api/', include('external_api.urls_admin')),
]
