from django.urls import path
from alerting import views

app_name = "alerting"

urlpatterns = [
    path("alert-tasks/", views.AlertTaskListCreateView.as_view(), name="alert-task-list-create"),
    path("alert-tasks/<int:id>/", views.AlertTaskRetrieveUpdateView.as_view(), name="alert-task-detail"),
]
