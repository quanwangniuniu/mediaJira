"""
URL patterns for retrospective engine
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .views import (
    RetrospectiveTaskViewSet,
    InsightViewSet,
    RuleEngineViewSet,
    CampaignMetricViewSet
)

app_name = 'retrospective'

# Create DRF router for ViewSets
router = DefaultRouter()
router.register(r'retrospectives', RetrospectiveTaskViewSet, basename='retrospective')
router.register(r'insights', InsightViewSet, basename='insight')
router.register(r'rules', RuleEngineViewSet, basename='rule')
router.register(r'campaign-metrics', CampaignMetricViewSet, basename='campaign-metric')

@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok'})

urlpatterns = [
    # Health check endpoint
    path('health/', health_check, name='health_check'),
    
    # Include router URLs - automatically handles all ViewSet routes and actions
    path('', include(router.urls)),
]