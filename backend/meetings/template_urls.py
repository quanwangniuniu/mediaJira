from django.urls import include, path
from rest_framework.routers import DefaultRouter

from meetings.views import MeetingTemplateViewSet

# trailing_slash=True (DefaultRouter default) matches /api/meetings/templates/ with APPEND_SLASH.
router = DefaultRouter(trailing_slash=True)
router.register(r"templates", MeetingTemplateViewSet, basename="meeting-templates")

urlpatterns = [
    path("", include(router.urls)),
]

