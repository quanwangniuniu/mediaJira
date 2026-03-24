from django.urls import include, path
from rest_framework.routers import DefaultRouter

from meetings.views import (
    MeetingViewSet,
    AgendaItemViewSet,
    ParticipantLinkViewSet,
    ArtifactLinkViewSet,
)


router = DefaultRouter()
router.register(
    r"projects/(?P<project_id>\d+)/meetings",
    MeetingViewSet,
    basename="project-meetings",
)
router.register(
    r"projects/(?P<project_id>\d+)/meetings/(?P<meeting_id>\d+)/agenda-items",
    AgendaItemViewSet,
    basename="project-meeting-agenda-items",
)
router.register(
    r"projects/(?P<project_id>\d+)/meetings/(?P<meeting_id>\d+)/participants",
    ParticipantLinkViewSet,
    basename="project-meeting-participants",
)
router.register(
    r"projects/(?P<project_id>\d+)/meetings/(?P<meeting_id>\d+)/artifacts",
    ArtifactLinkViewSet,
    basename="project-meeting-artifacts",
)


urlpatterns = [
    path("", include(router.urls)),
]

