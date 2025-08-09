"""
URL patterns for retrospective engine
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RetrospectiveTaskViewSet,
    InsightViewSet,
    RuleEngineViewSet
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'retrospectives', RetrospectiveTaskViewSet, basename='retrospective')
router.register(r'insights', InsightViewSet, basename='insight')
router.register(r'rules', RuleEngineViewSet, basename='rule')

app_name = 'retrospective'

urlpatterns = [
    # API endpoints
    path('api/', include(router.urls)),
    
    # Health check endpoint
    path('health/', lambda request: {'status': 'ok'}, name='health_check'),
] 