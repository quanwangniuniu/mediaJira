from django.db import models
from django.conf import settings

class ZoomCredential(models.Model):
    """
    Store user'sZoom OAuth Token
    （OneToOne）
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='zoom_credential'
    )
    access_token = models.TextField()           # short-lived token
    refresh_token = models.TextField()          # refresh token
    token_expires_at = models.DateTimeField()   # access_token expiration time
    zoom_user_id = models.CharField(max_length=100, blank=True)  # Zoom user ID
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ZoomCredential for {self.user}"
