from __future__ import annotations

import uuid

from django.utils import timezone
from rest_framework.response import Response


def calendar_error_response(
    error: str,
    message: str,
    status_code: int = 400,
    details: list[dict] | None = None,
):
    """
    Build an ErrorResponse-like payload scoped to calendar endpoints.
    Matches the OpenAPI ErrorResponse schema shape.
    """

    payload: dict = {
        "error": error,
        "message": message,
        "request_id": str(uuid.uuid4()),
        "timestamp": timezone.now().isoformat().replace("+00:00", "Z"),
    }

    if details:
        payload["details"] = details

    return Response(payload, status=status_code)

