from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    AgentSessionViewSet,
    ChatView,
    SpreadsheetListView,
    DataReportListView,
    DataReportDetailView,
    DataReportSummaryView,
    DataUploadView,
    DecisionStatsView,
    DecisionRecentView,
)

router = DefaultRouter()
router.register(r'sessions', AgentSessionViewSet, basename='agent-session')

urlpatterns = [
    path('', include(router.urls)),
    path('sessions/<uuid:session_id>/chat/', ChatView.as_view(), name='agent-chat'),
    path('spreadsheets/', SpreadsheetListView.as_view(), name='agent-spreadsheets'),
    path('data/reports/', DataReportListView.as_view(), name='agent-data-reports'),
    path('data/reports/summary/', DataReportSummaryView.as_view(), name='agent-data-reports-summary'),
    path('data/reports/<uuid:file_id>/', DataReportDetailView.as_view(), name='agent-data-report-detail'),
    path('data/upload/', DataUploadView.as_view(), name='agent-data-upload'),
    path('decisions/stats/', DecisionStatsView.as_view(), name='agent-decision-stats'),
    path('decisions/recent/', DecisionRecentView.as_view(), name='agent-decision-recent'),
]
