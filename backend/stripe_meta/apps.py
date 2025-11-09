from django.apps import AppConfig


class StripeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'stripe_meta'
    verbose_name = 'Stripe Integration'
