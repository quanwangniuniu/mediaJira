"""
Campaign Management Module - Services
============================================================================

Keep business logic out of ViewSets (KISS).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError as DRFValidationError

from core.models import Project
from core.utils.project import has_project_access
from .models import Campaign, CampaignTemplate

User = get_user_model()


class CampaignService:
    @staticmethod
    def assert_campaign_access(*, user, campaign: Campaign) -> None:
        if not has_project_access(user, campaign.project):
            raise PermissionDenied('You do not have access to this campaign.')

    @staticmethod
    @transaction.atomic
    def transition_status(*, campaign: Campaign, transition: str, user, status_note: Optional[str] = None) -> Campaign:
        """
        Run a django-fsm transition by name, persist, and return the updated campaign.
        """
        CampaignService.assert_campaign_access(user=user, campaign=campaign)

        if status_note is not None:
            campaign.status_note = status_note

        try:
            fn = getattr(campaign, transition)
        except AttributeError:
            raise DRFValidationError({'transition': f'Unknown transition: {transition}'})

        try:
            fn(user=user)
            campaign.save()
        except ValidationError as e:
            raise DRFValidationError(str(e))

        return campaign

    @staticmethod
    @transaction.atomic
    def soft_delete(*, campaign: Campaign) -> None:
        if campaign.status != Campaign.Status.PLANNING:
            raise DRFValidationError({
                'status': 'Only campaigns in PLANNING status can be deleted directly.'
            })
        campaign.is_deleted = True
        campaign.save(update_fields=['is_deleted'])


class TemplateService:
    @staticmethod
    def _resolve_template_project(*, user, sharing_scope: str, project_id: Optional[str]) -> Optional[Project]:
        if sharing_scope in (CampaignTemplate.SharingScope.TEAM, CampaignTemplate.SharingScope.ORGANIZATION):
            if not project_id:
                raise DRFValidationError({'project_id': 'project_id is required for TEAM/ORGANIZATION templates'})
            project = Project.objects.filter(id=project_id).first()
            if not project:
                raise DRFValidationError({'project_id': 'Project not found'})
            if not has_project_access(user, project):
                raise PermissionDenied('You do not have access to this project.')
            return project
        return None

    @staticmethod
    @transaction.atomic
    def save_campaign_as_template(
        *,
        campaign: Campaign,
        user,
        name: str,
        description: Optional[str] = None,
        sharing_scope: str = CampaignTemplate.SharingScope.PERSONAL,
        project_id: Optional[str] = None,
    ) -> CampaignTemplate:
        """
        Save campaign structure as a template.

        Auto-versioning policy:
        - If a non-archived template with same (scope+name) exists, archive it and create next version.
        """
        CampaignService.assert_campaign_access(user=user, campaign=campaign)

        name = (name or '').strip()
        if not name:
            raise DRFValidationError({'name': 'name is required'})

        template_project = TemplateService._resolve_template_project(
            user=user,
            sharing_scope=sharing_scope,
            project_id=project_id,
        )

        existing_qs = CampaignTemplate.objects.filter(
            name=name,
            sharing_scope=sharing_scope,
            is_archived=False,
        )
        if sharing_scope == CampaignTemplate.SharingScope.PERSONAL:
            existing_qs = existing_qs.filter(creator=user)
        else:
            existing_qs = existing_qs.filter(project=template_project)

        existing = existing_qs.order_by('-version_number', '-created_at').first()
        next_version = (existing.version_number + 1) if existing else 1
        if existing:
            existing.is_archived = True
            existing.save(update_fields=['is_archived', 'updated_at'])

        template = CampaignTemplate.objects.create(
            name=name,
            description=description,
            creator=user,
            version_number=next_version,
            sharing_scope=sharing_scope,
            project=template_project,
            # capture structure defaults from campaign
            objective=campaign.objective,
            platforms=campaign.platforms or [],
            hypothesis_framework=campaign.hypothesis,
            tag_suggestions=campaign.tags or [],
            # keep workflow fields minimal for MVP
            task_checklist=[],
            review_schedule_pattern={},
            decision_point_triggers=[],
            recommended_variation_count=3,
            variation_templates=[],
        )

        return template

    @staticmethod
    @transaction.atomic
    def create_campaign_from_template(
        *,
        template: CampaignTemplate,
        user,
        name: str,
        project_id: str,
        owner_id: str,
        start_date=None,
        end_date=None,
        assignee_id: Optional[str] = None,
        objective: Optional[str] = None,
        platforms=None,
        hypothesis: Optional[str] = None,
        tags=None,
        budget_estimate=None,
    ) -> Campaign:
        """
        Create a campaign from a template (apply template).
        """
        name = (name or '').strip()
        if not name:
            raise DRFValidationError({'name': 'name is required'})
        if not project_id:
            raise DRFValidationError({'project': 'project is required'})
        if not owner_id:
            raise DRFValidationError({'owner': 'owner is required'})

        project = Project.objects.filter(id=project_id).first()
        if not project:
            raise DRFValidationError({'project': 'Project not found'})
        if not has_project_access(user, project):
            raise PermissionDenied('You do not have access to this project.')

        owner = User.objects.filter(id=owner_id).first()
        if not owner:
            raise DRFValidationError({'owner': 'User not found'})
        if not has_project_access(owner, project):
            raise DRFValidationError({'owner': 'Owner must be a member of this project'})

        assignee = None
        if assignee_id:
            assignee = User.objects.filter(id=assignee_id).first()
            if not assignee:
                raise DRFValidationError({'assignee': 'User not found'})
            if not has_project_access(assignee, project):
                raise DRFValidationError({'assignee': 'Assignee must be a member of this project'})

        start_date_value = start_date or timezone.now().date()

        campaign = Campaign.objects.create(
            name=name,
            project=project,
            owner=owner,
            creator=user,
            assignee=assignee,
            objective=objective or template.objective,
            platforms=platforms or template.platforms or [],
            hypothesis=hypothesis if hypothesis is not None else template.hypothesis_framework,
            tags=tags or template.tag_suggestions or [],
            start_date=start_date_value,
            end_date=end_date,
            budget_estimate=budget_estimate,
        )

        # Enforce model-level constraints (start_date rules, etc.)
        campaign.full_clean()
        campaign.save()

        return campaign


