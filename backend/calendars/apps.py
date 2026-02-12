from django.apps import AppConfig


class CalendarConfig(AppConfig):
    """
    Calendar application configuration.

    Provides Google Calendar-like functionality including:
    - Multi-calendar support per user
    - Calendar sharing with granular permissions
    - Events with rich metadata
    - Recurring events (RFC 5545 RRULE)
    - Attendee management and RSVP
    - Multi-channel reminders
    - Event categorization
    - User preferences
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'calendars'
    verbose_name = 'Calendar Management'

    def ready(self):
<<<<<<< HEAD
        """
        Import signal handlers when app is ready.
        This is where you would register any signals, receivers, etc.
        """
        from . import signals  # noqa: F401
=======
        # Intentionally no-op: calendar creation is project-driven, not user-signals-driven.
        return None
>>>>>>> fa7e602073c489985c8246cd2e867880dde0df95
