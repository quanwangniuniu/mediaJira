
import requests
from .base import BaseExecutor, LaunchPayload, ExternalIds, StatusPayload, ExecutorError

class FacebookAdsExecutor(BaseExecutor):
    """
    Dev mock server
    """
    def _headers(self):
        return {"Authorization": f"Bearer {self.credentials.get('token')}"}

    def _base(self):
        return self.settings.get("base_url", "http://mock-fb:1080")

    def launch(self, data: LaunchPayload) -> ExternalIds:
        r = requests.post(
            f"{self._base()}/campaigns",
            json={
                "name": data.title,
                "targeting": data.audience,
                "creatives": data.creatives,
            },
            headers=self._headers(),
            timeout=10,
        )
        if r.status_code >= 400:
            raise ExecutorError(f"FB launch failed: {r.text}")
        j = r.json()  # 例如 {"id":"cmp_123","account":"act_999"}
        return {
            "accountId": j.get("account"),
            "campaignId": j.get("id"),
        }

    def pause(self, ids: ExternalIds) -> dict:
        r = requests.post(
            f"{self._base()}/campaigns/{ids['campaignId']}/pause",
            headers=self._headers(),
            timeout=10,
        )
        if r.status_code >= 400:
            raise ExecutorError(f"FB pause failed: {r.text}")
        return r.json()

    def get_status(self, ids: ExternalIds) -> StatusPayload:
        r = requests.get(
            f"{self._base()}/campaigns/{ids['campaignId']}/status",
            headers=self._headers(),
            timeout=10,
        )
        if r.status_code >= 400:
            raise ExecutorError(f"FB status failed: {r.text}")
        raw = r.json()
        spent = raw.get("spent", 0)
        try:
            spend = float(spent) / 100.0 if isinstance(spent, (int, float)) else float(spent)
        except Exception:
            spend = 0.0

        payload: StatusPayload = {
            "state": raw.get("status"),  # ACTIVE/PAUSED/COMPLETED/ERROR
            "spend": spend,
            "roi": float(raw.get("roi", 0)) if raw.get("roi") is not None else None,
            "native": raw,
        }
        return self.normalize_status(payload)

    def normalize_status(self, s: StatusPayload) -> StatusPayload:
        mapping = {
            "ACTIVE": "RUNNING",
            "PAUSED": "PAUSED",
            "COMPLETED": "COMPLETED",
            "DISABLED": "PAUSED",
            "ERROR": "FAILED",
            "ENDED": "COMPLETED",
        }
        s["state"] = mapping.get(s.get("state"), s.get("state"))
        return s
