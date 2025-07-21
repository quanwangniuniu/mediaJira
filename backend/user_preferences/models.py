from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError 

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


class SlackIntegration(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='slack_integrations')
    webhook_url = models.URLField(max_length=500)
    channel_name = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s {self.channel_name or 'Slack Integration'}"

    class Meta:
        db_table = 'slack_integrations'

    def clean(self):
        super().clean()

        if self.webhook_url:
            if not self.webhook_url.startswith("https://hooks.slack.com/services/"):
                raise ValidationError({
                    'webhook_url': 'Slack webhook URL must start with https://hooks.slack.com/services/'
                })

            parts = self.webhook_url.replace("https://hooks.slack.com/services/", "").split("/")
            if len(parts) != 3 or not all(parts):
                raise ValidationError({
                    'webhook_url': 'Slack webhook URL must follow the pattern: https://hooks.slack.com/services/XXX/YYY/ZZZ'
                })
        else:
            raise ValidationError({
                'webhook_url': 'Slack webhook URL can not be empty'
            })
        

    def send_mock_notification(self, message):
        if not self.is_active:
            return False
        print(f"[MOCK SLACK] Webhook: {self.webhook_url}")
        print(f"[MOCK SLACK] Channel: {self.channel_name or 'Default'}")
        print(f"[MOCK SLACK] Message: {message}")
        return True