from rest_framework import status as drf_status
from rest_framework.response import Response

INVALID_STATE_ERROR_CODE = "INVALID_STATE_TRANSITION"
INVALID_STATE_MESSAGE = "This operation is not allowed in the current state."


def invalid_state_response(
    *, current_status: str, allowed_statuses: list[str], suggested_action: str
):
    return Response(
        {
            "errorCode": INVALID_STATE_ERROR_CODE,
            "message": INVALID_STATE_MESSAGE,
            "details": {
                "currentStatus": current_status,
                "allowedStatuses": allowed_statuses,
                "suggestedAction": suggested_action,
            },
        },
        status=drf_status.HTTP_409_CONFLICT,
    )


def generate_signal_text(
    *,
    metric: str,
    movement: str,
    period: str,
    comparison: str | None = None,
    scope_type: str | None = None,
    scope_value: str | None = None,
    delta_value: str | None = None,
    delta_unit: str | None = None,
) -> str:
    parts = [metric, movement, period]
    if comparison and comparison != "NONE":
        parts.append(f"vs {comparison}")
    if scope_type:
        if scope_value:
            parts.append(f"{scope_type}: {scope_value}")
        else:
            parts.append(scope_type)
    if delta_value is not None and delta_unit:
        parts.append(f"{delta_value} {delta_unit}")
    return " | ".join(parts)
