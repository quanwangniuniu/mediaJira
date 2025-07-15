from django.utils import translation
from django.utils import timezone

class UserLocaleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            preferences = getattr(request.user, 'preferences', None)
            if preferences:
                # language
                if preferences.language:
                    translation.activate(preferences.language)
                    request.LANGUAGE_CODE = preferences.language
                # timezone
                if preferences.timezone:
                    timezone.activate(preferences.timezone)

        response = self.get_response(request)
        translation.deactivate()
        timezone.deactivate()
        return response
