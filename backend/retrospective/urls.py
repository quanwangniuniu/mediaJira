"""
URL patterns for retrospective engine
"""
from django.urls import path
from .views import (
    RetrospectiveTaskViewSet,
    InsightViewSet,
    RuleEngineViewSet
)

app_name = 'retrospective'

urlpatterns = [
    # Health check endpoint
    path('health/', lambda request: {'status': 'ok'}, name='health_check'),
    
    # RetrospectiveTask CRUD endpoints
    path('api/retrospectives/', RetrospectiveTaskViewSet.as_view({'get': 'list', 'post': 'create'}), name='retrospective-list'),
    path('api/retrospectives/<uuid:pk>/', RetrospectiveTaskViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='retrospective-detail'),
    
    # RetrospectiveTask action endpoints
    path('api/retrospectives/<uuid:pk>/start_analysis/', RetrospectiveTaskViewSet.as_view({'post': 'start_analysis'}), name='retrospective-start-analysis'),
    path('api/retrospectives/<uuid:pk>/generate_report/', RetrospectiveTaskViewSet.as_view({'post': 'generate_report'}), name='retrospective-generate-report'),
    path('api/retrospectives/<uuid:pk>/approve_report/', RetrospectiveTaskViewSet.as_view({'post': 'approve_report'}), name='retrospective-approve-report'),
    path('api/retrospectives/<uuid:pk>/summary/', RetrospectiveTaskViewSet.as_view({'get': 'summary'}), name='retrospective-summary'),
    path('api/retrospectives/my_retrospectives/', RetrospectiveTaskViewSet.as_view({'get': 'my_retrospectives'}), name='retrospective-my-retrospectives'),
    path('api/retrospectives/pending_approval/', RetrospectiveTaskViewSet.as_view({'get': 'pending_approval'}), name='retrospective-pending-approval'),
    
    # Insight CRUD endpoints
    path('api/insights/', InsightViewSet.as_view({'get': 'list', 'post': 'create'}), name='insight-list'),
    path('api/insights/<uuid:pk>/', InsightViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='insight-detail'),
    
    # Insight action endpoints
    path('api/insights/by_retrospective/', InsightViewSet.as_view({'get': 'by_retrospective'}), name='insight-by-retrospective'),
    path('api/insights/by_severity/', InsightViewSet.as_view({'get': 'by_severity'}), name='insight-by-severity'),
    path('api/insights/generate_insights/', InsightViewSet.as_view({'post': 'generate_insights'}), name='insight-generate-insights'),
    
    # Rule CRUD endpoints
    path('api/rules/rules/', RuleEngineViewSet.as_view({'get': 'rules'}), name='rule-rules'),
    path('api/rules/test_rule/', RuleEngineViewSet.as_view({'post': 'test_rule'}), name='rule-test-rule'),
    path('api/rules/rule_definition/', RuleEngineViewSet.as_view({'get': 'rule_definition'}), name='rule-rule-definition'),
] 