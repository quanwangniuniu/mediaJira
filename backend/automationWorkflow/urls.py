"""
URL configuration for Workflow API endpoints.
Implements nested routing for nodes and connections under workflows.
"""
from django.urls import path
from automationWorkflow.views import (
    WorkflowViewSet,
    WorkflowNodeViewSet,
    WorkflowConnectionViewSet,
)

app_name = "workflows"

urlpatterns = [
    path(
        "workflows/",
        WorkflowViewSet.as_view({"get": "list", "post": "create"}),
        name="workflow-list",
    ),
    path(
        "workflows/<int:pk>/",
        WorkflowViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="workflow-detail",
    ),
    path(
        "workflows/<int:pk>/graph/",
        WorkflowViewSet.as_view({"get": "graph"}),
        name="workflow-graph",
    ),
    path(
        "workflows/<int:pk>/validate/",
        WorkflowViewSet.as_view({"post": "validate"}),
        name="workflow-validate",
    ),
    path(
        "workflows/<int:pk>/nodes/batch/",
        WorkflowViewSet.as_view({"post": "batch_nodes"}),
        name="workflow-batch-nodes",
    ),
    path(
        "workflows/<int:pk>/connections/batch/",
        WorkflowViewSet.as_view({"post": "batch_connections"}),
        name="workflow-batch-connections",
    ),
    path(
        "workflows/<int:workflow_pk>/nodes/",
        WorkflowNodeViewSet.as_view({"get": "list", "post": "create"}),
        name="node-list",
    ),
    path(
        "workflows/<int:workflow_pk>/nodes/<int:pk>/",
        WorkflowNodeViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="node-detail",
    ),
    path(
        "workflows/<int:workflow_pk>/connections/",
        WorkflowConnectionViewSet.as_view({"get": "list", "post": "create"}),
        name="connection-list",
    ),
    path(
        "workflows/<int:workflow_pk>/connections/<int:pk>/",
        WorkflowConnectionViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="connection-detail",
    ),
    
]

