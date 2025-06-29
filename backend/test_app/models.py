from django.db import models
from django.utils import timezone


class TestData(models.Model):
    """Simple test model to verify database connectivity"""
    message = models.CharField(max_length=255)
    timestamp = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.message} - {self.timestamp}"

    class Meta:
        ordering = ['-timestamp'] 