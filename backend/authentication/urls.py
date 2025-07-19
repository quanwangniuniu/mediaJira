# authentication/urls.py
from django.urls import path
from .views import RegisterView, VerifyEmailView, LoginView, SsoRedirectView, SsoCallbackView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify/', VerifyEmailView.as_view(), name='verify'),
    path('login/', LoginView.as_view(), name='login'),
    path('sso/redirect/', SsoRedirectView.as_view(), name='sso-redirect'),
    path('sso/callback/', SsoCallbackView.as_view(), name='sso-callback'),
]