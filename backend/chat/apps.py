from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chat'
    verbose_name = 'Chat'
    
    def ready(self):
        """Import signal handlers when the app is ready"""
        # Import signals here if needed in the future
        pass

