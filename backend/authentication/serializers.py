from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import Organization
from access_control.models import UserRole
from core.models import Role

User = get_user_model()

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name']

class UserProfileSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['email', 'username', 'organization', 'roles']

    def get_roles(self, obj):
        if obj.organization:
            user_roles = UserRole.objects.filter(user=obj, role__organization=obj.organization)
        else:
            user_roles = UserRole.objects.filter(user=obj, role__organization=None)
        return [ur.role.name for ur in user_roles] 