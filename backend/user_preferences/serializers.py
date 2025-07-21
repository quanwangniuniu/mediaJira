from rest_framework import serializers
from django.conf import settings
from django.core.exceptions import ValidationError
import pytz
from .models import UserPreferences, SlackIntegration


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