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
