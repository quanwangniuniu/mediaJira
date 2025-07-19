from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class UserPreferences(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='preferences')
    timezone = models.CharField(null=True, blank=True)
    language = models.CharField(null=True, blank=True)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    frequency = models.CharField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s preferences"

    class Meta:
        db_table = 'user_preferences'
