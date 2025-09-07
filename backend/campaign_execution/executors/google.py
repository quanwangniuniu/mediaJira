import requests
from .base import BaseExecutor, LaunchPayload, ExternalIds, StatusPayload, ExecutorError

class GoogleAdsExecutor(BaseExecutor):
    def _headers(self):
        return {"Authorization": f"Bearer {self.credentials.get('token')}"}

    def launch(self, data: LaunchPayload) -> ExternalIds:
        # mock server base_url
        base = self.settings.get("base_url", "http://mock-google:1080")
        r = requests.post(f"{base}/campaigns", json={
            "name": data.title,
            "audience": data.audience,
            "creatives": data.creatives
        }, headers=self._headers(), timeout=10)
        if r.status_code >= 400:
            raise ExecutorError(f"Google launch failed: {r.text}")
        j = r.json()
        return {"accountId": j.get("accountId"), "campaignId": j["campaignId"]}

    def pause(self, ids: ExternalIds) -> dict:
        base = self.settings.get("base_url", "http://mock-google:1080")
        r = requests.post(f"{base}/campaigns/{ids['campaignId']}/pause",
                          headers=self._headers(), timeout=10)
        if r.status_code >= 400:
            raise ExecutorError(f"Google pause failed: {r.text}")
        return r.json()

    def resume(self, ids: ExternalIds) -> dict:
        base = self.settings.get("base_url", "http://mock-google:1080")
        r = requests.post(f"{base}/campaigns/{ids['campaignId']}/resume",
                          headers=self._headers(), timeout=10)
        if r.status_code >= 400:
            raise ExecutorError(f"Google resume failed: {r.text}")
        return r.json()

    def get_status(self, ids: ExternalIds) -> StatusPayload:
        base = self.settings.get("base_url", "http://mock-google:1080")
        r = requests.get(f"{base}/campaigns/{ids['campaignId']}/status",
                         headers=self._headers(), timeout=10)
        if r.status_code >= 400:
            raise ExecutorError(f"Google status failed: {r.text}")
        raw = r.json()

        return self.normalize_status({
            "state": raw.get("state"),    # e.g. ENABLED/PAUSED/ENDED
            "spend": float(raw.get("spend", 0)),
            "roi": float(raw.get("roi", 0)),
            "native": raw
        })

    def normalize_status(self, s: StatusPayload) -> StatusPayload:
        mapping = {"ENABLED": "RUNNING", "PAUSED": "PAUSED", "ENDED": "COMPLETED", "ERROR": "FAILED"}
        s["state"] = mapping.get(s.get("state"), s.get("state"))
        return s
