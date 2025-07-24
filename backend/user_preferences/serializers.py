from rest_framework import serializers
from django.conf import settings
from django.core.exceptions import ValidationError
import pytz
from .models import UserPreferences, SlackIntegration, NotificationSettings
from .services.permission_service import PermissionService
from .conf.permission_mappings import PERMISSION_MAPPINGS

class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ['language', 'timezone']
    
    def validate_language(self, value):
        if value and value not in [lang[0] for lang in settings.LANGUAGES]:
            raise serializers.ValidationError("Invalid language")
        return value

    def validate_timezone(self, value):
        if value and value not in pytz.all_timezones:
            raise serializers.ValidationError("Invalid timezone")
        return value

class SlackIntegrationSerializer(serializers.ModelSerializer):
    """
    Serializer for SlackIntegration model
    
    Handles PROFILE-04 Slack integration API endpoints with validation
    """
    
    class Meta:
        model = SlackIntegration
        fields = [
            'webhook_url', 
            'channel_name', 
            'is_active', 
            'created_at', 
            'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        """
        Ensure model validation runs by calling clean()
        """
        # For updates, we need to merge with existing instance data
        if self.instance:
            # Create a copy of the instance with updated data
            for key, value in attrs.items():
                setattr(self.instance, key, value)
            instance_to_validate = self.instance
        else:
            # For creation, create a temporary instance
            instance_to_validate = SlackIntegration(**attrs)
        
        try:
            instance_to_validate.clean()
        except ValidationError as e:
            # Convert Django ValidationError to DRF ValidationError
            if hasattr(e, 'message_dict'):
                raise serializers.ValidationError(e.message_dict)
            else:
                raise serializers.ValidationError({'non_field_errors': [str(e)]})
        
        return attrs    

class NotificationSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for NotificationSettings with permission-based filtering
    
    PROFILE-07: Only shows settings that the user has permission to access
    Works for both single instance and list serialization
    """
    
    class Meta:
        model = NotificationSettings
        fields = [
            'id', 'channel_id', 'channel_name', 'enabled', 
            'setting_key', 'module_scope', 'is_third_party'
        ]
    
    def to_representation(self, instance):
        """
        Override to_representation to filter based on user permissions
        """
        # Get the request context to access the current user
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return super().to_representation(instance)
        
        # Get user permissions
        user_permissions = PermissionService.get_user_permissions(request.user.id)
        
        # Check if user has permission for this setting
        mapping_key = (instance.setting_key, instance.module_scope)
        required_permission = PERMISSION_MAPPINGS.get(mapping_key)
        
        # If no permission required or user has the required permission
        if required_permission is None or required_permission in user_permissions:
            return super().to_representation(instance)
        
        # User doesn't have permission, return None to exclude from results
        return None