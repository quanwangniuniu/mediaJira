from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SlackAuthViewSet, 
    SlackConnectionView, 
    NotificationPreferenceViewSet, 
    SlackNotificationTestView
)

router = DefaultRouter()
router.register(r'oauth', SlackAuthViewSet, basename='slack-oauth')
router.register(r'preferences', NotificationPreferenceViewSet, basename='slack-preferences')

urlpatterns = [
    path('', include(router.urls)),
    path('status/', SlackConnectionView.as_view(), name='slack-connection-status'),
    path('disconnect/', SlackConnectionView.as_view(), name='slack-disconnect'),
    path('notifications/test/', SlackNotificationTestView.as_view(), name='slack-test-notification'),
]
