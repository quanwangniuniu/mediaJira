from django.urls import path
from . import views

urlpatterns = [
    # Campaign Task CRUD endpoints
    path('tasks/', views.CampaignTaskViewSet.as_view({'get': 'list', 'post': 'create'}), name='campaign-task-list'),
    path('tasks/<uuid:pk>/', views.CampaignTaskViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='campaign-task-detail'),
    
    # Campaign Task action endpoints
    path('tasks/<uuid:pk>/launch/', views.CampaignTaskLaunchView.as_view(), name='campaign-task-launch'),
    path('tasks/<uuid:pk>/pause/', views.CampaignTaskPauseView.as_view(), name='campaign-task-pause'),
    path('tasks/<uuid:pk>/logs/', views.ExecutionLogViewSet.as_view({'get': 'list'}), name='campaign-task-logs'),
    path('tasks/<uuid:pk>/external-status/', views.CampaignTaskExternalStatusView.as_view(), name='campaign-task-external-status'),
    
    # ROI Alert endpoints
    path('alerts/roi/', views.ROIAlertTriggerViewSet.as_view({'post': 'create'}), name='roi-alert-create'),
]

