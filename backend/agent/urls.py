from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import AgentSessionViewSet, ChatView, SpreadsheetListView

router = DefaultRouter()
router.register(r'sessions', AgentSessionViewSet, basename='agent-session')

urlpatterns = [
    path('', include(router.urls)),
    path('sessions/<uuid:session_id>/chat/', ChatView.as_view(), name='agent-chat'),
    path('spreadsheets/', SpreadsheetListView.as_view(), name='agent-spreadsheets'),
]
