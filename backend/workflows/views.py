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

from automationWorkflow.models import Workflow, WorkflowNode, WorkflowConnection
from workflows.serializers import (
    WorkflowSerializer,
    WorkflowNodeSerializer,
    WorkflowNodeCreateSerializer,
    WorkflowConnectionSerializer,
    WorkflowConnectionCreateSerializer,
    WorkflowGraphSerializer,
    BatchNodeOperationSerializer,
    BatchConnectionOperationSerializer,
)
from workflows.permissions import WorkflowProjectPermission
from workflows.validators import WorkflowValidator
from core.models import ProjectMember


class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workflow CRUD operations.
    
    Endpoints:
    - GET /api/workflows/ - List workflows
    - POST /api/workflows/ - Create workflow
    - GET /api/workflows/{id}/ - Get workflow detail
    - PUT /api/workflows/{id}/ - Update workflow (full)
    - PATCH /api/workflows/{id}/ - Update workflow (partial)
    - DELETE /api/workflows/{id}/ - Delete workflow
    - GET /api/workflows/{id}/graph/ - Get complete workflow graph
    - POST /api/workflows/{id}/validate/ - Validate workflow graph
    """
    
    queryset = Workflow.objects.select_related('project', 'organization', 'created_by').filter(
        is_deleted=False
    )
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated, WorkflowProjectPermission]
    
    def get_queryset(self):
        """
        Filter workflows for the current user.

        Rules:
        - Only authenticated users can access.
        - By default, only workflows in the user's organization (or global
          workflows with no organization) are visible.
        - Optional filters:
          - project_id
          - name (icontains)
          - status
          - creator (created_by_id)
          - search (name/description)
        """
        user = self.request.user
        if not user.is_authenticated:
            return Workflow.objects.none()
        
        queryset = Workflow.objects.select_related('project', 'organization', 'created_by').filter(
            is_deleted=False
        )

        # Restrict by organization
        org_id = user.organization_id
        if org_id:
            queryset = queryset.filter(
                Q(organization_id=org_id) | Q(organization_id__isnull=True)
            )
        else:
            # Users without organization only see global workflows
            queryset = queryset.filter(organization_id__isnull=True)
        
        # Get user's accessible project IDs
        accessible_project_ids = list(
            ProjectMember.objects.filter(
                user=user,
                is_active=True
            ).values_list('project_id', flat=True)
        )
        
        # Filter by project_id query param if provided
        project_id = self.request.query_params.get('project_id')
        if project_id is not None:
            try:
                project_id_int = int(project_id)
            except (TypeError, ValueError):
                return queryset.none()
            
            if project_id_int not in accessible_project_ids:
                return queryset.none()
            
            queryset = queryset.filter(project_id=project_id_int)
        else:
            # Show workflows from user's projects + global workflows
            queryset = queryset.filter(
                Q(project_id__in=accessible_project_ids) | 
                Q(project_id__isnull=True)
            )

        # Filter by name (partial match)
        name = self.request.query_params.get('name')
        if name:
            queryset = queryset.filter(name__icontains=name)

        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # Filter by creator (created_by_id)
        creator = self.request.query_params.get('creator')
        if creator:
            try:
                creator_id = int(creator)
                queryset = queryset.filter(created_by_id=creator_id)
            except (TypeError, ValueError):
                queryset = queryset.none()
        
        # Search in name and description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search)
            )
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        queryset = queryset.order_by(ordering)
        
        return queryset

    def perform_destroy(self, instance):
        """
        Soft delete a workflow instead of hard deleting it.

        Marks the workflow as deleted so it is excluded from queries,
        but retains the record for audit/history purposes.
        """
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])
    
    @action(detail=True, methods=['get'])
    def graph(self, request, pk=None):
        """
        Get complete workflow graph including all nodes and connections.
        
        Returns workflow data with nested nodes and connections in a single response.
        """
        workflow = self.get_object()
        
        # Prefetch related nodes and connections
        nodes = workflow.nodes.all()
        connections = workflow.connections.select_related('source_node', 'target_node').all()
        
        serializer = WorkflowGraphSerializer({
            'workflow': workflow,
            'nodes': nodes,
            'connections': connections
        })
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """
        Validate workflow graph structure and rules.
        
        Returns validation status with detailed errors and warnings.
        """
        workflow = self.get_object()
        
        # Run validation
        validation_result = WorkflowValidator.validate_workflow_graph(workflow)
        
        return Response(validation_result, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='nodes/batch')
    def batch_nodes(self, request, pk=None):
        """
        Batch operations on workflow nodes (create, update, delete).
        All operations are atomic - all succeed or all fail.
        
        Request body:
        {
            "create": [{"node_type": "action", "label": "Task 1", "data": {...}}, ...],
            "update": [{"id": 5, "label": "Updated Task"}, ...],
            "delete": [10, 11, 12]
        }
        """
        workflow = self.get_object()
        
        # Validate request data
        serializer = BatchNodeOperationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = {
            'created': [],
            'updated': [],
            'deleted': []
        }
        
        try:
            with transaction.atomic():
                # Process creates
                create_data = serializer.validated_data.get('create', [])
                for node_data in create_data:
                    node_serializer = WorkflowNodeCreateSerializer(
                        data=node_data,
                        context={'request': request}
                    )
                    node_serializer.is_valid(raise_exception=True)
                    node = node_serializer.save(workflow=workflow)
                    result['created'].append(WorkflowNodeSerializer(node).data)
                
                # Process updates
                update_data = serializer.validated_data.get('update', [])
                for node_update in update_data:
                    node_id = node_update.pop('id')
                    try:
                        node = WorkflowNode.objects.get(id=node_id, workflow=workflow)
                    except WorkflowNode.DoesNotExist:
                        raise DjangoValidationError(
                            f'Node with id {node_id} does not exist in this workflow'
                        )
                    
                    node_serializer = WorkflowNodeSerializer(
                        node,
                        data=node_update,
                        partial=True,
                        context={'request': request}
                    )
                    node_serializer.is_valid(raise_exception=True)
                    node = node_serializer.save()
                    result['updated'].append(WorkflowNodeSerializer(node).data)
                
                # Process deletes
                delete_ids = serializer.validated_data.get('delete', [])
                for node_id in delete_ids:
                    try:
                        node = WorkflowNode.objects.get(
                            id=node_id,
                            workflow=workflow,
                            is_deleted=False,
                        )
                        node.is_deleted = True
                        node.save(update_fields=['is_deleted', 'updated_at'])
                        result['deleted'].append(node_id)
                    except WorkflowNode.DoesNotExist:
                        raise DjangoValidationError(
                            f'Node with id {node_id} does not exist in this workflow'
                        )
        
        except DjangoValidationError as e:
            return Response(
                {'error': 'Validation error', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Batch operation failed', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(result, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='connections/batch')
    def batch_connections(self, request, pk=None):
        """
        Batch operations on workflow connections (create, update, delete).
        All operations are atomic - all succeed or all fail.
        
        Request body:
        {
            "create": [{"source_node_id": 1, "target_node_id": 2, "connection_type": "sequential"}, ...],
            "update": [{"id": 5, "priority": 10}, ...],
            "delete": [8, 9]
        }
        """
        workflow = self.get_object()
        
        # Validate request data
        serializer = BatchConnectionOperationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = {
            'created': [],
            'updated': [],
            'deleted': []
        }
        
        try:
            with transaction.atomic():
                # Process creates
                create_data = serializer.validated_data.get('create', [])
                for conn_data in create_data:
                    conn_serializer = WorkflowConnectionCreateSerializer(
                        data=conn_data,
                        context={'request': request, 'workflow': workflow}
                    )
                    conn_serializer.is_valid(raise_exception=True)
                    connection = conn_serializer.save(workflow=workflow)
                    result['created'].append(WorkflowConnectionSerializer(connection).data)
                
                # Process updates
                update_data = serializer.validated_data.get('update', [])
                for conn_update in update_data:
                    conn_id = conn_update.pop('id')
                    try:
                        connection = WorkflowConnection.objects.get(id=conn_id, workflow=workflow)
                    except WorkflowConnection.DoesNotExist:
                        raise DjangoValidationError(
                            f'Connection with id {conn_id} does not exist in this workflow'
                        )
                    
                    conn_serializer = WorkflowConnectionSerializer(
                        connection,
                        data=conn_update,
                        partial=True,
                        context={'request': request, 'workflow': workflow}
                    )
                    conn_serializer.is_valid(raise_exception=True)
                    connection = conn_serializer.save()
                    result['updated'].append(WorkflowConnectionSerializer(connection).data)
                
                # Process deletes
                delete_ids = serializer.validated_data.get('delete', [])
                for conn_id in delete_ids:
                    try:
                        connection = WorkflowConnection.objects.get(
                            id=conn_id,
                            workflow=workflow,
                            is_deleted=False,
                        )
                        connection.is_deleted = True
                        connection.save(update_fields=['is_deleted', 'updated_at'])
                        result['deleted'].append(conn_id)
                    except WorkflowConnection.DoesNotExist:
                        raise DjangoValidationError(
                            f'Connection with id {conn_id} does not exist in this workflow'
                        )
        
        except DjangoValidationError as e:
            return Response(
                {'error': 'Validation error', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Batch operation failed', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(result, status=status.HTTP_200_OK)


class WorkflowNodeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for WorkflowNode CRUD operations.
    
    Endpoints are nested under workflows:
    - GET /api/workflows/{workflow_id}/nodes/ - List nodes
    - POST /api/workflows/{workflow_id}/nodes/ - Create node
    - GET /api/workflows/{workflow_id}/nodes/{id}/ - Get node detail
    - PUT /api/workflows/{workflow_id}/nodes/{id}/ - Update node (full)
    - PATCH /api/workflows/{workflow_id}/nodes/{id}/ - Update node (partial)
    - DELETE /api/workflows/{workflow_id}/nodes/{id}/ - Delete node
    """
    
    queryset = WorkflowNode.objects.select_related('workflow').filter(is_deleted=False)
    serializer_class = WorkflowNodeSerializer
    permission_classes = [IsAuthenticated, WorkflowProjectPermission]
    
    def get_queryset(self):
        """Filter nodes by workflow"""
        workflow_id = self.kwargs.get('workflow_pk')
        if workflow_id:
            return self.queryset.filter(workflow_id=workflow_id)
        return self.queryset.none()
    
    def get_serializer_class(self):
        """Use different serializer for create"""
        if self.action == 'create':
            return WorkflowNodeCreateSerializer
        return WorkflowNodeSerializer
    
    def perform_create(self, serializer):
        """Associate node with workflow"""
        workflow_id = self.kwargs.get('workflow_pk')
        workflow = get_object_or_404(Workflow, id=workflow_id)
        
        # Check permissions
        self.check_object_permissions(self.request, workflow)
        
        serializer.save(workflow=workflow)
    
    def perform_update(self, serializer):
        """Ensure workflow cannot be changed"""
        serializer.save()
    
    def get_object(self):
        """Get node and check permissions"""
        queryset = self.filter_queryset(self.get_queryset())
        obj = get_object_or_404(queryset, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_destroy(self, instance):
        """Soft delete nodes instead of hard deleting them."""
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])


class WorkflowConnectionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for WorkflowConnection CRUD operations.
    
    Endpoints are nested under workflows:
    - GET /api/workflows/{workflow_id}/connections/ - List connections
    - POST /api/workflows/{workflow_id}/connections/ - Create connection
    - GET /api/workflows/{workflow_id}/connections/{id}/ - Get connection detail
    - PUT /api/workflows/{workflow_id}/connections/{id}/ - Update connection (full)
    - PATCH /api/workflows/{workflow_id}/connections/{id}/ - Update connection (partial)
    - DELETE /api/workflows/{workflow_id}/connections/{id}/ - Delete connection
    """
    
    queryset = WorkflowConnection.objects.select_related(
        'workflow',
        'source_node',
        'target_node',
    ).filter(is_deleted=False)
    serializer_class = WorkflowConnectionSerializer
    permission_classes = [IsAuthenticated, WorkflowProjectPermission]
    
    def get_queryset(self):
        """Filter connections by workflow and optional query params"""
        workflow_id = self.kwargs.get('workflow_pk')
        if not workflow_id:
            return self.queryset.none()
        
        queryset = self.queryset.filter(workflow_id=workflow_id)
        
        # Filter by connection_type if provided
        connection_type = self.request.query_params.get('connection_type')
        if connection_type:
            queryset = queryset.filter(connection_type=connection_type)
        
        # Filter by source_node_id if provided
        source_node_id = self.request.query_params.get('source_node_id')
        if source_node_id:
            queryset = queryset.filter(source_node_id=source_node_id)
        
        # Filter by target_node_id if provided
        target_node_id = self.request.query_params.get('target_node_id')
        if target_node_id:
            queryset = queryset.filter(target_node_id=target_node_id)
        
        # Ordering
        ordering = self.request.query_params.get('ordering', '-priority')
        queryset = queryset.order_by(ordering)
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializer for create"""
        if self.action == 'create':
            return WorkflowConnectionCreateSerializer
        return WorkflowConnectionSerializer
    
    def get_serializer_context(self):
        """Add workflow to serializer context for validation"""
        context = super().get_serializer_context()
        workflow_id = self.kwargs.get('workflow_pk')
        if workflow_id:
            try:
                context['workflow'] = Workflow.objects.get(id=workflow_id)
            except Workflow.DoesNotExist:
                pass
        return context
    
    def perform_create(self, serializer):
        """Associate connection with workflow"""
        workflow_id = self.kwargs.get('workflow_pk')
        workflow = get_object_or_404(Workflow, id=workflow_id)
        
        # Check permissions
        self.check_object_permissions(self.request, workflow)
        
        serializer.save(workflow=workflow)
    
    def perform_update(self, serializer):
        """Ensure workflow cannot be changed"""
        serializer.save()
    
    def get_object(self):
        """Get connection and check permissions"""
        queryset = self.filter_queryset(self.get_queryset())
        obj = get_object_or_404(queryset, pk=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_destroy(self, instance):
        """Soft delete connections instead of hard deleting them."""
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])
