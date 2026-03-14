"""Alert task URL routes - kept at /api/alerting/ for frontend compatibility."""

from django.urls import path

from task.views import AlertTaskListCreateView, AlertTaskRetrieveUpdateView

app_name = "alerting"

urlpatterns = [
    path("alert-tasks/", AlertTaskListCreateView.as_view(), name="alert-task-list-create"),
    path("alert-tasks/<int:id>/", AlertTaskRetrieveUpdateView.as_view(), name="alert-task-detail"),
]
