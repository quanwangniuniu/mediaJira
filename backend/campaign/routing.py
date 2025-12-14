from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/campaigns/(?P<id>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/$', 
            consumers.CampaignConsumer.as_asgi()),
]

