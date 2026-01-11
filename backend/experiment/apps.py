from django.apps import AppConfig
import os

class ExperimentConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'experiment'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))

