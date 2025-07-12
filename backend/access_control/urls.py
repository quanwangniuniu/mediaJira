from django.urls import path
from .views import (
    # original test views
    AssetListView, CampaignEditView,
    
    # simplified views
    organizations_list, teams_list, roles_list, permissions_list,
    role_permissions_list, update_role_permissions, copy_role_permissions,
    user_permissions, check_permission
)

urlpatterns = [
    # original test endpoints
    path('assets/list/', AssetListView.as_view(), name='asset-list'),
    path('campaigns/<int:pk>/edit/', CampaignEditView.as_view(), name='campaign-edit'),
    
    # core endpoints needed from the frontend
    path('organizations/', organizations_list, name='organizations'),
    path('teams/', teams_list, name='teams'),
    path('roles/', roles_list, name='roles'),
    path('permissions/', permissions_list, name='permissions'),
    path('role-permissions/', role_permissions_list, name='role-permissions'),
    
    # permissions management endpoints
    path('roles/<int:role_id>/permissions/', update_role_permissions, name='update-role-permissions'),
    path('roles/<int:to_role_id>/copy-permissions/', copy_role_permissions, name='copy-role-permissions'),
    path('users/<int:user_id>/permissions/', user_permissions, name='user-permissions'),
    path('permissions/check/', check_permission, name='permission-check'),
]