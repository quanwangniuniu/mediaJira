# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.
# Temporarily commented out to run migrations without celery
# from .celery import app as celery_app

# __all__ = ('celery_app',)
