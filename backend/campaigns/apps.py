from django.apps import AppConfig


class CampaignsConfig(AppConfig):
    """
    Campaign Management App Configuration
    
    This app handles all campaign-related functionality including:
    - Campaign creation, editing, and management
    - Campaign status workflows
    - Campaign metrics and analytics
    - Team assignments and collaboration
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'campaigns'
    verbose_name = 'Campaign Management'
    
    def ready(self):
        """
        Import signals when the app is ready
        This ensures that signal handlers are properly registered
        """
        try:
            import campaigns.signals  # noqa
        except ImportError:
            pass 