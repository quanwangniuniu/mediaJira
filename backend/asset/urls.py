from django.urls import path
from . import views

app_name = 'asset'

urlpatterns = [
    # Asset endpoints
    # GET /assets/ - List all assets (paginated)
    # POST /assets/ - Create a new asset
    path('', views.AssetListView.as_view(), name='asset-list'),
    
    # GET /assets/{id}/ - Get asset details
    # PUT /assets/{id}/ - Update entire asset
    # DELETE /assets/{id}/ - Delete asset
    path('<int:pk>/', views.AssetDetailView.as_view(), name='asset-detail'),
    
    # PUT /assets/{id}/submit/ - Submit asset for review (NotSubmitted -> PendingReview)
    path('<int:pk>/submit/', views.AssetSubmitView.as_view(), name='asset-submit'),
    # POST /assets/{id}/acknowledge/ - Acknowledge rejection (RevisionRequired -> NotSubmitted)
    path('<int:pk>/acknowledge/', views.AssetAcknowledgeView.as_view(), name='asset-acknowledge'),
    
    # Asset version endpoints
    # GET /assets/{asset_id}/versions/ - List all versions of an asset
    # POST /assets/{asset_id}/versions/ - Create a new version for an asset
    path('<int:asset_id>/versions/', views.AssetVersionListView.as_view(), name='asset-version-list'),
    # PUT /assets/{asset_id}/versions/{version_id}/ - Update a specific asset version
    # DELETE /assets/{asset_id}/versions/{version_id}/ - Physically delete a specific asset version
    path('<int:asset_id>/versions/<int:version_id>/', views.AssetVersionDetailView.as_view(), name='asset-version-detail'),
    # POST /assets/{asset_id}/versions/{version_id}/publish/ - Publish version (Draft -> Finalized)
    path('<int:asset_id>/versions/<int:version_id>/publish/', views.AssetVersionPublishView.as_view(), name='asset-version-publish'),
    
    # Asset comment endpoints
    # GET /assets/{asset_id}/comments/ - List all comments for an asset
    # POST /assets/{asset_id}/comments/ - Create a new comment for an asset
    path('<int:asset_id>/comments/', views.AssetCommentListView.as_view(), name='asset-comment-list'),
    
    # Asset history endpoint
    # GET /assets/{asset_id}/history/ - Get asset activity history
    path('<int:asset_id>/history/', views.AssetHistoryView.as_view(), name='asset-history'),
    
    # Review assignment endpoints
    # GET /assets/{asset_id}/assignments/ - List all review assignments for an asset
    # POST /assets/{asset_id}/assignments/ - Create a new review assignment for an asset
    path('<int:asset_id>/assignments/', views.ReviewAssignmentListView.as_view(), name='review-assignment-list'),
    
    # Review action endpoint
    # PATCH /assets/{id}/review/ - Perform review actions (approve, reject, start_review, etc.)
    path('<int:pk>/review/', views.AssetReviewView.as_view(), name='asset-review'),
    
    # Bulk review endpoint
    # POST /assets/bulk-review/ - Perform bulk review operations on multiple assets
    path('bulk-review/', views.BulkReviewView.as_view(), name='bulk-review'),
    
    # Download endpoint
    # GET /assets/{asset_id}/versions/{version_id}/download/ - Download a specific asset version
    path('<int:asset_id>/versions/<int:version_id>/download/', views.AssetVersionDownloadView.as_view(), name='asset-version-download'),
] 