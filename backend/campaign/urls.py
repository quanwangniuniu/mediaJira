"""
Campaign Management Module - URL Configuration
============================================================================
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CampaignViewSet,
    PerformanceCheckInViewSet,
    PerformanceSnapshotViewSet,
    CampaignAttachmentViewSet,
    CampaignTemplateViewSet,
    CampaignTaskLinkViewSet,
    CampaignDecisionLinkViewSet,
    CampaignCalendarLinkViewSet,
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet, basename='campaign')
router.register(r'campaign-templates', CampaignTemplateViewSet, basename='campaign-template')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),

    # OpenAPI-aligned template action route (uses {template_id} in spec)
    path(
        'campaign-templates/<uuid:template_id>/create-campaign/',
        CampaignTemplateViewSet.as_view({'post': 'create_campaign'}),
        name='campaign-template-create-campaign'
    ),

    # OpenAPI: /campaign-task-links/
    path(
        'campaign-task-links/',
        CampaignTaskLinkViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='campaign-task-links'
    ),
    path(
        'campaign-task-links/<uuid:id>/',
        CampaignTaskLinkViewSet.as_view({'delete': 'destroy'}),
        name='campaign-task-link-detail'
    ),
    
    # OpenAPI: /campaign-decision-links/
    path(
        'campaign-decision-links/',
        CampaignDecisionLinkViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='campaign-decision-links'
    ),
    
    # OpenAPI: /campaign-calendar-links/
    path(
        'campaign-calendar-links/',
        CampaignCalendarLinkViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='campaign-calendar-links'
    ),
    
    # Nested routes for performance tracking
    path(
        'campaigns/<uuid:campaign_id>/check-ins/',
        PerformanceCheckInViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='campaign-check-ins-list'
    ),
    path(
        'campaigns/<uuid:campaign_id>/check-ins/<uuid:id>/',
        PerformanceCheckInViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='campaign-check-ins-detail'
    ),
    
    # Nested routes for performance snapshots
    path(
        'campaigns/<uuid:campaign_id>/performance-snapshots/',
        PerformanceSnapshotViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='campaign-performance-snapshots-list'
    ),
    path(
        'campaigns/<uuid:campaign_id>/performance-snapshots/<uuid:id>/',
        PerformanceSnapshotViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='campaign-performance-snapshots-detail'
    ),
    path(
        'campaigns/<uuid:campaign_id>/performance-snapshots/<uuid:id>/screenshot/',
        PerformanceSnapshotViewSet.as_view({
            'post': 'upload_screenshot'
        }),
        name='campaign-performance-snapshots-screenshot'
    ),
    
    # Nested routes for campaign attachments
    path(
        'campaigns/<uuid:id>/attachments/',
        CampaignAttachmentViewSet.as_view({
            'get': 'list',
            'post': 'create'
        }),
        name='campaign-attachments-list'
    ),
    path(
        'campaigns/<uuid:id>/attachments/<uuid:attachment_id>/',
        CampaignAttachmentViewSet.as_view({
            'get': 'retrieve',
            'delete': 'destroy'
        }),
        name='campaign-attachments-detail'
    ),
]

