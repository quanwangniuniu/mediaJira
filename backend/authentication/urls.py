# authentication/urls.py
from django.urls import path
from .views import RegisterView, VerifyEmailView, LoginView, SsoRedirectView, SsoCallbackView, MeView, UserTeamsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify/', VerifyEmailView.as_view(), name='verify'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path('me/teams/', UserTeamsView.as_view(), name='user-teams'),
    path('sso/redirect/', SsoRedirectView.as_view(), name='sso-redirect'),
    path('sso/callback/', SsoCallbackView.as_view(), name='sso-callback'),
]