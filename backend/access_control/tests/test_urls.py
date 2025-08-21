from django.urls import path
from django.http import HttpResponse

def dummy_view(request, *args, **kwargs):
    return HttpResponse("OK")

# Temporary URL patterns for routing during tests
urlpatterns = [
    path('api/assets/list/',               dummy_view, name='asset-list'),
    path('api/assets/<int:pk>/export/',    dummy_view, name='asset-export'),
    path('api/assets/<int:pk>/delete/',    dummy_view, name='asset-delete'),
    path('api/campaigns/create/',          dummy_view, name='campaign-create'),
    path('api/campaigns/<int:pk>/approve/',dummy_view, name='campaign-approve'),
    path('api/campaigns/<int:pk>/edit/',   dummy_view, name='campaign-edit'),
]