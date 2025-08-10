from django.apps import AppConfig
import os
 
class AssetConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'asset' 
    path = os.path.join(os.path.dirname(os.path.abspath(__file__))) 