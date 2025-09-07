from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/retrospective/(?P<retrospective_id>\d+)/$', consumers.RetrospectiveConsumer.as_asgi()),
]
