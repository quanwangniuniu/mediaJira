from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch, MagicMock
from campaign_execution.models import CampaignTask, ROIAlertTrigger, ChannelConfig
from campaign_execution.tasks import poll_campaign_status

class AlertAutoPauseTest(TestCase):
    def test_autopause_on_low_roi(self):
        c = CampaignTask.objects.create(
            title="t", channel="facebook", scheduled_date=timezone.now(),
            status="launched", created_by_id=1
        )
        ChannelConfig.objects.create(team_id=1, channel="facebook",
                                     auth_token="mock", settings_json={"base_url":"http://mock"})
        ROIAlertTrigger.objects.create(
            campaign_task=c, metric_key="roi", comparator="<", threshold=1.0,
            action="AutoPause", is_active=True
        )

        exec_inst = MagicMock()
        exec_inst.get_status.return_value = {"state":"ACTIVE","roi":0.8,"native":{}}
        exec_inst.normalize_status.side_effect = lambda s: {"state":"RUNNING", **s}
        
        with patch("campaign_execution.tasks.get_executor", return_value=exec_inst):
            poll_campaign_status(c.pk)

        c.refresh_from_db()
        self.assertEqual(c.status, "paused")
