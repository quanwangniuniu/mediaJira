from django.urls import path, include
from rest_framework.routers import DefaultRouter

from core.views import (
    ApproveProjectInvitationView,
    AcceptInvitationView,
    CheckProjectMembershipView,
    KPISuggestionsView,
    ListMyProjectInvitationsView,
    ListProjectInvitationsView,
    ListPendingInvitationApprovalsView,
    ProjectMemberViewSet,
    ProjectOnboardingView,
    ProjectViewSet,
    RejectProjectInvitationView,
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
    path('invitations/pending/', ListMyProjectInvitationsView.as_view(), name='list-my-project-invitations'),
    path('invitations/<int:invitation_id>/resend/', ResendInvitationView.as_view(), name='resend-invitation'),
    path('projects/<int:project_id>/invitations/', ListProjectInvitationsView.as_view(), name='list-project-invitations'),
    path('projects/<int:project_id>/invitations/pending-approval/', ListPendingInvitationApprovalsView.as_view(), name='list-pending-invitation-approvals'),
    path('projects/<int:project_id>/invitations/<int:invitation_id>/approve/', ApproveProjectInvitationView.as_view(), name='approve-project-invitation'),
    path('projects/<int:project_id>/invitations/<int:invitation_id>/reject/', RejectProjectInvitationView.as_view(), name='reject-project-invitation'),
    path('', include(router.urls)),
]
