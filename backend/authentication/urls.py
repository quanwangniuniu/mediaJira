# authentication/urls.py
from django.urls import path
from .views import (
    RegisterView, 
    VerifyEmailView, 
    LoginView, 
    GoogleOAuthStartView, 
    GoogleOAuthCallbackView, 
    GoogleSetPasswordView,
    MeView, 
    UserTeamsView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify/', VerifyEmailView.as_view(), name='verify'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('me/teams/', UserTeamsView.as_view(), name='user-teams'),
    
    # Google OAuth endpoints
    path('google/start/', GoogleOAuthStartView.as_view(), name='google-oauth-start'),
    path('google/callback/', GoogleOAuthCallbackView.as_view(), name='google-oauth-callback'),
    path('google/set-password/', GoogleSetPasswordView.as_view(), name='google-set-password'),
]