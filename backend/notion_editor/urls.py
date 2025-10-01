from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import admin

app_name = 'notion_editor'

# Create a router for API views
router = DefaultRouter()
router.register(r'drafts', views.DraftViewSet)
router.register(r'blocks', views.ContentBlockViewSet)
router.register(r'actions', views.BlockActionViewSet)

urlpatterns = [
    # API endpoints
    path('api/', include(router.urls)),
    
    # Additional API endpoints
    path('api/drafts/<int:draft_id>/blocks/', views.DraftBlocksView.as_view(), name='draft-blocks'),
    path('api/drafts/<int:draft_id>/export/', views.ExportDraftView.as_view(), name='export-draft'),
    path('api/drafts/<int:draft_id>/duplicate/', views.DuplicateDraftView.as_view(), name='duplicate-draft'),
    
    # Custom Admin API endpoints (Backend only - no templates required)
    path('ops/drafts/', admin.draft_list_api, name='ops_draft_list'),
    path('ops/drafts/<int:pk>/', admin.draft_detail_api, name='ops_draft_detail'),
    path('ops/drafts/<int:pk>/<str:action>/', admin.draft_action_api, name='ops_draft_action'),
    path('ops/blocks/', admin.content_block_list_api, name='ops_block_list'),
    path('ops/dashboard/', admin.admin_dashboard_api, name='ops_dashboard'),
    
    # Simple HTML view (no static files needed)
    path('ops/drafts/<int:pk>/view/', admin.draft_simple_view, name='ops_draft_simple_view'),
]


