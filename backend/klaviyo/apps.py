from django.apps import AppConfig


class KlaviyoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "klaviyo"

    def ready(self):
        import klaviyo.signals