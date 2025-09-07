from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/campaigns/(?P<campaign_id>\w+)/$', consumers.CampaignExecutionConsumer.as_asgi()),
    re_path(r'ws/campaigns/$', consumers.CampaignListConsumer.as_asgi()),
]
