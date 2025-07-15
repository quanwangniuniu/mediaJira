from rest_framework import serializers
from .models import UserPreferences

class UserPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ['language', 'timezone']

        # validate language
        def validate_language(self, value):
            if value not in [lang[0] for lang in settings.LANGUAGES]:
                raise serializers.ValidationError("Invalid language")
            return value

        # validate timezone
        def validate_timezone(self, value):
            if value not in [tz for tz in pytz.all_timezones]:
                raise serializers.ValidationError("Invalid timezone")
            return value