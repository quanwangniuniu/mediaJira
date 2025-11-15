from rest_framework import serializers
from .models import Project

class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model"""
    organization_id = serializers.IntegerField(source='organization.id', read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'organization_id']

