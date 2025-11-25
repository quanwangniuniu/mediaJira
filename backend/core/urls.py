from django.urls import path, include
from rest_framework.routers import DefaultRouter

from core.views import (
    AcceptInvitationView,
    CheckProjectMembershipView,
    KPISuggestionsView,
    ListProjectInvitationsView,
    ProjectMemberViewSet,
    ProjectOnboardingView,
    ProjectViewSet,
    ResendInvitationView,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(
    r'projects/(?P<project_id>\d+)/members',
    ProjectMemberViewSet,
    basename='project-member'
)

urlpatterns = [
    path('check-project-membership/', CheckProjectMembershipView.as_view(), name='check-project-membership'),
    path('projects/onboarding/', ProjectOnboardingView.as_view(), name='project-onboarding'),
    path('kpi-suggestions/', KPISuggestionsView.as_view(), name='kpi-suggestions'),
    # Invitation endpoints
    path('invitations/accept/', AcceptInvitationView.as_view(), name='accept-invitation'),
    path('invitations/<int:invitation_id>/resend/', ResendInvitationView.as_view(), name='resend-invitation'),
    path('projects/<int:project_id>/invitations/', ListProjectInvitationsView.as_view(), name='list-project-invitations'),
    path('', include(router.urls)),
]

