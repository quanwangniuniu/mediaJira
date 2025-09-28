from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

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
]


