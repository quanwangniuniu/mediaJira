from rest_framework import generics, permissions
from .serializers import UserPreferencesSerializer

class UserPreferencesView(generics.RetrieveUpdateAPIView):
  serializer_class = UserPreferencesSerializer
  permission_classes = [permissions.IsAuthenticated]

  def get_object(self):
    return self.request.user.preferences
  
  

