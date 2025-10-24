from django.apps import AppConfig


class TikTokConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tiktok'
    verbose_name = 'TikTok Creative'
    
    def ready(self):
        import tiktok.signals


