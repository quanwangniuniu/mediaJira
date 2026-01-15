"""
Factory classes for core app models.
"""
import factory
from factory import fuzzy
from factory.django import DjangoModelFactory
from faker import Faker
from django.utils import timezone
from datetime import timedelta
import secrets

from core.models import (
    Organization,
    CustomUser,
    Project,
    Team,
    TeamMember,
    TeamRole,
    Role,
    Permission,
    ProjectMember,
    AdChannel,
    ProjectInvitation,
)

fake = Faker()


class OrganizationFactory(DjangoModelFactory):
    """Factory for Organization model"""
    
    class Meta:
        model = Organization
        django_get_or_create = ('name',)
    
    name = factory.LazyAttribute(lambda obj: fake.company())
    email_domain = factory.LazyAttribute(
        lambda obj: fake.domain_name() if fake.boolean(chance_of_getting_true=70) else None
    )
    parent_org = None  # Will be set manually if needed
    desc = factory.LazyAttribute(
        lambda obj: fake.text(max_nb_chars=500) if fake.boolean(chance_of_getting_true=60) else None
    )
    is_parent = False
    is_active = True
    # slug is auto-generated in save() method, so we don't set it


class CustomUserFactory(DjangoModelFactory):
    """Factory for CustomUser model"""
    
    class Meta:
        model = CustomUser
        django_get_or_create = ('email',)
    
    email = factory.LazyAttribute(lambda obj: fake.unique.email())
    username = factory.LazyAttribute(lambda obj: fake.user_name())
    first_name = factory.LazyAttribute(lambda obj: fake.first_name())
    last_name = factory.LazyAttribute(lambda obj: fake.last_name())
    is_verified = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=80))
    verification_token = factory.LazyAttribute(
        lambda obj: secrets.token_urlsafe(32) if fake.boolean(chance_of_getting_true=20) else None
    )
    organization = factory.SubFactory(OrganizationFactory)
    active_project = None  # Will be set manually if needed
    is_staff = False
    is_superuser = False
    is_active = True
    
    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        """Set password - default to 'password123' for testing"""
        password = extracted if extracted else 'password123'
        self.set_password(password)
        if create:
            self.save()


class RoleFactory(DjangoModelFactory):
    """Factory for Role model"""
    
    class Meta:
        model = Role
        django_get_or_create = ('organization', 'name')
    
    organization = factory.SubFactory(OrganizationFactory)
    name = factory.LazyAttribute(lambda obj: fake.job())
    level = factory.LazyAttribute(lambda obj: fake.random_int(min=1, max=20))


class PermissionFactory(DjangoModelFactory):
    """Factory for Permission model"""
    
    class Meta:
        model = Permission
        django_get_or_create = ('module', 'action')
    
    module = factory.Iterator(Permission.MODULE_CHOICES, getter=lambda c: c[0])
    action = factory.Iterator(Permission.ACTION_CHOICES, getter=lambda c: c[0])


class ProjectFactory(DjangoModelFactory):
    """Factory for Project model"""
    
    class Meta:
        model = Project
    
    name = factory.LazyAttribute(lambda obj: fake.catch_phrase())
    description = factory.LazyAttribute(
        lambda obj: fake.text(max_nb_chars=1000) if fake.boolean(chance_of_getting_true=70) else None
    )
    organization = factory.SubFactory(OrganizationFactory)
    owner = factory.SubFactory(CustomUserFactory)
    
    # JSON fields with realistic data
    project_type = factory.LazyAttribute(
        lambda obj: fake.random_elements(
            elements=[
                'paid_social', 'paid_search', 'programmatic', 'influencer_ugc',
                'cross_channel', 'performance', 'brand_campaigns', 'app_acquisition'
            ],
            length=fake.random_int(min=1, max=3),
            unique=True
        )
    )
    
    work_model = factory.LazyAttribute(
        lambda obj: fake.random_elements(
            elements=['solo_buyer', 'small_team', 'multi_team', 'external_agency'],
            length=fake.random_int(min=1, max=2),
            unique=True
        )
    )
    
    advertising_platforms = factory.LazyAttribute(
        lambda obj: fake.random_elements(
            elements=[
                'meta', 'google_ads', 'tiktok', 'linkedin', 'snapchat',
                'twitter', 'pinterest', 'programmatic_dsp', 'reddit'
            ],
            length=fake.random_int(min=1, max=4),
            unique=True
        )
    )
    
    objectives = factory.LazyAttribute(
        lambda obj: fake.random_elements(
            elements=['awareness', 'consideration', 'conversion', 'retention'],
            length=fake.random_int(min=1, max=3),
            unique=True
        )
    )
    
    kpis = factory.LazyAttribute(
        lambda obj: {
            'ctr': {'target': round(fake.pyfloat(min_value=0.01, max_value=0.10, right_digits=3), 3)},
            'cpa': {'target': round(fake.pyfloat(min_value=10, max_value=200, right_digits=2), 2)},
            'roas': {'target': round(fake.pyfloat(min_value=1.5, max_value=5.0, right_digits=2), 2)},
        }
    )
    
    target_kpi_value = factory.LazyAttribute(
        lambda obj: f"CPA target: ${fake.random_int(min=50, max=150)}" if fake.boolean(chance_of_getting_true=60) else None
    )
    
    budget_management_type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Project.BUDGET_MANAGEMENT_CHOICES]
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    
    total_monthly_budget = factory.LazyAttribute(
        lambda obj: fake.pydecimal(
            left_digits=6,
            right_digits=2,
            min_value=1000,
            max_value=1000000
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    
    pacing_enabled = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=60))
    
    budget_config = factory.LazyAttribute(
        lambda obj: {
            'pacing_settings': {
                'target_daily_spend': round(fake.pyfloat(min_value=100, max_value=5000, right_digits=2), 2),
                'alert_threshold': 0.1
            }
        } if fake.boolean(chance_of_getting_true=50) else {}
    )
    
    primary_audience_type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Project.PRIMARY_AUDIENCE_CHOICES]
        ) if fake.boolean(chance_of_getting_true=60) else None
    )
    
    audience_targeting = factory.LazyAttribute(
        lambda obj: {
            'target_regions': fake.random_elements(
                elements=['US', 'CA', 'UK', 'AU', 'DE', 'FR'],
                length=fake.random_int(min=1, max=3),
                unique=True
            ),
            'age_range': {
                'min': fake.random_int(min=18, max=35),
                'max': fake.random_int(min=36, max=65)
            }
        } if fake.boolean(chance_of_getting_true=50) else {}
    )


class TeamFactory(DjangoModelFactory):
    """Factory for Team model"""
    
    class Meta:
        model = Team
        django_get_or_create = ('organization', 'name')
    
    organization = factory.SubFactory(OrganizationFactory)
    name = factory.LazyAttribute(lambda obj: fake.bs())
    parent = None  # Will be set manually if needed
    desc = factory.LazyAttribute(
        lambda obj: fake.text(max_nb_chars=300) if fake.boolean(chance_of_getting_true=50) else None
    )
    is_parent = False


class TeamMemberFactory(DjangoModelFactory):
    """Factory for TeamMember model"""
    
    class Meta:
        model = TeamMember
        django_get_or_create = ('user', 'team')
    
    user = factory.SubFactory(CustomUserFactory)
    team = factory.SubFactory(TeamFactory)
    role_id = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=[TeamRole.LEADER, TeamRole.MEMBER])
    )


class ProjectMemberFactory(DjangoModelFactory):
    """Factory for ProjectMember model"""
    
    class Meta:
        model = ProjectMember
        django_get_or_create = ('user', 'project')
    
    user = factory.SubFactory(CustomUserFactory)
    project = factory.SubFactory(ProjectFactory)
    role = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=['owner', 'member', 'viewer', 'admin'])
    )
    is_active = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=90))


class AdChannelFactory(DjangoModelFactory):
    """Factory for AdChannel model"""
    
    class Meta:
        model = AdChannel
    
    name = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                'Google Ads', 'Facebook Ads', 'Instagram Ads', 'TikTok Ads',
                'LinkedIn Ads', 'Twitter Ads', 'Snapchat Ads', 'Pinterest Ads'
            ]
        )
    )
    project = factory.SubFactory(ProjectFactory)


class ProjectInvitationFactory(DjangoModelFactory):
    """Factory for ProjectInvitation model"""
    
    class Meta:
        model = ProjectInvitation
    
    email = factory.LazyAttribute(lambda obj: fake.email())
    project = factory.SubFactory(ProjectFactory)
    role = factory.LazyAttribute(
        lambda obj: fake.random_element(elements=['owner', 'member', 'viewer'])
    )
    invited_by = factory.SubFactory(CustomUserFactory)
    token = factory.LazyAttribute(lambda obj: secrets.token_urlsafe(32))
    accepted = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=30))
    accepted_at = factory.LazyAttribute(
        lambda obj: timezone.now() - timedelta(days=fake.random_int(min=1, max=30))
        if fake.boolean(chance_of_getting_true=30) else None
    )
    expires_at = factory.LazyAttribute(
        lambda obj: timezone.now() + timedelta(days=fake.random_int(min=1, max=7))
    )
