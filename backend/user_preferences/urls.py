from django.urls import path
from .views import UserPreferencesView

app_name = 'user_preferences'

urlpatterns = [
    path('me/preferences/', UserPreferencesView.as_view(), name='user-preferences'),
] 