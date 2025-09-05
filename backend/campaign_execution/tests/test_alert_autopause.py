import pytest
from django.utils import timezone
from apps.campaign_execution.models import CampaignTask, ROIAlertTrigger, ChannelConfig
from apps.campaign_execution.tasks import poll_campaign_status

@pytest.mark.django_db
def test_autopause_on_low_roi(mocker):
    c = CampaignTask.objects.create(
        title="t", channel="facebook", scheduled_date=timezone.now(),
        status="InProgress", created_by_id=1
    )
    ChannelConfig.objects.create(team_id=1, channel="facebook",
                                 auth_token="mock", settings_json={"base_url":"http://mock"})
    ROIAlertTrigger.objects.create(
        campaign_task=c, metric_key="roi", comparator="<", threshold=1.0,
        action="AutoPause", is_active=True
    )


    exec_inst = mocker.MagicMock()
    exec_inst.get_status.return_value = {"state":"ACTIVE","roi":0.8,"native":{}}
    exec_inst.normalize_status.side_effect = lambda s: {"state":"RUNNING", **s}
    mocker.patch("apps.campaign_execution.tasks.get_executor", return_value=exec_inst)

    poll_campaign_status(c.pk)

    c.refresh_from_db()
    assert c.status in ("Paused", "Paused".upper(), "PAUSED")
