from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Project
from .serializers import ProjectSerializer

# Create your views here.

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def projects_list(request):
    """Fetch projects list filtered by user's organization"""
    # Get user's organization
    user_org = getattr(request.user, 'organization', None)
    
    if not user_org:
        # If user has no organization, return empty list
        projects = Project.objects.none()
    else:
        # Filter projects by user's organization (exclude soft-deleted)
        projects = Project.objects.filter(
            organization=user_org,
            is_deleted=False
        )
    
    serializer = ProjectSerializer(projects, many=True)
    # Return array directly (axios will wrap it in response.data)
    return Response(serializer.data)
