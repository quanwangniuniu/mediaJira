from django.apps import AppConfig
import os

class OptimizationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'optimization'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))