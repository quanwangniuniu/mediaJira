"""
Business logic services for campaign execution
Handles campaign task creation, launch, pause, and logging
"""
from typing import Dict, Any, Optional
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from core.models import Project

from .models import (
    CampaignTask, ExecutionLog, ChannelConfig,
    CampaignTaskStatus, OperationEvent, OperationResult
)
from .executors import get_executor

User = get_user_model()


class CampaignService:
    """
    Service class for handling campaign execution business logic
    """
    
    @staticmethod
    @transaction.atomic
    def create_campaign_task(data: Dict[str, Any], user: User, project: Optional[Project] = None) -> CampaignTask:
        """
        Create a new campaign task and link it to Task model.
        
        Args:
            data: Campaign task data dict
            user: User creating the task
            project: Optional project (if not provided, will need to be set separately)
            
        Returns:
            Created CampaignTask instance
        """
        from task.models import Task
        
        # Extract fields for CampaignTask
        campaign_task = CampaignTask.objects.create(
            title=data['title'],
            scheduled_date=data['scheduled_date'],
            end_date=data.get('end_date'),
            channel=data['channel'],
            creative_asset_ids=data.get('creative_asset_ids', []),
            audience_config=data['audience_config'],
            status=data.get('status', CampaignTaskStatus.SCHEDULED),
            roi_threshold=data.get('roi_threshold'),
            created_by=user,
            external_ids_json=data.get('external_ids_json'),
        )
        
        # Create and link Task model
        if project:
            task = Task.objects.create(
                summary=campaign_task.title,
                description=f"Campaign task for {campaign_task.channel}",
                owner=user,
                project=project,
                type='execution',
                status=Task.Status.DRAFT,
            )
            task.link_to_object(campaign_task)
            campaign_task.task = task
            campaign_task.save()
        
        # Log creation event
        CampaignService.log_execution_event(
            campaign_task=campaign_task,
            event=OperationEvent.LAUNCH,
            result=OperationResult.SUCCESS,
            actor_user_id=user,
            message='Campaign task created'
        )
        
        return campaign_task
    
    @staticmethod
    def launch_campaign(campaign_task: CampaignTask, override_config: Optional[Dict[str, Any]] = None, 
                       dry_run: bool = False) -> Dict[str, Any]:
        """
        Launch campaign on external platform (triggers async Celery task).
        
        Args:
            campaign_task: CampaignTask instance
            override_config: Optional override configuration
            dry_run: Whether this is a dry run
            
        Returns:
            Dict with operation_id and status
        """
        from .tasks import launch_campaign_task
        
        # Validate campaign task can be launched
        if campaign_task.status != CampaignTaskStatus.SCHEDULED:
            raise ValueError(f"Cannot launch campaign task in status: {campaign_task.status}")
        
        # Trigger async Celery task
        task_result = launch_campaign_task.delay(
            str(campaign_task.campaign_task_id),
            override_config=override_config,
            dry_run=dry_run
        )
        
        return {
            'operation_id': str(task_result.id),
            'status': 'accepted',
            'enqueue_time': timezone.now().isoformat()
        }
    
    @staticmethod
    @transaction.atomic
    def pause_campaign(campaign_task: CampaignTask, reason: Optional[str] = None, 
                      actor_user: Optional[User] = None) -> None:
        """
        Pause campaign and update status.
        
        Args:
            campaign_task: CampaignTask instance
            reason: Optional reason for pausing
            actor_user: User triggering the pause
        """
        from .tasks import pause_campaign_task
        
        if campaign_task.status != CampaignTaskStatus.LAUNCHED:
            raise ValueError(f"Cannot pause campaign task in status: {campaign_task.status}")
        
        # Update status (FSM transition)
        campaign_task.pause(reason=reason)
        campaign_task.save()
        
        # Trigger async executor
        pause_campaign_task.delay(str(campaign_task.campaign_task_id), reason=reason)
        
        # Log event
        CampaignService.log_execution_event(
            campaign_task=campaign_task,
            event=OperationEvent.PAUSE,
            result=OperationResult.SUCCESS,
            actor_user_id=actor_user,
            message=f'Campaign paused: {reason or "No reason provided"}'
        )
    
    @staticmethod
    def get_external_status(campaign_task: CampaignTask) -> Dict[str, Any]:
        """
        Get current status from external platform.
        
        Args:
            campaign_task: CampaignTask instance
            
        Returns:
            Dict with platform status information
        """
        # Get channel config (if available)
        channel_config = None
        try:
            # Try to get channel config from team (if available)
            # For now, use empty dict - in real implementation, fetch from user's team
            channel_config = {}
        except Exception:
            pass
        
        # Get executor
        executor = get_executor(campaign_task.channel, channel_config=channel_config)
        
        # Query executor for status
        result = executor.get_status(campaign_task)
        
        if result['success']:
            # Update platform_status if provided
            if 'platform_status' in result:
                campaign_task.platform_status = result['platform_status']
                campaign_task.save(update_fields=['platform_status'])
        
        return {
            'task_id': str(campaign_task.campaign_task_id),
            'channel': campaign_task.channel,
            'native_status': result.get('platform_status'),
            'platform_status': result.get('platform_status'),
            'synced_at': timezone.now().isoformat(),
            'raw': result.get('raw'),
        }
    
    @staticmethod
    def log_execution_event(
        campaign_task: CampaignTask,
        event: OperationEvent,
        result: OperationResult,
        actor_user_id: Optional[User] = None,
        message: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        channel_response: Optional[Dict[str, Any]] = None
    ) -> ExecutionLog:
        """
        Create an execution log entry.
        
        Args:
            campaign_task: CampaignTask instance
            event: Operation event type
            result: Operation result
            actor_user_id: User who triggered the action
            message: Optional message
            details: Optional details dict
            channel_response: Optional raw platform response
            
        Returns:
            Created ExecutionLog instance
        """
        log = ExecutionLog.objects.create(
            campaign_task=campaign_task,
            event=event,
            actor_user_id=actor_user_id,
            timestamp=timezone.now(),
            result=result,
            message=message,
            details=details or {},
            channel_response=channel_response or {}
        )
        
        return log
    
    @staticmethod
    def archive_campaign(campaign_task: CampaignTask, actor_user: Optional[User] = None) -> None:
        """
        Archive campaign task.
        
        Args:
            campaign_task: CampaignTask instance
            actor_user: User triggering the archive
        """
        if campaign_task.status not in [
            CampaignTaskStatus.COMPLETED,
            CampaignTaskStatus.FAILED
        ]:
            raise ValueError(f"Cannot archive campaign task in status: {campaign_task.status}")
        
        campaign_task.archive()
        campaign_task.save()
        
        # Log event
        CampaignService.log_execution_event(
            campaign_task=campaign_task,
            event=OperationEvent.ADJUST,
            result=OperationResult.SUCCESS,
            actor_user_id=actor_user,
            message='Campaign archived'
        )

