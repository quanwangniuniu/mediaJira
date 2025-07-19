from rest_framework import serializers
from django.conf import settings
import pytz
from .models import UserPreferences

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