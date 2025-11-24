from django.contrib.auth import get_user_model

from core.models import ProjectMember

User = get_user_model()


def get_user_active_project(user):
    """
    Return the user's active project, falling back to the first active membership.
    """

    if user.active_project:
        has_active_membership = ProjectMember.objects.filter(
            user=user, project=user.active_project, is_active=True
        ).exists()
        if has_active_membership:
            return user.active_project

    membership = (
        ProjectMember.objects.filter(user=user, is_active=True)
        .select_related('project')
        .first()
    )
    if membership:
        user.active_project = membership.project
        user.save(update_fields=['active_project'])
        return membership.project

    return None


def has_project_access(user, project):
    """
    Check whether the user has an active membership for the provided project.
    """

    return ProjectMember.objects.filter(user=user, project=project, is_active=True).exists()


def get_project_members(project):
    """
    Return all active members for the project with related user objects.
    """

    return ProjectMember.objects.filter(project=project, is_active=True).select_related('user')


def initialize_project_dashboards(project):
    """
    Placeholder for initializing dashboards/report templates for a project.
    """

    # TODO: Implement dashboard initialization logic in a later phase.
    return None


def validate_project_config(project):
    """
    Validate core project configuration to ensure data completeness.
    """

    errors = {}

    if not project.name:
        errors['name'] = 'Project name is required.'

    if project.project_type and not isinstance(project.project_type, list):
        errors['project_type'] = 'project_type must be a list.'

    if project.work_model and not isinstance(project.work_model, list):
        errors['work_model'] = 'work_model must be a list.'

    if project.advertising_platforms and not isinstance(project.advertising_platforms, list):
        errors['advertising_platforms'] = 'advertising_platforms must be a list.'

    if not isinstance(project.objectives, list):
        errors['objectives'] = 'objectives must be a list.'
    elif len(project.objectives) == 0:
        errors['objectives'] = 'At least one objective must be specified.'

    if not isinstance(project.kpis, dict):
        errors['kpis'] = 'kpis must be a dictionary.'
    elif len(project.kpis) == 0:
        errors['kpis'] = 'At least one KPI must be configured.'
    else:
        for key, value in project.kpis.items():
            if not isinstance(value, dict):
                errors[f'kpis.{key}'] = 'Each KPI entry must be a dictionary.'

    if project.budget_config and not isinstance(project.budget_config, dict):
        errors['budget_config'] = 'budget_config must be a dictionary.'

    if project.audience_targeting and not isinstance(project.audience_targeting, dict):
        errors['audience_targeting'] = 'audience_targeting must be a dictionary.'

    return len(errors) == 0, errors

