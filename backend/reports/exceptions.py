from rest_framework.exceptions import APIException

class ReportLocked(APIException):
    status_code = 409
    default_code = "REPORT_LOCKED"

    def __init__(self, report_id: str):
        super().__init__({
            "code": self.default_code,
            "message": "Report is approved and locked. Fork a new version before editing.",
            "fork_url": f"/api/reports/{report_id}/fork/",
        })
