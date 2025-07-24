from django.urls import path
from .views import UserPreferencesView, SlackIntegrationView, NotificationSettingsView

app_name = 'user_preferences'

urlpatterns = [
    path('me/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
    path('me/notifications/slack/', SlackIntegrationView.as_view(), name='slack-integration'),
    path('me/notifications/settings/', NotificationSettingsView.as_view(), name='notification-settings'),
] 