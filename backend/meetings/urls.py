from django.urls import include, path
from rest_framework.routers import DefaultRouter

from meetings.views import (
    MeetingViewSet,
    AgendaItemViewSet,
    ParticipantLinkViewSet,
    ArtifactLinkViewSet,
    ActionItemViewSet,
    MeetingDocumentAPIView,
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
router.register(
    r"projects/(?P<project_id>\d+)/meetings/(?P<meeting_id>\d+)/action-items",
    ActionItemViewSet,
    basename="project-meeting-action-items",
)


urlpatterns = [
    path(
        "projects/<int:project_id>/meetings/<int:meeting_id>/document/",
        MeetingDocumentAPIView.as_view(),
    ),
    path("", include(router.urls)),
]

