from celery import shared_task
from django.db import transaction
from .models import CampaignTask, ChannelConfig, ROIAlertTrigger
from .executors import get_executor
from .services import _log, _ws

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
    if c.status not in ("InProgress", "launched", "Paused"):
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


            if trig.action == "AutoPause" and c.status in ("InProgress", "launched"):
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

    poll_campaign_status.apply_async(kwargs={"campaign_id": campaign_id}, countdown=15)
