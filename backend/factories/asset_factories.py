"""
Factory classes for asset app models.
"""
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from django.utils import timezone
from django.db import models
from datetime import timedelta
import secrets

from asset.models import (
    Asset,
    AssetVersion,
    AssetComment,
    AssetStateTransition,
    AssetVersionStateTransition,
    ReviewAssignment,
)
from factories.core_factories import TeamFactory, CustomUserFactory

fake = Faker()


class AssetFactory(DjangoModelFactory):
    """Factory for Asset model"""
    
    class Meta:
        model = Asset
    
    task = None  # Will be set manually if needed (requires TaskFactory)
    owner = factory.SubFactory('factories.core_factories.CustomUserFactory')
    team = factory.LazyAttribute(
        lambda obj: TeamFactory.create()
        if fake.boolean(chance_of_getting_true=70) else None
    )
    status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                Asset.NOT_SUBMITTED,
                Asset.PENDING_REVIEW,
                Asset.UNDER_REVIEW,
                Asset.APPROVED,
                Asset.REVISION_REQUIRED,
                Asset.ARCHIVED,
            ]
        )
    )
    tags = factory.LazyAttribute(
        lambda obj: fake.random_elements(
            elements=[
                'creative', 'video', 'image', 'copy', 'banner', 'social',
                'display', 'native', 'retargeting', 'awareness', 'conversion'
            ],
            length=fake.random_int(min=0, max=5),
            unique=True
        )
    )


class AssetVersionFactory(DjangoModelFactory):
    """Factory for AssetVersion model"""
    
    class Meta:
        model = AssetVersion
        django_get_or_create = ('asset', 'version_number')
    
    asset = factory.SubFactory(AssetFactory)
    version_number = factory.LazyAttribute(
        lambda obj: obj.asset.versions.count() + 1 if obj.asset.pk else 1
    )
    file = None  # FileField - will be None for seeding (no actual files)
    uploaded_by = factory.SubFactory('factories.core_factories.CustomUserFactory')
    checksum = factory.LazyAttribute(
        lambda obj: secrets.token_hex(32) if fake.boolean(chance_of_getting_true=50) else ''
    )
    version_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[AssetVersion.DRAFT, AssetVersion.FINALIZED]
        )
    )
    scan_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                AssetVersion.PENDING,
                AssetVersion.SCANNING,
                AssetVersion.CLEAN,
                AssetVersion.ERROR,
            ]
        )
    )
    
    @factory.post_generation
    def set_version_number(self, create, extracted, **kwargs):
        """Set version number based on existing versions"""
        if create and self.asset.pk:
            existing_versions = AssetVersion.objects.filter(asset=self.asset)
            if existing_versions.exists():
                max_version = existing_versions.aggregate(
                    max_version=models.Max('version_number')
                )['max_version'] or 0
                self.version_number = max_version + 1
                self.save()


class AssetCommentFactory(DjangoModelFactory):
    """Factory for AssetComment model"""
    
    class Meta:
        model = AssetComment
    
    asset = factory.SubFactory(AssetFactory)
    user = factory.SubFactory('factories.core_factories.CustomUserFactory')
    body = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=500))


class AssetStateTransitionFactory(DjangoModelFactory):
    """Factory for AssetStateTransition model"""
    
    class Meta:
        model = AssetStateTransition
    
    asset = factory.SubFactory(AssetFactory)
    from_state = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Asset.STATUS_CHOICES]
        )
    )
    to_state = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Asset.STATUS_CHOICES]
        )
    )
    transition_method = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=['submit', 'start_review', 'approve', 'reject', 'acknowledge_rejection', 'archive']
        )
    )
    triggered_by = factory.LazyAttribute(
        lambda obj: CustomUserFactory.create()
        if fake.boolean(chance_of_getting_true=80) else None
    )
    metadata = factory.LazyAttribute(
        lambda obj: {
            'action': obj.transition_method,
            'reason': fake.sentence() if fake.boolean(chance_of_getting_true=30) else None
        }
    )


class AssetVersionStateTransitionFactory(DjangoModelFactory):
    """Factory for AssetVersionStateTransition model"""
    
    class Meta:
        model = AssetVersionStateTransition
    
    asset_version = factory.SubFactory(AssetVersionFactory)
    from_version_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[AssetVersion.DRAFT, AssetVersion.FINALIZED]
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    to_version_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[AssetVersion.DRAFT, AssetVersion.FINALIZED]
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    from_scan_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                AssetVersion.PENDING,
                AssetVersion.SCANNING,
                AssetVersion.CLEAN,
                AssetVersion.INFECTED,
                AssetVersion.ERROR,
            ]
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    to_scan_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                AssetVersion.PENDING,
                AssetVersion.SCANNING,
                AssetVersion.CLEAN,
                AssetVersion.INFECTED,
                AssetVersion.ERROR,
            ]
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    transition_method = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=['finalize', 'start_scan', 'mark_clean', 'mark_infected', 'mark_error']
        )
    )
    triggered_by = factory.LazyAttribute(
        lambda obj: CustomUserFactory.create()
        if fake.boolean(chance_of_getting_true=50) else None
    )
    metadata = factory.LazyAttribute(
        lambda obj: {
            'action': obj.transition_method,
            'virus_name': fake.word() if 'infected' in obj.transition_method else None,
            'error_message': fake.sentence() if 'error' in obj.transition_method else None
        }
    )


class ReviewAssignmentFactory(DjangoModelFactory):
    """Factory for ReviewAssignment model"""
    
    class Meta:
        model = ReviewAssignment
        django_get_or_create = ('asset', 'user', 'role')
    
    asset = factory.SubFactory(AssetFactory)
    user = factory.SubFactory('factories.core_factories.CustomUserFactory')
    role = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in ReviewAssignment.ROLE_CHOICES]
        )
    )
    assigned_by = factory.SubFactory('factories.core_factories.CustomUserFactory')
    valid_until = factory.LazyAttribute(
        lambda obj: timezone.now() + timedelta(days=fake.random_int(min=1, max=30))
        if fake.boolean(chance_of_getting_true=60) else None
    )
