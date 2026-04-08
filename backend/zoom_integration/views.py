import secrets
from django.shortcuts import redirect
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .services import (
    get_authorization_url,
    exchange_code_for_token,
    save_token_for_user,
    create_zoom_meeting,
)
from .models import ZoomCredential
from .serializers import CreateMeetingSerializer


class ZoomConnectView(APIView):
    """
    GET /api/v1/zoom/connect/
    Generate Zoom authorization URL, redirect user to Zoom for authorization
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # generate random state, store in session for callback verification (prevent CSRF)
        state = secrets.token_urlsafe(32)
        request.session["zoom_oauth_state"] = state
        request.session["zoom_oauth_user_id"] = request.user.id

        auth_url = get_authorization_url(state)
        return Response({"auth_url": auth_url})


class ZoomCallbackView(APIView):
    """
    GET /api/v1/zoom/callback/
    Zoom authorization completed, callback here, exchange code for token.
    No JWT auth required — user is identified via session set in ZoomConnectView.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        state = request.query_params.get("state")

        # validate state, prevent CSRF attacks
        saved_state = request.session.pop("zoom_oauth_state", None)
        user_id = request.session.pop("zoom_oauth_user_id", None)

        if not state or state != saved_state:
            return redirect(f"{settings.FRONTEND_URL}/settings?zoom_error=invalid_state")

        if not user_id:
            return redirect(f"{settings.FRONTEND_URL}/settings?zoom_error=session_expired")

        if not code:
            error = request.query_params.get("error", "unknown")
            return redirect(f"{settings.FRONTEND_URL}/settings?zoom_error={error}")

        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
            token_data = exchange_code_for_token(code)
            save_token_for_user(user, token_data)
        except User.DoesNotExist:
            return redirect(f"{settings.FRONTEND_URL}/settings?zoom_error=user_not_found")
        except Exception as e:
            return redirect(f"{settings.FRONTEND_URL}/settings?zoom_error=token_exchange_failed")

        return redirect(f"{settings.FRONTEND_URL}/meetings?zoom_connected=true")


class ZoomStatusView(APIView):
    """
    GET /api/v1/zoom/status/
    Check if the current user is connected to Zoom
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        connected = ZoomCredential.objects.filter(user=request.user).exists()
        return Response({"connected": connected})


class ZoomDisconnectView(APIView):
    """
    DELETE /api/v1/zoom/disconnect/
    Disconnect from Zoom (delete token)
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        ZoomCredential.objects.filter(user=request.user).delete()
        return Response({"message": "Successfully disconnected from Zoom"})


class CreateMeetingView(APIView):
    """
    POST /api/v1/zoom/meetings/
    Create a Zoom meeting
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateMeetingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            meeting_data = create_zoom_meeting(
                user=request.user,
                topic=serializer.validated_data["topic"],
                start_time=serializer.validated_data["start_time"].isoformat(),
                duration=serializer.validated_data["duration"],
            )
        except ValueError as e:
            # user not connected to Zoom
            return Response({"error": str(e)}, status=status.HTTP_403_FORBIDDEN)
        except PermissionError as e:
            # token invalid
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response(
                {"error": f"Failed to create meeting: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        return Response({
            "meeting_id": meeting_data["id"],
            "topic": meeting_data["topic"],
            "join_url": meeting_data["join_url"],
            "start_url": meeting_data["start_url"],
            "start_time": meeting_data["start_time"],
            "duration": meeting_data["duration"],
        }, status=status.HTTP_201_CREATED)