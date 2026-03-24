from django.urls import path
from report import views

app_name = "report"

urlpatterns = [
    path(
        "reports/",
        views.ReportListCreateView.as_view(),
        name="report-list-create",
    ),
    path(
        "reports/<int:id>/",
        views.ReportRetrieveUpdateView.as_view(),
        name="report-detail",
    ),
    path(
        "reports/<int:id>/key-actions/",
        views.ReportKeyActionListCreateView.as_view(),
        name="report-key-actions-list-create",
    ),
    path(
        "reports/<int:id>/key-actions/<int:action_id>/",
        views.ReportKeyActionRetrieveUpdateDestroyView.as_view(),
        name="report-key-action-detail",
    ),
]
