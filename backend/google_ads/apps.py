import os
from django.apps import AppConfig


class GoogleAdsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "google_ads"
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    
    def ready(self):
        pass