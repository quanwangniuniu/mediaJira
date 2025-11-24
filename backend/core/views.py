import logging

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Project, ProjectMember
from core.serializers import ProjectOnboardingSerializer, ProjectSerializer
from core.services.project_initialization import ProjectInitializationService
from core.utils.kpi_suggestions import get_kpi_suggestions

logger = logging.getLogger(__name__)
User = get_user_model()


class CheckProjectMembershipView(APIView):
    """Return project membership metadata for authenticated users."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        memberships = ProjectMember.objects.filter(user=user, is_active=True)
        project_count = memberships.count()
        active_project_id = user.active_project_id if user.active_project else None

        return Response(
            {
                'has_project': project_count > 0,
                'active_project_id': active_project_id,
                'project_count': project_count,
            }
        )


class ProjectOnboardingView(APIView):
    """Handle the multi-step onboarding wizard for creating a project."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProjectOnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        organization = getattr(user, 'organization', None)

        if not organization:
            return Response(
                {'error': 'User must belong to an organization to create a project.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data

        owner = self._resolve_owner(user, data.get('owner_id'))
        if isinstance(owner, Response):
            return owner

        advertising_platforms = data.get('advertising_platforms', [])
        if data.get('advertising_platforms_other') and 'other' not in advertising_platforms:
            advertising_platforms.append('other')

        project = Project.objects.create(
            name=data['name'],
            description=data.get('description'),
            organization=organization,
            owner=owner,
            project_type=data.get('project_type', []),
            work_model=data.get('work_model', []),
            advertising_platforms=advertising_platforms,
            objectives=data.get('objectives', []),
            kpis=data.get('kpis', {}),
            budget_management_type=data.get('budget_management_type'),
            total_monthly_budget=data.get('total_monthly_budget'),
            pacing_enabled=data.get('pacing_enabled', False),
            budget_config=data.get('budget_config', {}),
            primary_audience_type=data.get('primary_audience_type'),
            audience_targeting=data.get('audience_targeting', {}),
        )

        # Ensure creator membership
        ProjectMember.objects.update_or_create(
            user=user,
            project=project,
            defaults={'role': 'owner', 'is_active': True},
        )

        # Ensure owner membership
        ProjectMember.objects.update_or_create(
            user=owner,
            project=project,
            defaults={'role': 'owner', 'is_active': True},
        )

        # Set active project
        user.active_project = project
        user.save(update_fields=['active_project'])

        # Invite existing members (basic implementation)
        self._handle_member_invites(project, data.get('invite_members', []))

        # Initialize project services (best-effort)
        try:
            ProjectInitializationService.initialize_project(project)
        except Exception as exc:  # pragma: no cover - safeguard
            logger.warning("Project initialization failed for project %s: %s", project.id, exc)

        project_data = ProjectSerializer(project, context={'request': request}).data
        project_data['is_active'] = True

        return Response(project_data, status=status.HTTP_201_CREATED)

    def _resolve_owner(self, default_owner, owner_id):
        if not owner_id:
            return default_owner
        if owner_id == default_owner.id:
            return default_owner
        try:
            owner = User.objects.get(id=owner_id)
        except User.DoesNotExist:
            return Response({'error': 'Specified owner was not found.'}, status=status.HTTP_400_BAD_REQUEST)
        if owner.organization_id != default_owner.organization_id:
            return Response(
                {'error': 'Owner must belong to the same organization as the creator.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return owner

    def _handle_member_invites(self, project, invite_members):
        if not invite_members:
            return

        for invite in invite_members:
            email = invite.get('email')
            role = invite.get('role', 'member')
            if not email:
                continue

            try:
                invited_user = User.objects.get(email=email)
            except User.DoesNotExist:
                logger.info("Invite skipped for %s (user does not exist yet)", email)
                continue

            ProjectMember.objects.get_or_create(
                user=invited_user,
                project=project,
                defaults={'role': role, 'is_active': True},
            )


class KPISuggestionsView(APIView):
    """Return merged KPI suggestions for provided objectives."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        objectives_param = request.query_params.get('objectives', '')
        objectives = [item.strip() for item in objectives_param.split(',') if item.strip()]

        if not objectives:
            return Response(
                {'error': 'objectives query parameter is required (comma-separated list).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        suggestions = get_kpi_suggestions(objectives)

        return Response(
            {
                'objectives': objectives,
                'suggested_kpis': suggestions,
                'count': len(suggestions),
            }
        )
