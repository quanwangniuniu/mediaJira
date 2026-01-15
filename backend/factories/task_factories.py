"""
Factory classes for task app models.
"""
import factory
from factory.django import DjangoModelFactory
from faker import Faker
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from datetime import timedelta
import secrets

from task.models import (
    Task,
    ApprovalRecord,
    TaskComment,
    TaskAttachment,
    TaskRelation,
    TaskHierarchy,
)

fake = Faker()


class TaskFactory(DjangoModelFactory):
    """Factory for Task model"""
    
    class Meta:
        model = Task
    
    summary = factory.LazyAttribute(lambda obj: fake.sentence(nb_words=6))
    description = factory.LazyAttribute(
        lambda obj: fake.text(max_nb_chars=1000) if fake.boolean(chance_of_getting_true=80) else None
    )
    status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Task.Status.choices]
        )
    )
    owner = factory.SubFactory('factories.core_factories.CustomUserFactory')
    current_approver = factory.LazyAttribute(
        lambda obj: factory.SubFactory('factories.core_factories.CustomUserFactory').create()
        if fake.boolean(chance_of_getting_true=40) else None
    )
    project = factory.SubFactory('factories.core_factories.ProjectFactory')
    due_date = factory.LazyAttribute(
        lambda obj: fake.date_between(
            start_date='today',
            end_date='+30d'
        ) if fake.boolean(chance_of_getting_true=70) else None
    )
    type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                'budget', 'asset', 'retrospective', 'report', 'execution',
                'scaling', 'alert', 'experiment', 'optimization', 'communication'
            ]
        )
    )
    priority = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in Task.Priority.choices]
        )
    )
    anomaly_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=['NORMAL', 'ANOMALY_DETECTED', 'REVIEW_REQUIRED']
        )
    )
    start_date = factory.LazyAttribute(
        lambda obj: fake.date_between(
            start_date='-30d',
            end_date='today'
        ) if fake.boolean(chance_of_getting_true=60) else None
    )
    is_subtask = False
    order_in_project = factory.LazyAttribute(
        lambda obj: fake.random_int(min=0, max=100)
    )
    # Generic foreign key fields - will be None for seeding
    content_type = None
    object_id = None


class ApprovalRecordFactory(DjangoModelFactory):
    """Factory for ApprovalRecord model"""
    
    class Meta:
        model = ApprovalRecord
        django_get_or_create = ('task', 'step_number')
    
    task = factory.SubFactory(TaskFactory)
    approved_by = factory.SubFactory('factories.core_factories.CustomUserFactory')
    is_approved = factory.LazyAttribute(lambda obj: fake.boolean(chance_of_getting_true=80))
    comment = factory.LazyAttribute(
        lambda obj: fake.text(max_nb_chars=300) if fake.boolean(chance_of_getting_true=60) else None
    )
    step_number = factory.LazyAttribute(lambda obj: fake.random_int(min=1, max=5))


class TaskCommentFactory(DjangoModelFactory):
    """Factory for TaskComment model"""
    
    class Meta:
        model = TaskComment
    
    task = factory.SubFactory(TaskFactory)
    user = factory.SubFactory('factories.core_factories.CustomUserFactory')
    body = factory.LazyAttribute(lambda obj: fake.text(max_nb_chars=500))


class TaskAttachmentFactory(DjangoModelFactory):
    """Factory for TaskAttachment model"""
    
    class Meta:
        model = TaskAttachment
    
    task = factory.SubFactory(TaskFactory)
    # file field will be None for seeding (no actual files)
    file = None
    original_filename = factory.LazyAttribute(
        lambda obj: fake.file_name(extension=fake.random_element(elements=['pdf', 'docx', 'xlsx', 'png', 'jpg']))
    )
    file_size = factory.LazyAttribute(
        lambda obj: fake.random_int(min=1024, max=10485760)  # 1KB to 10MB
    )
    content_type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/png',
                'image/jpeg',
            ]
        )
    )
    checksum = factory.LazyAttribute(
        lambda obj: secrets.token_hex(32) if fake.boolean(chance_of_getting_true=80) else ''
    )
    scan_status = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[
                TaskAttachment.PENDING,
                TaskAttachment.SCANNING,
                TaskAttachment.CLEAN,
                TaskAttachment.ERROR_SCANNING,
            ]
        )
    )
    uploaded_by = factory.SubFactory('factories.core_factories.CustomUserFactory')


class TaskRelationFactory(DjangoModelFactory):
    """Factory for TaskRelation model"""
    
    class Meta:
        model = TaskRelation
        django_get_or_create = ('source_task', 'target_task', 'relationship_type')
    
    source_task = factory.SubFactory(TaskFactory)
    target_task = factory.SubFactory(TaskFactory)
    relationship_type = factory.LazyAttribute(
        lambda obj: fake.random_element(
            elements=[choice[0] for choice in TaskRelation.RELATIONSHIP_TYPE_CHOICES]
        )
    )


class TaskHierarchyFactory(DjangoModelFactory):
    """Factory for TaskHierarchy model"""
    
    class Meta:
        model = TaskHierarchy
        django_get_or_create = ('parent_task', 'child_task')
    
    parent_task = factory.SubFactory(TaskFactory)
    child_task = factory.SubFactory(TaskFactory)
    
    @factory.post_generation
    def mark_child_as_subtask(self, create, extracted, **kwargs):
        """Mark child task as subtask after creation"""
        if create:
            self.child_task.is_subtask = True
            self.child_task.save(update_fields=['is_subtask'])
