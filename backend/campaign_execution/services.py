from django.db import transaction
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import CampaignTask, ChannelConfig, ExecutionLog
from .executors import get_executor
from .executors.base import LaunchPayload, ExecutorError

def _ws(group, type_, payload):
    async_to_sync(get_channel_layer().group_send)(group, {"type": type_, "payload": payload})

def _log(c, event, result="Success", message="", details=None, channel_resp=None, actor=None):
    ExecutionLog.objects.create(
        campaign_task=c, event=event, result=result, message=message or "",
        details=details or {}, channel_response=channel_resp or {}, actor_user=actor
    )

def launch_campaign(campaign_id: int, actor=None):
    with transaction.atomic():
        c = CampaignTask.objects.select_for_update().get(pk=campaign_id)
        cfg = ChannelConfig.objects.get(team=c.created_by.team, channel=c.channel)
        exec_ = get_executor(c.channel, {
            "auth_token": cfg.auth_token,
            "settings": cfg.settings_json,
            "credentials": {"accountId": cfg.settings_json.get("account_id")}
        })

        try:
            ids = exec_.launch(LaunchPayload(
                title=c.title, audience=c.audience_config, creatives=c.creative_asset_ids
            ))
            c.external_ids_json = ids
            c.mark_launched()
            c.platform_status = "LAUNCHED"
            c.save()

            _log(c, "Launch", details={"stage":"after_launch"}, channel_resp=ids, actor=actor)
            _ws(f"campaign_{c.pk}", "statusChanged", {"status": c.status, "platformStatus": c.platform_status})

        except ExecutorError as e:
            _log(c, "Fail", result="Error", message=str(e))
            _ws(f"campaign_{c.pk}", "executionError", {"error": str(e)})
            raise

def pause_campaign(campaign_id: int, actor=None, reason: str = ""):
    with transaction.atomic():
        c = CampaignTask.objects.select_for_update().get(pk=campaign_id)
        cfg = ChannelConfig.objects.get(team=c.created_by.team, channel=c.channel)
        exec_ = get_executor(c.channel, {"auth_token": cfg.auth_token, "settings": cfg.settings_json})
        resp = exec_.pause(c.external_ids_json)
        c.paused_reason = reason
        c.mark_paused()
        c.platform_status = "PAUSED"
        c.save()
        _log(c, "Pause", details={"reason": reason}, channel_resp=resp, actor=actor)
        _ws(f"campaign_{c.pk}", "statusChanged", {"status": c.status, "platformStatus": c.platform_status})
