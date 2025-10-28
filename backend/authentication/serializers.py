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
                print(f"Found {user_roles.count()} roles for user {obj.email}")

            else:
            # Strategy 2: If user has no organization, try multiple approaches
            
                # First, try to get roles with organization_id = NULL (global roles)
                user_roles = UserRole.objects.filter(
                    user=obj, 
                    role__organization=None
                ).select_related('role')
            
                # If no global roles found, try to get any roles assigned to this user
                # regardless of organization (fallback for existing data)
                if not user_roles.exists():
                    user_roles = UserRole.objects.filter(user=obj).select_related('role')
                
                    # Log this situation for debugging
                    if user_roles.exists():
                        print(f"Warning: User {obj.email} has no organization but has roles from other organizations")
        
            return [ur.role.name for ur in user_roles]    
        except Exception as e:
            print(f"Error in get_roles: {e}")
            return [] 
        