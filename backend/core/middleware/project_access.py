from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from core.models import ProjectMember


class CheckProjectAccessMiddleware(MiddlewareMixin):
    """
    Enforce project membership requirements on protected endpoints.

    - Task creation endpoints require an active project.
    - Onboarding and authentication endpoints are exempt.
    """

    PROJECT_REQUIRED_PATHS = ['/api/tasks', '/api/tasks/']
    EXEMPT_PATHS = [
        '/api/core/check-project-membership/',
        '/api/core/projects/onboarding/',
        '/auth/',
        '/api/authentication/',
        '/admin/',
        '/api/admin/',
    ]

    def process_request(self, request):
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None

        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return None

        requires_project = any(request.path.startswith(path) for path in self.PROJECT_REQUIRED_PATHS)
        if not requires_project:
            return None

        if user.active_project:
            return None

        has_membership = ProjectMember.objects.filter(user=user, is_active=True).exists()
        if not has_membership:
            return JsonResponse(
                {
                    'error': 'Active project required',
                    'detail': 'You must belong to at least one project to perform this action.',
                    'requires_onboarding': True,
                },
                status=403,
            )

        return JsonResponse(
            {
                'error': 'Active project required',
                'detail': 'Please set an active project before performing this action.',
                'requires_active_project': True,
            },
            status=403,
        )

