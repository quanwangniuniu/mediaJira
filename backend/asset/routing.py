from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/assets/(?P<asset_id>\d+)/$', consumers.AssetConsumer.as_asgi()),
] 