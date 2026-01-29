from django.apps import AppConfig
import os


class SlackIntegrationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'slack_integration'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))
