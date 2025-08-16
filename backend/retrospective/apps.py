from django.apps import AppConfig


class RetrospectiveConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'retrospective'
    verbose_name = 'Retrospective Engine'
    
    def ready(self):
        """Import signals when app is ready"""
        import retrospective.signals 