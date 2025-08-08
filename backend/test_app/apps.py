from django.apps import AppConfig
import os


class TestAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'test_app'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__))) 