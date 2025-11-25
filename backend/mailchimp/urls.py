# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailDraftViewSet, TemplateViewSet

router = DefaultRouter()
router.register(r'email-drafts', EmailDraftViewSet, basename='email-draft')
router.register(r'templates', TemplateViewSet, basename='template')

urlpatterns = [
    path('', include(router.urls)),
]
