"""
Django signals for automatic factory validation/generation after migrations.
Connect these signals in your main app's ready() method.
"""
from django.db.models.signals import post_migrate
from django.dispatch import receiver
from django.core.management import call_command
import os


@receiver(post_migrate)
def validate_factories_after_migration(sender, **kwargs):
    """
    Automatically validate factories after migrations.
    
    This signal fires after every migration. It checks if factories are in sync
    with models and optionally generates stubs for missing fields.
    
    To enable automatic stub generation, set FACTORY_AUTO_GENERATE_STUBS=True
    in your environment or Django settings.
    
    Usage:
        In your main app's apps.py:
        
        from django.apps import AppConfig
        
        class CoreConfig(AppConfig):
            def ready(self):
                import factories.signals  # Registers the signal
    """
    # Only run in development/testing, not in production
    if os.environ.get('FACTORY_AUTO_VALIDATE_AFTER_MIGRATE', 'False').lower() == 'true':
        try:
            # Run validation (non-blocking, just warns)
            call_command('validate_factories', verbosity=1)
        except Exception as e:
            # Don't break migrations if validation fails
            print(f"Factory validation after migration failed: {e}")
    
    # Auto-generate stubs if enabled
    if os.environ.get('FACTORY_AUTO_GENERATE_STUBS', 'False').lower() == 'true':
        try:
            # Only generate stubs if there are missing fields
            call_command('validate_factories', '--auto-generate-stubs', verbosity=1)
        except Exception as e:
            # Don't break migrations if stub generation fails
            print(f"Factory stub generation after migration failed: {e}")
