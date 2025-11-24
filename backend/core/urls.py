from django.urls import path

from core.views import CheckProjectMembershipView, KPISuggestionsView, ProjectOnboardingView

urlpatterns = [
    path('check-project-membership/', CheckProjectMembershipView.as_view(), name='check-project-membership'),
    path('projects/onboarding/', ProjectOnboardingView.as_view(), name='project-onboarding'),
    path('kpi-suggestions/', KPISuggestionsView.as_view(), name='kpi-suggestions'),
]

