# authentication/urls.py
from django.urls import path
from .views import RegisterView, VerifyEmailView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('verify/', VerifyEmailView.as_view(), name='verify'), 
]