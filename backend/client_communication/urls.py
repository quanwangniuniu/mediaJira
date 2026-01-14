from django.urls import path

from .views import (
    ClientCommunicationListCreateView,
    ClientCommunicationDetailView,
)

app_name = "client_communication"

urlpatterns = [
    path(
        "client-communications/",
        ClientCommunicationListCreateView.as_view(),
        name="client-communication-list-create",
    ),
    path(
        "client-communications/<int:pk>/",
        ClientCommunicationDetailView.as_view(),
        name="client-communication-detail",
    ),
]

