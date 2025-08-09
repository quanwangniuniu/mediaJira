from django.apps import AppConfig
import os


class AuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'authentication'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))
