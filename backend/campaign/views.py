from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
import uuid

from .models import CampaignTask, ExecutionLog, ROIAlertTrigger, CampaignTaskStatus
from .serializers import (
    CampaignTaskSerializer, CampaignTaskCreateSerializer, CampaignTaskUpdateSerializer,
    ExecutionLogSerializer, LaunchRequestSerializer, PauseResumeRequestSerializer,
    ROIAlertTriggerSerializer, ROIAlertTriggerUpsertSerializer, ExternalStatusSerializer
)
from .permissions import CampaignPermission
from .services import CampaignService


class CampaignTaskPagination(PageNumberPagination):
    """Pagination for campaign task list"""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 200


class CampaignTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for campaign task CRUD operations.
    
    Endpoints:
    - POST /campaigns/tasks/ - Create campaign task
    - GET /campaigns/tasks/ - List campaign tasks
    - GET /campaigns/tasks/{id}/ - Retrieve campaign task
    - PUT /campaigns/tasks/{id}/ - Update campaign task
    - DELETE /campaigns/tasks/{id}/ - Archive campaign task
    """
    queryset = CampaignTask.objects.all()
    serializer_class = CampaignTaskSerializer
    permission_classes = [CampaignPermission]
    pagination_class = CampaignTaskPagination
    lookup_field = 'campaign_task_id'
    lookup_url_kwarg = 'pk'
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'create':
            return CampaignTaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CampaignTaskUpdateSerializer
        return CampaignTaskSerializer
    
    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = CampaignTask.objects.select_related('created_by', 'task').all()
        
        # Filter by team_id (via created_by's team)
        team_id = self.request.query_params.get('team_id')
        if team_id:
            queryset = queryset.filter(created_by__teammember__team_id=team_id)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by channel
        channel = self.request.query_params.get('channel')
        if channel:
            queryset = queryset.filter(channel=channel)
        
        # Filter by created_by
        created_by = self.request.query_params.get('created_by')
        if created_by:
            queryset = queryset.filter(created_by_id=created_by)
        
        # Filter by scheduled date range
        scheduled_from = self.request.query_params.get('scheduled_from')
        if scheduled_from:
            queryset = queryset.filter(scheduled_date__gte=scheduled_from)
        
        scheduled_to = self.request.query_params.get('scheduled_to')
        if scheduled_to:
            queryset = queryset.filter(scheduled_date__lte=scheduled_to)
        
        # Search by title (q parameter)
        q = self.request.query_params.get('q')
        if q:
            queryset = queryset.filter(title__icontains=q)
        
        return queryset.order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create campaign task"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        try:
            # Get project from request (if available)
            project = None
            project_id = request.data.get('project_id')
            if project_id:
                from core.models import Project
                try:
                    project = Project.objects.get(id=project_id)
                except Project.DoesNotExist:
                    pass
            
            campaign_task = CampaignService.create_campaign_task(
                data=serializer.validated_data,
                user=request.user,
                project=project
            )
            
            response_serializer = CampaignTaskSerializer(campaign_task)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e), 'code': 'UNKNOWN'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """Update campaign task"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        
        try:
            serializer.save()
            response_serializer = CampaignTaskSerializer(instance)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': str(e), 'code': 'UNKNOWN'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """Archive campaign task (soft delete)"""
        instance = self.get_object()
        
        try:
            CampaignService.archive_campaign(instance, actor_user=request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValueError as e:
            return Response(
                {'error': str(e), 'code': 'CONFLICT'},
                status=status.HTTP_409_CONFLICT
            )
        except Exception as e:
            return Response(
                {'error': str(e), 'code': 'UNKNOWN'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CampaignTaskLaunchView(APIView):
    """
    View for launching campaign task.
    
    POST /campaigns/tasks/{id}/launch/
    """
    permission_classes = [CampaignPermission]
    
    def post(self, request, pk):
        """Launch campaign task"""
        campaign_task = get_object_or_404(CampaignTask, campaign_task_id=pk)
        
        serializer = LaunchRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            result = CampaignService.launch_campaign(
                campaign_task=campaign_task,
                override_config=serializer.validated_data.get('override'),
                dry_run=serializer.validated_data.get('dry_run', False)
            )
            return Response(result, status=status.HTTP_202_ACCEPTED)
            
        except ValueError as e:
            return Response(
                {'error': str(e), 'code': 'CONFLICT'},
                status=status.HTTP_409_CONFLICT
            )
        except Exception as e:
            return Response(
                {'error': str(e), 'code': 'UNKNOWN'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CampaignTaskPauseView(APIView):
    """
    View for pausing campaign task.
    
    PATCH /campaigns/tasks/{id}/pause/
    """
    permission_classes = [CampaignPermission]
    
    def patch(self, request, pk):
        """Pause campaign task"""
        campaign_task = get_object_or_404(CampaignTask, campaign_task_id=pk)
        
        serializer = PauseResumeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        action = serializer.validated_data['action']
        reason = serializer.validated_data.get('reason')
        
        if action != 'pause':
            return Response(
                {'error': 'Only pause action is supported', 'code': 'BAD_REQUEST'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            CampaignService.pause_campaign(
                campaign_task=campaign_task,
                reason=reason,
                actor_user=request.user
            )
            
            response_serializer = CampaignTaskSerializer(campaign_task)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
            
        except ValueError as e:
            return Response(
                {'error': str(e), 'code': 'CONFLICT'},
                status=status.HTTP_409_CONFLICT
            )
        except Exception as e:
            return Response(
                {'error': str(e), 'code': 'UNKNOWN'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExecutionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing execution logs.
    
    GET /campaigns/tasks/{id}/logs/
    """
    serializer_class = ExecutionLogSerializer
    permission_classes = [CampaignPermission]
    pagination_class = CampaignTaskPagination
    
    def get_queryset(self):
        """Get logs for a specific campaign task"""
        campaign_task_id = self.kwargs.get('pk')
        return ExecutionLog.objects.filter(
            campaign_task_id=campaign_task_id
        ).order_by('-timestamp')
    
    def list(self, request, *args, **kwargs):
        """List execution logs with pagination"""
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'items': serializer.data,
            'page': 1,
            'page_size': len(serializer.data),
            'total': len(serializer.data)
        })


class CampaignTaskExternalStatusView(APIView):
    """
    View for getting external platform status.
    
    GET /campaigns/tasks/{id}/external-status/
    """
    permission_classes = [CampaignPermission]
    
    def get(self, request, pk):
        """Get external platform status"""
        campaign_task = get_object_or_404(CampaignTask, campaign_task_id=pk)
        
        try:
            status_data = CampaignService.get_external_status(campaign_task)
            serializer = ExternalStatusSerializer(status_data)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e), 'code': 'UNKNOWN'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ROIAlertTriggerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ROI alert triggers.
    
    POST /campaigns/alerts/roi/ - Create/Update ROI alert
    """
    queryset = ROIAlertTrigger.objects.all()
    serializer_class = ROIAlertTriggerSerializer
    permission_classes = [CampaignPermission]
    lookup_field = 'roi_alert_trigger_id'
    
    def get_serializer_class(self):
        """Use upsert serializer for create"""
        if self.action == 'create':
            return ROIAlertTriggerUpsertSerializer
        return ROIAlertTriggerSerializer
    
    def create(self, request, *args, **kwargs):
        """Create or update ROI alert trigger"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            instance = serializer.save()
            response_serializer = ROIAlertTriggerSerializer(instance)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e), 'code': 'UNKNOWN'},
                status=status.HTTP_400_BAD_REQUEST
            )

