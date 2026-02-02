from django.core.exceptions import ValidationError
from rest_framework import status as drf_status
from rest_framework.response import Response

from .models import DecisionEdge

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


def _has_path(start_id: int, target_id: int) -> bool:
    if start_id == target_id:
        return True
    visited = set()
    stack = [start_id]
    while stack:
        current = stack.pop()
        if current in visited:
            continue
        visited.add(current)
        if current == target_id:
            return True
        children = DecisionEdge.objects.filter(
            from_decision_id=current
        ).values_list("to_decision_id", flat=True)
        for child in children:
            if child not in visited:
                stack.append(child)
    return False


def validate_decision_edge(from_decision, to_decision):
    if from_decision.id == to_decision.id:
        raise ValidationError({"parentDecisionIds": "Decision cannot reference itself."})
    if _has_path(to_decision.id, from_decision.id):
        raise ValidationError({"parentDecisionIds": "Adding this parent introduces a cycle."})
