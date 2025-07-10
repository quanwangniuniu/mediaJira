from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'campaigns', views.CampaignViewSet, basename='campaign')
router.register(r'assignments', views.CampaignAssignmentViewSet, basename='assignment')
router.register(r'metrics', views.CampaignMetricViewSet, basename='metric')
router.register(r'notes', views.CampaignNoteViewSet, basename='note')

app_name = 'campaigns'

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # OpenAPI Documentation
    path('openapi/', views.OpenAPIDocumentationView.as_view(), name='openapi-docs'),
    
    # HTML API Documentation Page
    path('docs/', views.APIDocumentationPageView.as_view(), name='api-docs-page'),
    
    # Additional custom endpoints can be added here
    # Example: path('campaigns/<uuid:pk>/export/', views.export_campaign, name='export_campaign'),
] 