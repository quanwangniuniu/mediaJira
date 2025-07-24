from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from .models import SlackIntegration, NotificationSettings
from .serializers import UserPreferencesSerializer, SlackIntegrationSerializer, NotificationSettingsSerializer
from .services.notification_dispatcher import NotificationDispatcher

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
  
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def mock_task_alert(request):
    """
    PROFILE-05 Mock Notification Endpoint
    POST /notifications/mock-task-alert
    
    Simulates triggering a notification alert to test user's notification settings
    """
    # Input validation
    user_id = request.data.get('user_id')
    trigger_type = request.data.get('trigger_type')
    message = request.data.get('message')
    
    # Validate required parameters
    if not user_id:
        return Response(
            {'error': 'user_id is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not trigger_type:
        return Response(
            {'error': 'trigger_type is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not message:
        return Response(
            {'error': 'message is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Use notification dispatcher service for business logic
    dispatcher = NotificationDispatcher()
    result = dispatcher.dispatch_mock_notification(user_id, trigger_type, message)
    
    # Print mock logs to console as required by ticket
    for log_line in result.get('mock_logs', []):
        print(log_line)
    
    # Handle error cases
    if 'error' in result:
        return Response(
            {'error': result['error']}, 
            status=status.HTTP_404_NOT_FOUND if result['error'] == 'User not found' else status.HTTP_400_BAD_REQUEST
        )
    
    # Return success response with channel confirmation
    return Response(result, status=status.HTTP_200_OK)

class NotificationSettingsView(APIView):
    """
    PROFILE-07 Notification Settings API View
    Handles GET for /users/me/notifications/settings
    Returns permission-scoped notification settings
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        GET /users/me/notifications/settings
        Get current user's notification settings with permission-based filtering
        """
        try:
            # Get all notification settings for the user
            notification_settings = NotificationSettings.objects.filter(user=request.user)
            
            # Use the permission-aware serializer
            serializer = NotificationSettingsSerializer(
                notification_settings, 
                many=True, 
                context={'request': request}  # Important: pass request context
            )
            
            # Filter out None values (settings user doesn't have permission to see)
            filtered_data = [item for item in serializer.data if item is not None]
            
            return Response({
                'notification_settings': filtered_data,
                'total_count': len(filtered_data),
                'message': 'Notification settings retrieved with permission filtering'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to retrieve notification settings: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

