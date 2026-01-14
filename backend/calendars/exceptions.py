from __future__ import annotations

import uuid
from typing import Any

from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework import status


def calendar_error_response(
    error: str,
    message: str,
    status_code: int = 400,
    details: list[dict[str, Any]] | None = None,
):
    """
    Build an ErrorResponse-like payload scoped to calendar endpoints.
    Matches the OpenAPI ErrorResponse schema shape.
    """

    payload: dict[str, Any] = {
        "error": error,
        "message": message,
        "request_id": str(uuid.uuid4()),
        "timestamp": timezone.now().isoformat().replace("+00:00", "Z"),
    }

    if details:
        payload["details"] = details

    return Response(payload, status=status_code)


def _build_details_from_errors(data: Any) -> list[dict[str, Any]]:
    """
    Convert DRF error dict/list into ErrorResponse.details format.
    """
    details: list[dict[str, Any]] = []

    if isinstance(data, dict):
        for field, errors in data.items():
            if not isinstance(errors, (list, tuple)):
                errors = [errors]
            for err in errors:
                message = str(getattr(err, "detail", err))
                details.append(
                    {
                        "field": field,
                        "reason": "constraint_violation",
                        "message": message,
                        "metadata": {},
                    }
                )
    elif isinstance(data, (list, tuple)):
        for err in data:
            message = str(getattr(err, "detail", err))
            details.append(
                {
                    "field": "",
                    "reason": "constraint_violation",
                    "message": message,
                    "metadata": {},
                }
            )

    return details


def calendar_exception_handler(exc, context):
    """
    Global DRF exception handler that wraps responses from calendar views
    into the unified ErrorResponse shape.
    Other apps keep using DRF's default format.
    """

    response = drf_exception_handler(exc, context)
    if response is None:
        return response

    view = context.get("view")
    if view is None:
        return response

    # Only normalize error format for calendars.* views to avoid affecting other apps
    if not getattr(view, "__module__", "").startswith("calendars."):
        return response

    status_code = response.status_code
    data = response.data

    # Map status code to a generic error code
    if status_code == status.HTTP_400_BAD_REQUEST:
        error_code = "VALIDATION_ERROR"
    elif status_code == status.HTTP_401_UNAUTHORIZED:
        error_code = "UNAUTHORIZED"
    elif status_code == status.HTTP_403_FORBIDDEN:
        error_code = "PERMISSION_DENIED"
    elif status_code == status.HTTP_404_NOT_FOUND:
        error_code = "NOT_FOUND"
    elif status_code == status.HTTP_429_TOO_MANY_REQUESTS:
        error_code = "RATE_LIMITED"
    else:
        error_code = "INTERNAL_ERROR"

    # Extract human-readable message
    if isinstance(data, dict) and "detail" in data:
        message = str(data["detail"])
    else:
        message = error_code

    # Build field-level details for validation errors
    details: list[dict[str, Any]] | None = None
    if status_code == status.HTTP_400_BAD_REQUEST and isinstance(data, dict):
        detail_dict = {k: v for k, v in data.items() if k != "detail"}
        if detail_dict:
            details = _build_details_from_errors(detail_dict)

    return calendar_error_response(
        error=error_code,
        message=message,
        status_code=status_code,
        details=details,
    )
