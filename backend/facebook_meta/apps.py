import os
from django.apps import AppConfig


class FacebookMetaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "facebook_meta"
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))


