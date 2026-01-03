"""
ViewSets for Workflow API endpoints.
Implements CRUD operations, batch operations, and graph validation.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError

from automationWorkflow.models import (
    Workflow,
    WorkflowNode,
    WorkflowConnection,
    WorkflowRule,
)
from automationWorkflow.serializers import (
    WorkflowSerializer,
    WorkflowNodeSerializer,
    WorkflowNodeCreateSerializer,
    WorkflowConnectionSerializer,
    WorkflowConnectionCreateSerializer,
    WorkflowGraphSerializer,
    BatchNodeOperationSerializer,
    BatchConnectionOperationSerializer,
    WorkflowRuleSerializer,
    WorkflowRuleCreateSerializer,
)
from automationWorkflow.permissions import WorkflowProjectPermission
from automationWorkflow.validators import WorkflowValidator
from core.models import ProjectMember


class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workflow CRUD operations.
    """

    queryset = Workflow.objects.select_related("project", "organization", "created_by").filter(
        is_deleted=False
    )
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated, WorkflowProjectPermission]

    def get_queryset(self):
        """
        Filter workflows for the current user.
        """
        user = self.request.user
        if not user.is_authenticated:
            return Workflow.objects.none()

        queryset = Workflow.objects.select_related(
            "project", "organization", "created_by"
        ).filter(is_deleted=False)

        org_id = user.organization_id
        if org_id:
            queryset = queryset.filter(Q(organization_id=org_id) | Q(organization_id__isnull=True))
        else:
            queryset = queryset.filter(organization_id__isnull=True)

        accessible_project_ids = list(
            ProjectMember.objects.filter(user=user, is_active=True).values_list(
                "project_id", flat=True
            )
        )

        project_id = self.request.query_params.get("project_id")
        if project_id is not None:
            try:
                project_id_int = int(project_id)
            except (TypeError, ValueError):
                return queryset.none()

            if project_id_int not in accessible_project_ids:
                return queryset.none()

            queryset = queryset.filter(project_id=project_id_int)
        else:
            queryset = queryset.filter(
                Q(project_id__in=accessible_project_ids) | Q(project_id__isnull=True)
            )

        name = self.request.query_params.get("name")
        if name:
            queryset = queryset.filter(name__icontains=name)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        creator = self.request.query_params.get("creator")
        if creator:
            try:
                creator_id = int(creator)
                queryset = queryset.filter(created_by_id=creator_id)
            except (TypeError, ValueError):
                queryset = queryset.none()

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        ordering = self.request.query_params.get("ordering", "-created_at")
        queryset = queryset.order_by(ordering)

        return queryset

    def perform_destroy(self, instance):
        """
        Soft delete a workflow instead of hard deleting it.
        """
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])

    @action(detail=True, methods=["get"])
    def graph(self, request, pk=None):
        """
        Get complete workflow graph including all nodes and connections.
        """
        workflow = self.get_object()

        nodes = workflow.nodes.filter(is_deleted=False)
        connections = workflow.connections.select_related("source_node", "target_node").filter(is_deleted=False)

        serializer = WorkflowGraphSerializer(
            {"workflow": workflow, "nodes": nodes, "connections": connections}
        )

        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def validate(self, request, pk=None):
        """
        Validate workflow graph structure and rules.
        """
        workflow = self.get_object()
        validation_result = WorkflowValidator.validate_workflow_graph(workflow)
        return Response(validation_result, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="nodes/batch")
    def batch_nodes(self, request, pk=None):
        """
        Batch operations on workflow nodes (create, update, delete).
        All operations are atomic - all succeed or all fail.
        """
        workflow = self.get_object()

        serializer = BatchNodeOperationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = {"created": [], "updated": [], "deleted": []}

        try:
            with transaction.atomic():
                create_data = serializer.validated_data.get("create", [])
                for node_data in create_data:
                    node_serializer = WorkflowNodeCreateSerializer(
                        data=node_data, context={"request": request}
                    )
                    node_serializer.is_valid(raise_exception=True)
                    node = node_serializer.save(workflow=workflow)
                    result["created"].append(WorkflowNodeSerializer(node).data)

                update_data = serializer.validated_data.get("update", [])
                for node_update in update_data:
                    node_id = node_update.pop("id")
                    try:
                        node = WorkflowNode.objects.get(id=node_id, workflow=workflow)
                    except WorkflowNode.DoesNotExist:
                        raise DjangoValidationError(
                            f"Node with id {node_id} does not exist in this workflow"
                        )

                    node_serializer = WorkflowNodeSerializer(
                        node, data=node_update, partial=True, context={"request": request}
                    )
                    node_serializer.is_valid(raise_exception=True)
                    node = node_serializer.save()
                    result["updated"].append(WorkflowNodeSerializer(node).data)

                delete_ids = serializer.validated_data.get("delete", [])
                for node_id in delete_ids:
                    try:
                        node = WorkflowNode.objects.get(
                            id=node_id,
                            workflow=workflow,
                            is_deleted=False,
                        )
                        node.is_deleted = True
                        node.save(update_fields=["is_deleted", "updated_at"])
                        result["deleted"].append(node_id)
                    except WorkflowNode.DoesNotExist:
                        raise DjangoValidationError(
                            f"Node with id {node_id} does not exist in this workflow"
                        )
        except DjangoValidationError as e:
            return Response(
                {"error": "Validation error", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Batch operation failed", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="connections/batch")
    def batch_connections(self, request, pk=None):
        """
        Batch operations on workflow connections (create, update, delete).
        All operations are atomic - all succeed or all fail.
        """
        workflow = self.get_object()

        serializer = BatchConnectionOperationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = {"created": [], "updated": [], "deleted": []}

        try:
            with transaction.atomic():
                create_data = serializer.validated_data.get("create", [])
                for conn_data in create_data:
                    conn_serializer = WorkflowConnectionCreateSerializer(
                        data=conn_data, context={"request": request, "workflow": workflow}
                    )
                    conn_serializer.is_valid(raise_exception=True)
                    connection = conn_serializer.save(workflow=workflow)
                    result["created"].append(
                        WorkflowConnectionSerializer(connection).data
                    )

                update_data = serializer.validated_data.get("update", [])
                for conn_update in update_data:
                    conn_id = conn_update.pop("id")
                    try:
                        connection = WorkflowConnection.objects.get(
                            id=conn_id, workflow=workflow
                        )
                    except WorkflowConnection.DoesNotExist:
                        raise DjangoValidationError(
                            f"Connection with id {conn_id} does not exist in this workflow"
                        )

                    conn_serializer = WorkflowConnectionSerializer(
                        connection,
                        data=conn_update,
                        partial=True,
                        context={"request": request, "workflow": workflow},
                    )
                    conn_serializer.is_valid(raise_exception=True)
                    connection = conn_serializer.save()
                    result["updated"].append(
                        WorkflowConnectionSerializer(connection).data
                    )

                delete_ids = serializer.validated_data.get("delete", [])
                for conn_id in delete_ids:
                    try:
                        connection = WorkflowConnection.objects.get(
                            id=conn_id,
                            workflow=workflow,
                            is_deleted=False,
                        )
                        connection.is_deleted = True
                        connection.save(update_fields=["is_deleted", "updated_at"])
                        result["deleted"].append(conn_id)
                    except WorkflowConnection.DoesNotExist:
                        raise DjangoValidationError(
                            f"Connection with id {conn_id} does not exist in this workflow"
                        )
        except DjangoValidationError as e:
            return Response(
                {"error": "Validation error", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"error": "Batch operation failed", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class WorkflowNodeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for WorkflowNode CRUD operations.
    Endpoints are nested under workflows.
    """

    queryset = WorkflowNode.objects.select_related("workflow").filter(is_deleted=False)
    serializer_class = WorkflowNodeSerializer
    permission_classes = [IsAuthenticated, WorkflowProjectPermission]

    def get_queryset(self):
        workflow_id = self.kwargs.get("workflow_pk")
        if workflow_id:
            return self.queryset.filter(workflow_id=workflow_id)
        return self.queryset.none()

    def get_serializer_class(self):
        if self.action == "create":
            return WorkflowNodeCreateSerializer
        return WorkflowNodeSerializer

    def perform_create(self, serializer):
        workflow_id = self.kwargs.get("workflow_pk")
        workflow = get_object_or_404(Workflow, id=workflow_id)

        self.check_object_permissions(self.request, workflow)

        serializer.save(workflow=workflow)

    def perform_update(self, serializer):
        serializer.save()

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        obj = get_object_or_404(queryset, pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_destroy(self, instance):
        # Prevent deletion of START node
        if instance.node_type == WorkflowNode.NODE_TYPE_START:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                "detail": "START node cannot be deleted. It is the entry point of the workflow."
            })
        
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class WorkflowConnectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for WorkflowConnection CRUD operations.
    Endpoints are nested under workflows.
    """

    queryset = WorkflowConnection.objects.select_related(
        "workflow", "source_node", "target_node"
    ).filter(is_deleted=False)
    serializer_class = WorkflowConnectionSerializer
    permission_classes = [IsAuthenticated, WorkflowProjectPermission]

    def get_queryset(self):
        workflow_id = self.kwargs.get("workflow_pk")
        if not workflow_id:
            return self.queryset.none()

        queryset = self.queryset.filter(workflow_id=workflow_id)

        connection_type = self.request.query_params.get("connection_type")
        if connection_type:
            queryset = queryset.filter(connection_type=connection_type)

        source_node_id = self.request.query_params.get("source_node_id")
        if source_node_id:
            queryset = queryset.filter(source_node_id=source_node_id)

        target_node_id = self.request.query_params.get("target_node_id")
        if target_node_id:
            queryset = queryset.filter(target_node_id=target_node_id)

        ordering = self.request.query_params.get("ordering", "-priority")
        queryset = queryset.order_by(ordering)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return WorkflowConnectionCreateSerializer
        return WorkflowConnectionSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        workflow_id = self.kwargs.get("workflow_pk")
        if workflow_id:
            try:
                context["workflow"] = Workflow.objects.get(id=workflow_id)
            except Workflow.DoesNotExist:
                pass
        return context

    def perform_create(self, serializer):
        workflow_id = self.kwargs.get("workflow_pk")
        workflow = get_object_or_404(Workflow, id=workflow_id)

        self.check_object_permissions(self.request, workflow)

        serializer.save(workflow=workflow)

    def perform_update(self, serializer):
        serializer.save()

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        obj = get_object_or_404(queryset, pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])
