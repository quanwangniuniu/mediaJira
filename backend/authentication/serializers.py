from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import Organization
from access_control.models import UserRole
from core.models import Role
from stripe_meta.models import Subscription


User = get_user_model()

class OrganizationSerializer(serializers.ModelSerializer):
    plan_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'plan_id']
    
    def get_plan_id(self, obj):
        """Get the plan_id from the active subscription"""
        try:
            subscription = Subscription.objects.filter(
                organization=obj,
                is_active=True
            ).first()
            return subscription.plan.id if subscription else None
        except Exception:
            return None

class UserProfileSerializer(serializers.ModelSerializer):
    organization = OrganizationSerializer(read_only=True)
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'is_verified', 'organization', 'roles', 'first_name', 'last_name']

    def get_roles(self, obj):
        """
        Get user roles with improved logic for users without organization
        """
        # Strategy 1: If user has an organization, get roles for that organization
        try:
            if obj.organization:
                user_roles = UserRole.objects.filter(
                    user=obj,
                    role__organization=obj.organization
                ).select_related('role')
            else:
                # Strategy 2: If user has no organization, try global roles then any roles
                user_roles = UserRole.objects.filter(
                    user=obj,
                    role__organization=None
                ).select_related('role')
                if not user_roles.exists():
                    user_roles = UserRole.objects.filter(user=obj).select_related('role')
            return [ur.role.name for ur in user_roles if getattr(ur.role, 'name', None)]
        except Exception as e:
            return [] 
        