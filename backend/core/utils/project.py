from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence

from django.contrib.auth import get_user_model

from core.models import Project, ProjectMember

PROJECT_TYPE_CHOICES = [
    'paid_social',
    'paid_search',
    'programmatic',
    'influencer_ugc',
    'cross_channel',
    'performance',
    'brand_campaigns',
    'app_acquisition',
]
WORK_MODEL_CHOICES = [
    'solo_buyer',
    'small_team',
    'multi_team',
    'external_agency',
]
ADVERTISING_PLATFORM_CHOICES = [
    'meta',
    'google_ads',
    'tiktok',
    'linkedin',
    'snapchat',
    'twitter',
    'pinterest',
    'programmatic_dsp',
    'reddit',
    'other',
]
OBJECTIVE_CHOICES = [
    'awareness',
    'consideration',
    'conversion',
    'retention_loyalty',
]
PRIMARY_AUDIENCE_CHOICES = [choice[0] for choice in Project.PRIMARY_AUDIENCE_CHOICES]

OBJECTIVE_WIDGET_LIBRARY = {
    'awareness': [
        {'type': 'chart', 'metric': 'reach', 'title': 'Reach Trend (30d)'},
        {'type': 'chart', 'metric': 'impressions', 'title': 'Impression Breakdown'},
    ],
    'consideration': [
        {'type': 'chart', 'metric': 'ctr', 'title': 'CTR vs Target'},
        {'type': 'table', 'metric': 'engagement', 'title': 'Engagement Summary'},
    ],
    'conversion': [
        {'type': 'chart', 'metric': 'cpa', 'title': 'CPA Trend'},
        {'type': 'chart', 'metric': 'roas', 'title': 'ROAS vs Goal'},
    ],
    'retention_loyalty': [
        {'type': 'chart', 'metric': 'repeat_rate', 'title': 'Repeat Purchase Rate'},
        {'type': 'chart', 'metric': 'ltv', 'title': 'LTV vs CAC'},
    ],
}
PLATFORM_WIDGET_LIBRARY = {
    'meta': {'type': 'table', 'metric': 'meta_performance', 'title': 'Meta Campaigns'},
    'google_ads': {'type': 'table', 'metric': 'google_performance', 'title': 'Google Campaigns'},
    'tiktok': {'type': 'table', 'metric': 'tiktok_performance', 'title': 'TikTok Campaigns'},
    'linkedin': {'type': 'table', 'metric': 'linkedin_performance', 'title': 'LinkedIn Campaigns'},
    'default': {'type': 'table', 'metric': 'channel_performance', 'title': 'Channel Performance'},
}

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
    Build default dashboard definitions for a project.
    """

    objectives = project.objectives or ['awareness']
    kpi_cards = _build_kpi_cards(project.kpis or {})
    overview_widgets: List[Dict[str, Any]] = [
        {'type': 'objective_summary', 'objectives': objectives},
        {'type': 'kpi_cards', 'cards': kpi_cards},
    ]

    for objective in objectives:
        overview_widgets.extend(OBJECTIVE_WIDGET_LIBRARY.get(objective, []))

    dashboards: List[Dict[str, Any]] = [
        {
            'slug': 'overview',
            'title': 'Performance Overview',
            'description': 'Objective-level KPI tracking generated during onboarding.',
            'widgets': overview_widgets,
            'variables': {
                'objectives': objectives,
                'kpi_count': len(kpi_cards),
            },
        }
    ]

    if project.advertising_platforms:
        dashboards.append(
            {
                'slug': 'channel-breakdown',
                'title': 'Channel Performance',
                'description': 'Platform-level drill down cards and tables.',
                'widgets': _build_platform_widgets(project.advertising_platforms),
                'variables': {
                    'platforms': project.advertising_platforms,
                },
            }
        )

    if project.budget_management_type or project.total_monthly_budget:
        dashboards.append(
            {
                'slug': 'budget-pacing',
                'title': 'Budget & Pacing',
                'description': 'Allocation, pacing, and burn tracking seeded from onboarding.',
                'widgets': _build_budget_widgets(project),
                'variables': {
                    'budget_management_type': project.budget_management_type,
                    'total_monthly_budget': str(project.total_monthly_budget)
                    if project.total_monthly_budget is not None
                    else None,
                },
            }
        )

    return dashboards


def validate_project_config(project):
    """
    Validate core project configuration to ensure data completeness.
    """

    errors = {}

    if not project.name:
        errors['name'] = 'Project name is required.'

    _validate_list_field(project.project_type, 'project_type', errors, PROJECT_TYPE_CHOICES, allow_empty=True)
    _validate_list_field(project.work_model, 'work_model', errors, WORK_MODEL_CHOICES, allow_empty=True)
    _validate_list_field(
        project.advertising_platforms,
        'advertising_platforms',
        errors,
        ADVERTISING_PLATFORM_CHOICES,
        allow_empty=True,
    )
    _validate_list_field(project.objectives, 'objectives', errors, OBJECTIVE_CHOICES, allow_empty=True)

    if not isinstance(project.kpis, dict):
        errors['kpis'] = 'kpis must be a dictionary.'
    elif project.kpis:
        for key, value in project.kpis.items():
            if not isinstance(value, dict):
                errors[f'kpis.{key}'] = 'Each KPI entry must be a dictionary.'
                continue
            target = value.get('target')
            if target is not None and not _is_numeric(target):
                errors[f'kpis.{key}.target'] = 'Target must be numeric.'
            suggested_by = value.get('suggested_by') or []
            if not isinstance(suggested_by, list):
                errors[f'kpis.{key}.suggested_by'] = 'suggested_by must be a list.'
            else:
                invalid_objectives = [item for item in suggested_by if item not in OBJECTIVE_CHOICES]
                if invalid_objectives:
                    errors[f'kpis.{key}.suggested_by'] = (
                        f'Invalid objectives: {", ".join(sorted(set(invalid_objectives)))}.'
                    )

    if (
        project.budget_management_type
        and project.budget_management_type not in dict(Project.BUDGET_MANAGEMENT_CHOICES)
    ):
        errors['budget_management_type'] = 'budget_management_type is not supported.'

    if project.total_monthly_budget is not None and project.total_monthly_budget <= 0:
        errors['total_monthly_budget'] = 'total_monthly_budget must be positive.'

    if project.budget_config and not isinstance(project.budget_config, dict):
        errors['budget_config'] = 'budget_config must be a dictionary.'

    if project.audience_targeting and not isinstance(project.audience_targeting, dict):
        errors['audience_targeting'] = 'audience_targeting must be a dictionary.'

    if (
        project.primary_audience_type
        and project.primary_audience_type not in PRIMARY_AUDIENCE_CHOICES
    ):
        errors['primary_audience_type'] = 'primary_audience_type is not supported.'

    return len(errors) == 0, errors


def _validate_list_field(
    value: Optional[Sequence[str]],
    field_name: str,
    errors: Dict[str, str],
    allowed_values: Sequence[str],
    allow_empty: bool,
) -> None:
    if value is None:
        if allow_empty:
            return
        errors[field_name] = f'{field_name} must be provided.'
        return

    if not isinstance(value, list):
        errors[field_name] = f'{field_name} must be a list.'
        return

    if not value and not allow_empty:
        errors[field_name] = f'At least one {field_name} entry is required.'
        return

    invalid_values = [item for item in value if item not in allowed_values]
    if invalid_values:
        errors[field_name] = f'Unsupported values: {", ".join(sorted(set(invalid_values)))}.'


def _is_numeric(value: Any) -> bool:
    if isinstance(value, (int, float, Decimal)):
        return True
    try:
        Decimal(str(value))
        return True
    except Exception:
        return False


def _build_kpi_cards(kpis: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
    cards = []
    for kpi_key, meta in kpis.items():
        cards.append(
            {
                'kpi': kpi_key,
                'label': meta.get('label') or kpi_key.replace('_', ' ').title(),
                'target': meta.get('target'),
                'suggested_by': meta.get('suggested_by', []),
            }
        )
    return cards


def _build_platform_widgets(platforms: Sequence[str]) -> List[Dict[str, Any]]:
    widgets: List[Dict[str, Any]] = []
    for platform in platforms:
        template = PLATFORM_WIDGET_LIBRARY.get(platform, PLATFORM_WIDGET_LIBRARY['default'])
        widgets.append(
            {
                **template,
                'platform': platform,
            }
        )
    return widgets


def _build_budget_widgets(project) -> List[Dict[str, Any]]:
    structures = (project.budget_config or {}).get('budget_structures', [])
    return [
        {
            'type': 'gauge',
            'metric': 'spend_vs_budget',
            'target': str(project.total_monthly_budget) if project.total_monthly_budget else None,
        },
        {
            'type': 'table',
            'metric': 'budget_structures',
            'rows': structures,
        },
    ]
