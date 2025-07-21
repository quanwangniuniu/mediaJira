from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import SlackIntegration
from .serializers import UserPreferencesSerializer, SlackIntegrationSerializer

class UserPreferencesView(generics.RetrieveUpdateAPIView):
  serializer_class = UserPreferencesSerializer
  permission_classes = [permissions.IsAuthenticated]

  def get_object(self):
    return self.request.user.preferences


class SlackIntegrationView(APIView):
    """
    PROFILE-04 Slack Integration API View
    Handles POST, GET, DELETE for /users/me/notifications/slack
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        GET /users/me/notifications/slack
        Get current Slack integration for the authenticated user
        """
        try:
            slack_integration = SlackIntegration.objects.get(user=request.user)
            serializer = SlackIntegrationSerializer(slack_integration)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except SlackIntegration.DoesNotExist:
            return Response(
                {'message': 'No Slack integration configured'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def post(self, request):
        """
        POST /users/me/notifications/slack
        Create or update Slack integration for the authenticated user
        """
        # Check if user already has a Slack integration (MVP: one per user)
        existing_integration = SlackIntegration.objects.filter(user=request.user).first()
        
        if existing_integration:
            # Update existing integration
            serializer = SlackIntegrationSerializer(
                existing_integration, 
                data=request.data, 
                partial=True
            )
        else:
            # Create new integration
            serializer = SlackIntegrationSerializer(data=request.data)
        
        if serializer.is_valid():
            slack_integration = serializer.save(user=request.user)
            
            # Mock logging as required by ticket
            action = 'updated' if existing_integration else 'created'
            mock_message = f"Slack integration {action} for user {request.user.username}"
            slack_integration.send_mock_notification(mock_message)
            
            response_data = SlackIntegrationSerializer(slack_integration).data
            return Response(
                {
                    'message': f'Slack integration {action} successfully',
                    'integration': response_data
                }, 
                status=status.HTTP_201_CREATED if not existing_integration else status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request):
        """
        DELETE /users/me/notifications/slack
        Delete Slack integration for the authenticated user
        """
        try:
            slack_integration = SlackIntegration.objects.get(user=request.user)
            
            # Mock logging before deletion
            print(f"[MOCK SLACK] Deleting integration for user: {request.user.username}")
            print(f"[MOCK SLACK] Webhook URL: {slack_integration.webhook_url}")
            
            slack_integration.delete()
            
            return Response(
                {'message': 'Slack integration deleted successfully'}, 
                status=status.HTTP_200_OK
            )
            
        except SlackIntegration.DoesNotExist:
            return Response(
                {'error': 'No Slack integration found for this user'}, 
                status=status.HTTP_404_NOT_FOUND
            )
  
  

