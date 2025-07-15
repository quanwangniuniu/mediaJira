from django.urls import path
from .views import UserPreferencesView

app_name = 'user_preferences'

urlpatterns = [
    path('me/', UserPreferencesView.as_view(), name='user-preferences'),
] 