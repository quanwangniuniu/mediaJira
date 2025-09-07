from celery import shared_task
from django.db import transaction
from .models import CampaignTask, ChannelConfig, ROIAlertTrigger
from .executors import get_executor
from .services import _log, _ws, launch_campaign

def _compare(value, op: str, threshold) -> bool:
    # value / threshold 可能是 Decimal/float，统一 float
    try:
        v = float(value)
        t = float(threshold)
    except Exception:
        return False
    return {
        "<":  lambda a,b: a <  b,
        "<=": lambda a,b: a <= b,
        ">":  lambda a,b: a >  b,
        ">=": lambda a,b: a >= b,
        "=":  lambda a,b: a == b,
    }.get(op, lambda *_: False)(v, t)

@shared_task
def poll_campaign_status(campaign_id: int):
    c = CampaignTask.objects.get(pk=campaign_id)
    if c.status not in ("launched", "paused"):
        return

    cfg = ChannelConfig.objects.get(team=c.created_by.team, channel=c.channel)
    exec_ = get_executor(c.channel, {"auth_token": cfg.auth_token, "settings": cfg.settings_json})

    st = exec_.normalize_status(exec_.get_status(c.external_ids_json))
    c.platform_status = st.get("state")
    c.save()

    _log(c, "MetricIngest", details=st, channel_resp=st.get("native"))
    _ws(f"campaign_{c.pk}", "statusChanged",
        {"status": c.status, "platformStatus": c.platform_status, "metrics": st})

   
    triggers = ROIAlertTrigger.objects.filter(campaign_task=c, is_active=True)
    for trig in triggers:
        metric_val = st.get(trig.metric_key)  # 支持 roi/roas/cpa/ctr/cpc 等
        if metric_val is None:
            continue
        if _compare(metric_val, trig.comparator, trig.threshold):

            _log(c, "AlertTrigger",
                 message=f"{trig.metric_key} {trig.comparator} {trig.threshold}",
                 details={"metric": trig.metric_key, "value": metric_val, "op": trig.comparator,
                          "threshold": float(trig.threshold), "lookback_minutes": trig.lookback_minutes})
            _ws(f"campaign_{c.pk}", "roiAlert",
                {"metric": trig.metric_key, "value": metric_val,
                 "op": trig.comparator, "threshold": float(trig.threshold)})


            if trig.action == "AutoPause" and c.status == "launched":
                with transaction.atomic():
                    c = CampaignTask.objects.select_for_update().get(pk=campaign_id)
                
                    exec_.pause(c.external_ids_json)
                    c.paused_reason = f"AutoPause: {trig.metric_key} {trig.comparator} {trig.threshold}"
                    if hasattr(c, "mark_paused"):
                        c.mark_paused()
                    c.platform_status = "PAUSED"
                    c.save()
                    _log(c, "Pause", message=c.paused_reason)
                    _ws(f"campaign_{c.pk}", "statusChanged",
                        {"status": c.status, "platformStatus": c.platform_status})

    if st.get("state") in ("COMPLETED", "ENDED"):
        if hasattr(c, "mark_completed"):
            c.mark_completed(); c.save()
        _log(c, "Complete")
        return
    if st.get("state") in ("FAILED", "ERROR"):
        if hasattr(c, "mark_failed"):
            c.mark_failed(); c.save()
        _log(c, "Fail", result="Error")
        return

    # Schedule next poll
    poll_campaign_status.apply_async(kwargs={"campaign_id": campaign_id}, countdown=15)


@shared_task
def execute_campaign(campaign_id: int, actor_user_id: int = None):
    """
    Main Celery task for executing a campaign.
    This task handles the complete campaign execution flow.
    """
    try:
        campaign = CampaignTask.objects.get(pk=campaign_id)
        
        # Check if campaign is in scheduled state
        if campaign.status != 'scheduled':
            _log(campaign, "Fail", result="Error", 
                 message=f"Cannot execute campaign in {campaign.status} state")
            return
        
        # Get actor user if provided
        actor = None
        if actor_user_id:
            from django.contrib.auth.models import User
            try:
                actor = User.objects.get(pk=actor_user_id)
            except User.DoesNotExist:
                pass
        
        # Launch the campaign
        launch_campaign(campaign_id, actor=actor)
        
        # Start polling for status updates
        poll_campaign_status.apply_async(kwargs={'campaign_id': campaign_id}, countdown=5)
        
        _log(campaign, "Launch", message="Campaign execution started successfully", actor=actor)
        
    except CampaignTask.DoesNotExist:
        # Log error if campaign doesn't exist
        _log(None, "Fail", result="Error", message=f"Campaign {campaign_id} not found")
    except Exception as e:
        # Log any other errors
        try:
            campaign = CampaignTask.objects.get(pk=campaign_id)
            _log(campaign, "Fail", result="Error", message=str(e))
        except:
            pass
        raise


@shared_task
def check_roi_alerts():
    """
    Periodic task to check ROI alerts for all active campaigns.
    This can be run on a schedule to ensure alerts are checked even if polling fails.
    """
    active_campaigns = CampaignTask.objects.filter(
        status__in=['launched', 'paused']
    ).select_related('created_by__team')
    
    for campaign in active_campaigns:
        try:
            # Check if campaign has active ROI triggers
            triggers = ROIAlertTrigger.objects.filter(
                campaign_task=campaign, 
                is_active=True
            )
            
            if not triggers.exists():
                continue
            
            # Get current status and metrics
            cfg = ChannelConfig.objects.get(
                team=campaign.created_by.team, 
                channel=campaign.channel
            )
            exec_ = get_executor(campaign.channel, {
                "auth_token": cfg.auth_token,
                "settings": cfg.settings_json
            })
            
            status_data = exec_.get_status(campaign.external_ids_json)
            normalized_status = exec_.normalize_status(status_data)
            
            # Check each trigger
            for trigger in triggers:
                metric_val = normalized_status.get(trigger.metric_key)
                if metric_val is None:
                    continue
                
                if _compare(metric_val, trigger.comparator, trigger.threshold):
                    _log(campaign, "AlertTrigger",
                         message=f"{trigger.metric_key} {trigger.comparator} {trigger.threshold}",
                         details={
                             "metric": trigger.metric_key, 
                             "value": metric_val, 
                             "op": trigger.comparator,
                             "threshold": float(trigger.threshold), 
                             "lookback_minutes": trigger.lookback_minutes
                         })
                    
                    _ws(f"campaign_{campaign.pk}", "roiAlert", {
                        "metric": trigger.metric_key, 
                        "value": metric_val,
                        "op": trigger.comparator, 
                        "threshold": float(trigger.threshold)
                    })
                    
                    # Auto-pause if configured
                    if trigger.action == "AutoPause" and campaign.status == "launched":
                        with transaction.atomic():
                            campaign = CampaignTask.objects.select_for_update().get(pk=campaign.pk)
                            exec_.pause(campaign.external_ids_json)
                            campaign.paused_reason = f"AutoPause: {trigger.metric_key} {trigger.comparator} {trigger.threshold}"
                            campaign.mark_paused()
                            campaign.platform_status = "PAUSED"
                            campaign.save()
                            
                            _log(campaign, "Pause", message=campaign.paused_reason)
                            _ws(f"campaign_{campaign.pk}", "statusChanged", {
                                "status": campaign.status, 
                                "platformStatus": campaign.platform_status
                            })
        
        except Exception as e:
            # Log error but continue with other campaigns
            _log(campaign, "Fail", result="Error", 
                 message=f"Error checking ROI alerts: {str(e)}")
            continue
