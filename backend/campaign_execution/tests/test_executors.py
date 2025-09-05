import pytest
from apps.campaign_execution.executors import get_executor

@pytest.mark.parametrize("channel", ["google", "facebook"])
def test_launch_and_status_normalization(channel, requests_mock):
    base = "http://mock"
    if channel == "google":
        requests_mock.post(f"{base}/campaigns", json={"campaignId":"g-123","accountId":"acc-g"})
        requests_mock.get(f"{base}/campaigns/g-123/status", json={"state":"ENABLED","spend":12.5,"roi":1.8})
    else:
        requests_mock.post(f"{base}/campaigns", json={"id":"f-999","account":"acc-f"})
        requests_mock.get(f"{base}/campaigns/f-999/status", json={"status":"ACTIVE","spent":1250,"roi":1.8})
    exec_ = get_executor(channel, {"auth_token":"mock", "settings":{"base_url":base}})
    ids = exec_.launch({"title":"t","audience":{},"creatives":[]})
    st = exec_.normalize_status(exec_.get_status(ids))
    assert "campaignId" in ids or "id" in ids  # depends on concrete mapping
    assert st["state"] in ("RUNNING","PAUSED","COMPLETED","FAILED")
    assert isinstance(st.get("spend",0), (int,float))
