from django.urls import path

from . import views


urlpatterns = [
    path("campaigns/<int:campaign_id>/variations", views.AdVariationListCreateView.as_view(), name="variation-list"),
    path(
        "campaigns/<int:campaign_id>/variations/<int:variation_id>",
        views.AdVariationDetailView.as_view(),
        name="variation-detail",
    ),
    path(
        "campaigns/<int:campaign_id>/variations/<int:variation_id>/duplicate",
        views.AdVariationDuplicateView.as_view(),
        name="variation-duplicate",
    ),
    path(
        "campaigns/<int:campaign_id>/variations/<int:variation_id>/status",
        views.VariationStatusChangeView.as_view(),
        name="variation-status",
    ),
    path(
        "campaigns/<int:campaign_id>/variations/<int:variation_id>/status-history",
        views.VariationStatusHistoryListView.as_view(),
        name="variation-status-history",
    ),
    path("campaigns/<int:campaign_id>/ad-groups", views.AdGroupListCreateView.as_view(), name="ad-group-list"),
    path(
        "campaigns/<int:campaign_id>/ad-groups/<int:ad_group_id>",
        views.AdGroupDetailView.as_view(),
        name="ad-group-detail",
    ),
    path(
        "campaigns/<int:campaign_id>/ad-groups/<int:ad_group_id>/variations",
        views.AdGroupVariationAssignmentView.as_view(),
        name="ad-group-variations",
    ),
    path(
        "campaigns/<int:campaign_id>/variations/compare",
        views.VariationComparisonView.as_view(),
        name="variation-compare",
    ),
    path(
        "campaigns/<int:campaign_id>/variations/<int:variation_id>/performance",
        views.VariationPerformanceView.as_view(),
        name="variation-performance",
    ),
    path(
        "campaigns/<int:campaign_id>/variations/<int:variation_id>/performance/latest",
        views.VariationPerformanceLatestView.as_view(),
        name="variation-performance-latest",
    ),
    path(
        "campaigns/<int:campaign_id>/variations/bulk",
        views.VariationBulkOperationView.as_view(),
        name="variation-bulk",
    ),
]
