from django.apps import AppConfig
import os


class TeamsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "teams"
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))
