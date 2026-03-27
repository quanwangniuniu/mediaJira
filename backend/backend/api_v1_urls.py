"""
Merge URL patterns under ``api/v1/``.

Django only applies the *first* matching ``path('api/v1/', include(...))``; a second
include for the same prefix is never reached. Concatenate app urlpatterns so both
calendars and meetings routes work.
"""

from calendars.urls import urlpatterns as _calendar_urlpatterns
from meetings.urls import urlpatterns as _meetings_urlpatterns

urlpatterns = list(_calendar_urlpatterns) + list(_meetings_urlpatterns)
