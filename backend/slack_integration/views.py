from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from django.shortcuts import get_object_or_404
from .models import SlackWorkspaceConnection, NotificationPreference
from .serializers import (
    SlackOAuthInitSerializer, 
    SlackOAuthCallbackSerializer, 
    SlackConnectionStatusSerializer,
    NotificationPreferenceSerializer,
    SlackTestNotificationSerializer
)
from .services import (
    exchange_oauth_code,
    store_slack_connection,
    revoke_slack_connection,
    send_slack_message
)
from django.core.exceptions import ValidationError

class SlackAuthViewSet(viewsets.ViewSet):
    """
    ViewSet for handling Slack OAuth flow.
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'])
    def init(self, request):
        """Generates the Slack OAuth Authorization URL."""
        client_id = settings.SLACK_CLIENT_ID
        redirect_uri = settings.SLACK_REDIRECT_URI
        scopes = "channels:read,chat:write,commands,incoming-webhook,groups:read,im:read,mpim:read"
        
        oauth_url = (
            f"https://slack.com/oauth/v2/authorize?"
            f"client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}"
        )
        
        serializer = SlackOAuthInitSerializer(data={'url': oauth_url})
        serializer.is_valid()
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def callback(self, request):
        """Exchanges the temporary authorization code for an access token and persists the connection."""
        serializer = SlackOAuthCallbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data['code']
        
        try:
            # Exchange code for token
            slack_data = exchange_oauth_code(code)
            
            # Store connection for the user's organization
            # Assuming user has an 'organization' attribute or similar relation
            if not hasattr(request.user, 'organization'):
                return Response(
                    {"error": "User does not belong to an organization."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            connection = store_slack_connection(request.user.organization, slack_data)
            
            return Response({
                "success": True,
                "team_name": connection.slack_team_name,
                "team_id": connection.slack_team_id
            }, status=status.HTTP_200_OK)
            
        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Log exact error in prod, generic message here
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SlackConnectionView(APIView):
    """Manages the lifecycle of the Slack Workspace Connection for the organization."""
    permission_classes = [permissions.IsAuthenticated]

    def get_connection(self, request):
        """Helper to retrieve the active connection for the authenticated user's organization."""
        if hasattr(request.user, 'organization'):
             return SlackWorkspaceConnection.objects.filter(
                 organization=request.user.organization,
                 is_active=True
             ).first()
        return None

    def get(self, request):
        """Retrieves the current connection status."""
        connection = self.get_connection(request)

        if connection:
            serializer = SlackConnectionStatusSerializer(connection)
            return Response(serializer.data)
        else:
            return Response({
                "is_connected": False,
                "team_id": None,
                "team_name": None,
                "default_channel_id": None,
                "default_channel_name": None,
                "is_active": False
            })

    def post(self, request):
        """
        Disconnect (revoke) the integration.
        """
        connection = self.get_connection(request)
        if connection:
            revoke_slack_connection(connection)
            return Response({"success": True}, status=status.HTTP_200_OK)
        return Response({"error": "No active connection found."}, status=status.HTTP_404_NOT_FOUND)

class SlackChannelListView(APIView):
    """
    Returns a list of public and private channels from the connected Slack workspace.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'organization'):
             return Response({"error": "User has no organization."}, status=status.HTTP_400_BAD_REQUEST)

        connection = SlackWorkspaceConnection.objects.filter(
            organization=request.user.organization,
            is_active=True
        ).first()
        
        if not connection:
             return Response({"error": "No active Slack connection found."}, status=status.HTTP_404_NOT_FOUND)

        channels = get_slack_channels(connection)
        return Response(channels)

class NotificationPreferenceViewSet(viewsets.ModelViewSet):
    """
    CRUD for Notification Preferences.
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by user's organization
        if not hasattr(self.request.user, 'organization'):
            return NotificationPreference.objects.none()
            
        return NotificationPreference.objects.filter(
            project__organization=self.request.user.organization
        )

    def perform_create(self, serializer):
        serializer.save()

class SlackNotificationTestView(APIView):
    """
    Internal endpoint to trigger a test notification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = SlackTestNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        channel_id = serializer.validated_data['channel_id']
        message = serializer.validated_data['message']
        
        # Determine which connection to use
        # For simple implementations, grab the first active one for the org
        if not hasattr(request.user, 'organization'):
             return Response({"error": "User has no organization."}, status=status.HTTP_400_BAD_REQUEST)

        connection = SlackWorkspaceConnection.objects.filter(
            organization=request.user.organization,
            is_active=True
        ).first()
        
        if not connection:
             return Response({"error": "No active Slack connection found."}, status=status.HTTP_404_NOT_FOUND)

        success = send_slack_message(connection, channel_id, message)
        
        if success:
            return Response({"status": "Message sent successfully"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Failed to send message to Slack"}, status=status.HTTP_502_BAD_GATEWAY)
