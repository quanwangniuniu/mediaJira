from django.urls import path
from report import views

app_name = "report"

urlpatterns = [
    path(
        "report-tasks/",
        views.ReportTaskListCreateView.as_view(),
        name="report-task-list-create",
    ),
    path(
        "report-tasks/<int:id>/",
        views.ReportTaskRetrieveUpdateView.as_view(),
        name="report-task-detail",
    ),
]
