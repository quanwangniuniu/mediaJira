from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'campaigns', views.CampaignTaskViewSet, basename='campaign-task')
router.register(r'channel-configs', views.ChannelConfigViewSet, basename='channel-config')
router.register(r'execution-logs', views.ExecutionLogViewSet, basename='execution-log')
router.register(r'roi-alerts', views.ROIAlertTriggerViewSet, basename='roi-alert')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/campaigns/<int:campaign_id>/launch/', views.launch_campaign_view, name='launch-campaign'),
    path('api/campaigns/<int:campaign_id>/pause/', views.pause_campaign_view, name='pause-campaign'),
    path('api/campaigns/<int:campaign_id>/resume/', views.resume_campaign_view, name='resume-campaign'),
    path('api/campaigns/<int:campaign_id>/status/', views.get_campaign_status_view, name='campaign-status'),
]
