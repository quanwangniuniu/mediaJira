from rest_framework import serializers
from .models import MetricFile
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class MetricFileSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    
    class Meta:
        model = MetricFile
        fields = [
            'id', 'status', 'mime_type', 'size', 'checksum', 'storage_key',
            'original_filename', 'is_public', 'is_deleted', 'uploaded_by', 
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'mime_type', 'size', 'checksum', 'storage_key', 
            'is_deleted', 'uploaded_by', 'created_at', 'updated_at'
        ]
