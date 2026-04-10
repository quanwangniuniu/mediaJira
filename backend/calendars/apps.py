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
        import calendars.signals  # noqa: F401 — registers Decision/Task signals
