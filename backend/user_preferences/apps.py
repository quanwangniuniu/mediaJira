from django.apps import AppConfig
import os


class UserPreferencesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user_preferences'
    verbose_name = 'User Preferences'
    path = os.path.join(os.path.dirname(os.path.abspath(__file__))) 