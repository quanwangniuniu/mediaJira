from django.urls import re_path

from meetings.consumers import MeetingDocumentConsumer

websocket_urlpatterns = [
    re_path(
        r"ws/meetings/(?P<meeting_id>\d+)/document/$",
        MeetingDocumentConsumer.as_asgi(),
    ),
]
