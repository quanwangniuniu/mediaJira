"""
Celery tasks for campaign execution
Handles async launch, polling, pause operations
"""
from typing import Dict, Any, Optional
from django.utils import timezone
from celery import shared_task
from celery.utils.log import get_task_logger

from .models import (
    CampaignTask, ExecutionLog, ChannelConfig,
    CampaignTaskStatus, OperationEvent, OperationResult, MetricKey, Comparator, AlertAction
)
from .executors import get_executor
from .services import CampaignService

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def launch_campaign_task(self, campaign_task_id: str, override_config: Optional[Dict[str, Any]] = None, 
                        dry_run: bool = False) -> Dict[str, Any]:
    """
    Async task to launch campaign on external platform.
    
    Args:
        campaign_task_id: UUID of CampaignTask
        override_config: Optional override configuration
        dry_run: Whether this is a dry run
        
    Returns:
        Dict with success status and details
    """
    try:
        logger.info(f"Starting launch task for campaign {campaign_task_id} (dry_run={dry_run})")
        
        campaign_task = CampaignTask.objects.get(campaign_task_id=campaign_task_id)
        
        # Validate status
        if campaign_task.status != CampaignTaskStatus.SCHEDULED:
            error_msg = f"Cannot launch campaign in status: {campaign_task.status}"
            logger.error(error_msg)
            CampaignService.log_execution_event(
                campaign_task=campaign_task,
                event=OperationEvent.LAUNCH,
                result=OperationResult.ERROR,
                message=error_msg
            )
            return {'success': False, 'error': error_msg}
        
        if dry_run:
            logger.info(f"Dry run mode - skipping actual launch for campaign {campaign_task_id}")
            return {
                'success': True,
                'dry_run': True,
                'message': 'Dry run completed successfully'
            }
        
        # Get channel config (if available)
        channel_config = None
        try:
            # TODO: Get from user's team in real implementation
            channel_config = {}
        except Exception:
            pass
        
        # Get executor and validate config
        executor = get_executor(campaign_task.channel, channel_config=channel_config)
        executor.validate_config(campaign_task.audience_config)
        
        # Apply override config if provided
        final_audience_config = override_config.get('audience_config', campaign_task.audience_config) if override_config else campaign_task.audience_config
        
        # Launch on external platform
        result = executor.launch(campaign_task)
        
        if result['success']:
            # Update campaign task status
            campaign_task.launch()
            
            # Update external IDs
            if 'external_ids' in result:
                campaign_task.external_ids_json = result['external_ids']
            
            campaign_task.save()
            
            # Log success
            CampaignService.log_execution_event(
                campaign_task=campaign_task,
                event=OperationEvent.LAUNCH,
                result=OperationResult.SUCCESS,
                message=result.get('message', 'Campaign launched successfully'),
                channel_response=result.get('external_ids', {})
            )
            
            # Send WebSocket event
            _send_websocket_event(campaign_task, 'statusUpdate', {
                'task_id': str(campaign_task.campaign_task_id),
                'status': campaign_task.status,
                'platform_status': campaign_task.platform_status,
                'updated_at': campaign_task.updated_at.isoformat()
            })
            
            logger.info(f"Successfully launched campaign {campaign_task_id}")
            return {
                'success': True,
                'campaign_task_id': str(campaign_task_id),
                'external_ids': result.get('external_ids', {})
            }
        else:
            # Log error
            error_msg = result.get('error', 'Launch failed')
            CampaignService.log_execution_event(
                campaign_task=campaign_task,
                event=OperationEvent.LAUNCH,
                result=OperationResult.ERROR,
                message=error_msg,
                channel_response=result
            )
            
            # Mark as failed
            campaign_task.fail()
            campaign_task.save()
            
            # Send WebSocket event
            _send_websocket_event(campaign_task, 'channelError', {
                'task_id': str(campaign_task.campaign_task_id),
                'code': 'PLATFORM_REJECTED',
                'message': error_msg,
                'at': timezone.now().isoformat()
            })
            
            logger.error(f"Failed to launch campaign {campaign_task_id}: {error_msg}")
            return {'success': False, 'error': error_msg}
            
    except CampaignTask.DoesNotExist:
        error_msg = f"Campaign task {campaign_task_id} not found"
        logger.error(error_msg)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=Exception(error_msg))
        return {'success': False, 'error': error_msg}
        
    except Exception as exc:
        error_msg = f"Error launching campaign {campaign_task_id}: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        
        try:
            campaign_task = CampaignTask.objects.get(campaign_task_id=campaign_task_id)
            CampaignService.log_execution_event(
                campaign_task=campaign_task,
                event=OperationEvent.LAUNCH,
                result=OperationResult.ERROR,
                message=error_msg
            )
            campaign_task.fail()
            campaign_task.save()
        except Exception:
            pass
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {'success': False, 'error': error_msg}


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def poll_campaign_status(self, campaign_task_id: str) -> Dict[str, Any]:
    """
    Periodic task to poll campaign status from external platform.
    
    Args:
        campaign_task_id: UUID of CampaignTask
        
    Returns:
        Dict with status information
    """
    try:
        campaign_task = CampaignTask.objects.get(campaign_task_id=campaign_task_id)
        
        # Only poll if campaign is active
        if campaign_task.status not in [CampaignTaskStatus.LAUNCHED, CampaignTaskStatus.PAUSED]:
            logger.debug(f"Skipping status poll for campaign {campaign_task_id} in status {campaign_task.status}")
            return {'success': True, 'skipped': True}
        
        # Get executor
        channel_config = None
        executor = get_executor(campaign_task.channel, channel_config=channel_config)
        
        # Poll status
        result = executor.get_status(campaign_task)
        
        if result['success']:
            # Update platform status
            if 'platform_status' in result:
                old_status = campaign_task.platform_status
                campaign_task.platform_status = result['platform_status']
                campaign_task.save(update_fields=['platform_status'])
                
                # Send WebSocket event if status changed
                if old_status != campaign_task.platform_status:
                    _send_websocket_event(campaign_task, 'statusUpdate', {
                        'task_id': str(campaign_task.campaign_task_id),
                        'status': campaign_task.status,
                        'platform_status': campaign_task.platform_status,
                        'updated_at': campaign_task.updated_at.isoformat()
                    })
            
            # Log metric ingest
            CampaignService.log_execution_event(
                campaign_task=campaign_task,
                event=OperationEvent.METRIC_INGEST,
                result=OperationResult.SUCCESS,
                details=result.get('raw', {})
            )
            
            return {
                'success': True,
                'platform_status': result.get('platform_status'),
                'raw': result.get('raw')
            }
        else:
            logger.warning(f"Failed to poll status for campaign {campaign_task_id}: {result.get('error')}")
            return {'success': False, 'error': result.get('error')}
            
    except CampaignTask.DoesNotExist:
        logger.error(f"Campaign task {campaign_task_id} not found for status polling")
        return {'success': False, 'error': 'Campaign task not found'}
        
    except Exception as exc:
        error_msg = f"Error polling status for campaign {campaign_task_id}: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {'success': False, 'error': error_msg}


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def pause_campaign_task(self, campaign_task_id: str, reason: Optional[str] = None) -> Dict[str, Any]:
    """
    Async task to pause campaign on external platform.
    
    Args:
        campaign_task_id: UUID of CampaignTask
        reason: Optional reason for pausing
        
    Returns:
        Dict with success status
    """
    try:
        logger.info(f"Pausing campaign {campaign_task_id}")
        
        campaign_task = CampaignTask.objects.get(campaign_task_id=campaign_task_id)
        
        # Get executor
        channel_config = None
        executor = get_executor(campaign_task.channel, channel_config=channel_config)
        
        # Pause on external platform
        result = executor.pause(campaign_task)
        
        if result['success']:
            # Log event (status already updated by service layer)
            CampaignService.log_execution_event(
                campaign_task=campaign_task,
                event=OperationEvent.PAUSE,
                result=OperationResult.SUCCESS,
                message=result.get('message', 'Campaign paused')
            )
            
            # Send WebSocket event
            _send_websocket_event(campaign_task, 'statusUpdate', {
                'task_id': str(campaign_task.campaign_task_id),
                'status': campaign_task.status,
                'platform_status': campaign_task.platform_status,
                'updated_at': campaign_task.updated_at.isoformat()
            })
            
            return {'success': True, 'message': result.get('message')}
        else:
            error_msg = result.get('error', 'Pause failed')
            CampaignService.log_execution_event(
                campaign_task=campaign_task,
                event=OperationEvent.PAUSE,
                result=OperationResult.ERROR,
                message=error_msg
            )
            return {'success': False, 'error': error_msg}
            
    except CampaignTask.DoesNotExist:
        error_msg = f"Campaign task {campaign_task_id} not found"
        logger.error(error_msg)
        return {'success': False, 'error': error_msg}
        
    except Exception as exc:
        error_msg = f"Error pausing campaign {campaign_task_id}: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {'success': False, 'error': error_msg}


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def check_roi_alerts(self, campaign_task_id: str) -> Dict[str, Any]:
    """
    Check ROI alerts for a campaign.
    
    Args:
        campaign_task_id: UUID of CampaignTask
        
    Returns:
        Dict with alert check results
    """
    try:
        from .models import ROIAlertTrigger
        
        campaign_task = CampaignTask.objects.get(campaign_task_id=campaign_task_id)
        
        # Only check alerts for active campaigns
        if campaign_task.status not in [CampaignTaskStatus.LAUNCHED, CampaignTaskStatus.PAUSED]:
            logger.debug(f"Skipping ROI alert check for campaign {campaign_task_id} in status {campaign_task.status}")
            return {'success': True, 'skipped': True, 'reason': 'Campaign not active'}
        
        # Get active ROIAlertTrigger instances
        active_alerts = ROIAlertTrigger.objects.filter(
            campaign_task=campaign_task,
            is_active=True
        )
        
        if not active_alerts.exists():
            logger.debug(f"No active ROI alerts for campaign {campaign_task_id}")
            return {'success': True, 'alerts_checked': 0}
        
        # Get metrics from executor
        channel_config = None
        executor = get_executor(campaign_task.channel, channel_config=channel_config)
        status_result = executor.get_status(campaign_task)
        
        if not status_result.get('success') or 'raw' not in status_result:
            logger.warning(f"Could not get metrics for ROI check: {status_result.get('error')}")
            return {'success': False, 'error': 'Could not fetch metrics'}
        
        raw_stats = status_result.get('raw', {}).get('stats', {})
        if not raw_stats:
            logger.warning(f"No stats available for ROI check for campaign {campaign_task_id}")
            return {'success': True, 'alerts_checked': 0, 'message': 'No stats available'}
        
        # Calculate metrics from raw stats
        metrics = _calculate_metrics_from_stats(raw_stats)
        
        # Check each alert
        triggered_count = 0
        for alert in active_alerts:
            # alert.metric_key is a string (e.g., 'roas'), metrics dict uses MetricKey enum values as keys
            # Convert to match: MetricKey.CTR returns 'ctr' (first element of tuple)
            metric_key_str = alert.metric_key  # Already a string from database
            metric_value = metrics.get(metric_key_str)
            
            if metric_value is None:
                logger.warning(f"Metric {alert.metric_key} not available for alert {alert.roi_alert_trigger_id}")
                continue
            
            # Check threshold
            should_trigger = _check_threshold(metric_value, alert.comparator, alert.threshold)
            
            if should_trigger:
                triggered_count += 1
                logger.info(f"ROI alert triggered for campaign {campaign_task_id}: {alert.metric_key} {alert.comparator} {alert.threshold} (value: {metric_value})")
                
                # Execute action
                if alert.action == AlertAction.AUTO_PAUSE:
                    # Auto-pause the campaign
                    try:
                        if campaign_task.status == CampaignTaskStatus.LAUNCHED:
                            CampaignService.pause_campaign(
                                campaign_task=campaign_task,
                                reason=f"ROI alert: {alert.metric_key} {alert.comparator} {alert.threshold} (current: {metric_value})",
                                actor_user=None  # System action
                            )
                            logger.info(f"Auto-paused campaign {campaign_task_id} due to ROI alert")
                    except Exception as e:
                        logger.error(f"Failed to auto-pause campaign {campaign_task_id}: {str(e)}")
                
                # Log alert trigger event
                CampaignService.log_execution_event(
                    campaign_task=campaign_task,
                    event=OperationEvent.ALERT_TRIGGER,
                    result=OperationResult.SUCCESS,
                    message=f"ROI alert triggered: {alert.metric_key} {alert.comparator} {alert.threshold} (value: {metric_value})",
                    details={
                        'alert_id': str(alert.roi_alert_trigger_id),
                        'metric_key': alert.metric_key,
                        'metric_value': metric_value,
                        'threshold': alert.threshold,
                        'comparator': alert.comparator,
                        'action': alert.action,
                    }
                )
                
                # Send WebSocket event
                _send_websocket_event(campaign_task, 'roiDrop', {
                    'task_id': str(campaign_task.campaign_task_id),
                    'metric_key': alert.metric_key,
                    'value': metric_value,
                    'threshold': alert.threshold,
                    'lookback_minutes': alert.lookback_minutes,
                    'action_taken': alert.action,
                    'at': timezone.now().isoformat()
                })
        
        return {
            'success': True,
            'alerts_checked': active_alerts.count(),
            'alerts_triggered': triggered_count
        }
        
    except CampaignTask.DoesNotExist:
        return {'success': False, 'error': 'Campaign task not found'}
        
    except Exception as exc:
        error_msg = f"Error checking ROI alerts for campaign {campaign_task_id}: {str(exc)}"
        logger.error(error_msg, exc_info=True)
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {'success': False, 'error': error_msg}


def _calculate_metrics_from_stats(stats: Dict[str, Any]) -> Dict[str, float]:
    """
    Calculate normalized metrics from raw platform stats.
    
    Args:
        stats: Raw stats dict from executor
        
    Returns:
        Dict with metric keys (strings) and calculated values
    """
    metrics = {}
    
    # Extract basic stats (names may vary by platform)
    impressions = stats.get('impressions', stats.get('impression', 0))
    clicks = stats.get('clicks', stats.get('click', 0))
    cost = stats.get('cost', stats.get('spend', stats.get('amount_spent', 0)))
    conversions = stats.get('conversions', stats.get('conversion', 0))
    revenue = stats.get('revenue', stats.get('value', 0))
    
    # Calculate CTR (use string values to match database storage)
    # MetricKey.CTR is a TextChoices enum tuple ('ctr', 'CTR'), use first element as string key
    if impressions > 0:
        metrics[MetricKey.CTR] = (clicks / impressions) * 100  # Percentage
    
    # Calculate CPC
    if clicks > 0:
        metrics[MetricKey.CPC] = cost / clicks
    
    # Calculate CPA (if conversions available)
    if conversions > 0:
        metrics[MetricKey.CPA] = cost / conversions
    
    # Calculate ROAS (if revenue available)
    if revenue > 0 and cost > 0:
        metrics[MetricKey.ROAS] = revenue / cost
        # Calculate ROI (ROAS - 1)
        metrics[MetricKey.ROI] = (revenue - cost) / cost
    elif cost > 0:
        # For mock scenarios without revenue, use cost-based estimates
        # This is a simplified calculation for development
        # Mock ROAS/ROI calculation (in production, would come from platform)
        mock_revenue = cost * 2.0  # Assume 2x ROAS for mock
        metrics[MetricKey.ROAS] = mock_revenue / cost
        metrics[MetricKey.ROI] = (mock_revenue - cost) / cost
    
    # Convert keys from TextChoices tuples to strings to match database values
    # TextChoices uses tuples as keys, but database stores strings
    metrics_str_keys = {}
    for key, value in metrics.items():
        # key is a tuple like ('roas', 'ROAS'), extract first element
        if isinstance(key, tuple):
            metrics_str_keys[key[0]] = value
        else:
            metrics_str_keys[key] = value
    
    return metrics_str_keys


def _check_threshold(value: float, comparator: str, threshold: float) -> bool:
    """
    Check if value meets threshold condition.
    
    Args:
        value: Current metric value
        comparator: Comparison operator (<, <=, >, >=, =)
        threshold: Threshold value
        
    Returns:
        bool: True if condition is met
    """
    if comparator == Comparator.LT:
        return value < threshold
    elif comparator == Comparator.LTE:
        return value <= threshold
    elif comparator == Comparator.GT:
        return value > threshold
    elif comparator == Comparator.GTE:
        return value >= threshold
    elif comparator == Comparator.EQ:
        return abs(value - threshold) < 0.0001  # Float comparison with epsilon
    else:
        return False


def _send_websocket_event(campaign_task: CampaignTask, event_type: str, payload: Dict[str, Any]) -> None:
    """
    Send WebSocket event to campaign group.
    
    Args:
        campaign_task: CampaignTask instance
        event_type: Event type (statusUpdate, roiDrop, channelError)
        payload: Event payload
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        channel_layer = get_channel_layer()
        if channel_layer:
            group_name = f"campaign_{campaign_task.campaign_task_id}"
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': event_type,
                    'payload': payload
                }
            )
    except Exception as e:
        logger.warning(f"Failed to send WebSocket event: {str(e)}")

