from django.apps import AppConfig
import os


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)))
    
    def ready(self):
        """
        Import factory signals to enable automatic validation after migrations.
        
        To enable auto-validation, set FACTORY_AUTO_VALIDATE_AFTER_MIGRATE=True
        To enable auto-generation of stubs, set FACTORY_AUTO_GENERATE_STUBS=True
        """
        # Optionally register factory validation signals
        # Only if explicitly enabled via environment variable
        if os.environ.get('FACTORY_AUTO_VALIDATE_AFTER_MIGRATE', 'False').lower() == 'true':
            try:
                import factories.signals  # Registers post_migrate signal
            except ImportError:
                pass  # factories package might not be available