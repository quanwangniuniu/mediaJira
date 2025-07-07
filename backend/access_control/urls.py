# backend/access_control/urls.py

from django.urls import path
from .views import AssetListView, CampaignEditView

urlpatterns = [
    # Test "view asset list" — requires VIEW_ASSET permission
    path('assets/list/', AssetListView.as_view(), name='asset-list'),
    # Test "edit campaign" — requires EDIT_CAMPAIGN permission
    path('campaigns/<int:pk>/edit/', CampaignEditView.as_view(), name='campaign-edit'),
]