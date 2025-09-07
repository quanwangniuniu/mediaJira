from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from .models import CampaignTask, ChannelConfig, ExecutionLog, ROIAlertTrigger
from .serializers import (
    CampaignTaskSerializer, ChannelConfigSerializer, 
    ExecutionLogSerializer, ROIAlertTriggerSerializer
)
from .permissions import CampaignExecutionPermission, ReadOnlyPermission
from .services import launch_campaign, pause_campaign
from .tasks import poll_campaign_status
from .executors import get_executor


class CampaignTaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing campaign tasks.
    """
    queryset = CampaignTask.objects.all()
    serializer_class = CampaignTaskSerializer
    permission_classes = [IsAuthenticated, CampaignExecutionPermission]
    
    def get_queryset(self):
        # Filter campaigns by user's team or created by user
        user = self.request.user
        if hasattr(user, 'team'):
            return CampaignTask.objects.filter(created_by__team=user.team)
        return CampaignTask.objects.filter(created_by=user)
    
    @action(detail=True, methods=['post'])
    def launch(self, request, pk=None):
        """Launch a campaign task."""
        campaign = self.get_object()
        
        if campaign.status != 'scheduled':
            return Response(
                {'error': 'Campaign can only be launched from scheduled status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            launch_campaign(campaign.pk, actor=request.user)
            # Start polling for status updates
            poll_campaign_status.apply_async(kwargs={'campaign_id': campaign.pk}, countdown=5)
            
            return Response({'message': 'Campaign launched successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a campaign task."""
        campaign = self.get_object()
        
        if campaign.status != 'launched':
            return Response(
                {'error': 'Campaign can only be paused from launched status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        
        try:
            pause_campaign(campaign.pk, actor=request.user, reason=reason)
            return Response({'message': 'Campaign paused successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a paused campaign task."""
        campaign = self.get_object()
        
        if campaign.status != 'paused':
            return Response(
                {'error': 'Campaign can only be resumed from paused status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                campaign = CampaignTask.objects.select_for_update().get(pk=campaign.pk)
                cfg = ChannelConfig.objects.get(team=campaign.created_by.team, channel=campaign.channel)
                exec_ = get_executor(campaign.channel, {
                    "auth_token": cfg.auth_token,
                    "settings": cfg.settings_json
                })
                
                # Resume the campaign on the platform
                exec_.resume(campaign.external_ids_json)
                campaign.mark_resumed()
                campaign.platform_status = "LAUNCHED"
                campaign.paused_reason = None
                campaign.save()
                
                # Log the resume action
                from .services import _log, _ws
                _log(campaign, "Resume", actor=request.user)
                _ws(f"campaign_{campaign.pk}", "statusChanged", {
                    "status": campaign.status, 
                    "platformStatus": campaign.platform_status
                })
                
                # Restart polling
                poll_campaign_status.apply_async(kwargs={'campaign_id': campaign.pk}, countdown=5)
            
            return Response({'message': 'Campaign resumed successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get current campaign status and metrics."""
        campaign = self.get_object()
        
        try:
            cfg = ChannelConfig.objects.get(team=campaign.created_by.team, channel=campaign.channel)
            exec_ = get_executor(campaign.channel, {
                "auth_token": cfg.auth_token,
                "settings": cfg.settings_json
            })
            
            status_data = exec_.get_status(campaign.external_ids_json)
            normalized_status = exec_.normalize_status(status_data)
            
            return Response({
                'campaign_id': campaign.pk,
                'status': campaign.status,
                'platform_status': campaign.platform_status,
                'metrics': normalized_status,
                'last_updated': campaign.updated_at
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ChannelConfigViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing channel configurations.
    """
    queryset = ChannelConfig.objects.all()
    serializer_class = ChannelConfigSerializer
    permission_classes = [IsAuthenticated, CampaignExecutionPermission]
    
    def get_queryset(self):
        # Filter by user's team
        user = self.request.user
        if hasattr(user, 'team'):
            return ChannelConfig.objects.filter(team=user.team)
        return ChannelConfig.objects.none()


class ExecutionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for viewing execution logs.
    """
    queryset = ExecutionLog.objects.all()
    serializer_class = ExecutionLogSerializer
    permission_classes = [IsAuthenticated, ReadOnlyPermission]
    
    def get_queryset(self):
        # Filter by user's team campaigns
        user = self.request.user
        if hasattr(user, 'team'):
            return ExecutionLog.objects.filter(campaign_task__created_by__team=user.team)
        return ExecutionLog.objects.filter(campaign_task__created_by=user)


class ROIAlertTriggerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ROI alert triggers.
    """
    queryset = ROIAlertTrigger.objects.all()
    serializer_class = ROIAlertTriggerSerializer
    permission_classes = [IsAuthenticated, CampaignExecutionPermission]
    
    def get_queryset(self):
        # Filter by user's team campaigns
        user = self.request.user
        if hasattr(user, 'team'):
            return ROIAlertTrigger.objects.filter(campaign_task__created_by__team=user.team)
        return ROIAlertTrigger.objects.filter(campaign_task__created_by=user)


# Function-based views for direct API access
def launch_campaign_view(request, campaign_id):
    """Direct API endpoint for launching campaigns."""
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.response import Response
    from rest_framework import status
    
    @api_view(['POST'])
    @permission_classes([IsAuthenticated, CampaignExecutionPermission])
    def _launch(request, campaign_id):
        campaign = get_object_or_404(CampaignTask, pk=campaign_id)
        
        if campaign.status != 'scheduled':
            return Response(
                {'error': 'Campaign can only be launched from scheduled status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            launch_campaign(campaign.pk, actor=request.user)
            poll_campaign_status.apply_async(kwargs={'campaign_id': campaign.pk}, countdown=5)
            return Response({'message': 'Campaign launched successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return _launch(request, campaign_id)


def pause_campaign_view(request, campaign_id):
    """Direct API endpoint for pausing campaigns."""
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.response import Response
    from rest_framework import status
    
    @api_view(['POST'])
    @permission_classes([IsAuthenticated, CampaignExecutionPermission])
    def _pause(request, campaign_id):
        campaign = get_object_or_404(CampaignTask, pk=campaign_id)
        
        if campaign.status != 'launched':
            return Response(
                {'error': 'Campaign can only be paused from launched status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        
        try:
            pause_campaign(campaign.pk, actor=request.user, reason=reason)
            return Response({'message': 'Campaign paused successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return _pause(request, campaign_id)


def resume_campaign_view(request, campaign_id):
    """Direct API endpoint for resuming campaigns."""
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.response import Response
    from rest_framework import status
    
    @api_view(['POST'])
    @permission_classes([IsAuthenticated, CampaignExecutionPermission])
    def _resume(request, campaign_id):
        campaign = get_object_or_404(CampaignTask, pk=campaign_id)
        
        if campaign.status != 'paused':
            return Response(
                {'error': 'Campaign can only be resumed from paused status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                campaign = CampaignTask.objects.select_for_update().get(pk=campaign.pk)
                cfg = ChannelConfig.objects.get(team=campaign.created_by.team, channel=campaign.channel)
                exec_ = get_executor(campaign.channel, {
                    "auth_token": cfg.auth_token,
                    "settings": cfg.settings_json
                })
                
                exec_.resume(campaign.external_ids_json)
                campaign.mark_resumed()
                campaign.platform_status = "LAUNCHED"
                campaign.paused_reason = None
                campaign.save()
                
                from .services import _log, _ws
                _log(campaign, "Resume", actor=request.user)
                _ws(f"campaign_{campaign.pk}", "statusChanged", {
                    "status": campaign.status, 
                    "platformStatus": campaign.platform_status
                })
                
                poll_campaign_status.apply_async(kwargs={'campaign_id': campaign.pk}, countdown=5)
            
            return Response({'message': 'Campaign resumed successfully'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return _resume(request, campaign_id)


def get_campaign_status_view(request, campaign_id):
    """Direct API endpoint for getting campaign status."""
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.response import Response
    from rest_framework import status
    
    @api_view(['GET'])
    @permission_classes([IsAuthenticated, ReadOnlyPermission])
    def _status(request, campaign_id):
        campaign = get_object_or_404(CampaignTask, pk=campaign_id)
        
        try:
            cfg = ChannelConfig.objects.get(team=campaign.created_by.team, channel=campaign.channel)
            exec_ = get_executor(campaign.channel, {
                "auth_token": cfg.auth_token,
                "settings": cfg.settings_json
            })
            
            status_data = exec_.get_status(campaign.external_ids_json)
            normalized_status = exec_.normalize_status(status_data)
            
            return Response({
                'campaign_id': campaign.pk,
                'status': campaign.status,
                'platform_status': campaign.platform_status,
                'metrics': normalized_status,
                'last_updated': campaign.updated_at
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    return _status(request, campaign_id)
