from django.apps import AppConfig
import os

class MetricUploadConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'metric_upload'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    
    def ready(self):
        """Import signals when app is ready"""
        import metric_upload.signals
