from django.db import models
from django.contrib.auth import get_user_model
from django_fsm import FSMField

from core.models import TimeStampedModel

User = get_user_model()


class Decision(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        AWAITING_APPROVAL = 'AWAITING_APPROVAL', 'Awaiting Approval'
        COMMITTED = 'COMMITTED', 'Committed'
        REVIEWED = 'REVIEWED', 'Reviewed'
        ARCHIVED = 'ARCHIVED', 'Archived'

    class RiskLevel(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'

    title = models.CharField(max_length=255, null=True, blank=True)
    context_summary = models.TextField(null=True, blank=True)
    reasoning = models.TextField(null=True, blank=True)
    risk_level = models.CharField(max_length=10, choices=RiskLevel.choices, null=True, blank=True)
    confidence = models.IntegerField(
        choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')],
        null=True,
        blank=True,
    )
    status = FSMField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        protected=True,
    )

    requires_approval = models.BooleanField(default=False)
    committed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    is_reference_case = models.BooleanField(default=False)

    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='authored_decisions',
    )
    last_edited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='last_edited_decisions',
    )
    committed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='committed_decisions',
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_decisions',
    )

    class Meta:
        db_table = 'decisions'
        ordering = ['-created_at']

    def __str__(self):
        return f"Decision #{self.id}"


class Signal(TimeStampedModel):
    class SignalType(models.TextChoices):
        PERFORMANCE = 'PERFORMANCE', 'Performance'
        CLIENT = 'CLIENT', 'Client'
        PLATFORM = 'PLATFORM', 'Platform'
        INTUITION = 'INTUITION', 'Intuition'
        OTHER = 'OTHER', 'Other'

    class SignalSeverity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'

    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='signals',
    )
    type = models.CharField(max_length=20, choices=SignalType.choices)
    description = models.TextField()
    severity = models.CharField(
        max_length=10,
        choices=SignalSeverity.choices,
        null=True,
        blank=True,
    )
    source = models.CharField(max_length=255, null=True, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'decision_signals'
        ordering = ['order', 'created_at']


class Option(TimeStampedModel):
    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='options',
    )
    text = models.TextField()
    is_selected = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'decision_options'
        ordering = ['order', 'created_at']


class Review(TimeStampedModel):
    class DecisionQuality(models.TextChoices):
        GOOD = 'GOOD', 'Good'
        ACCEPTABLE = 'ACCEPTABLE', 'Acceptable'
        POOR = 'POOR', 'Poor'

    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='reviews',
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='decision_reviews',
    )
    outcome_text = models.TextField()
    reflection_text = models.TextField()
    quality = models.CharField(max_length=20, choices=DecisionQuality.choices)
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'decision_reviews'
        ordering = ['-reviewed_at']


class DecisionStateTransition(TimeStampedModel):
    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='state_transitions',
    )
    from_status = models.CharField(max_length=20, choices=Decision.Status.choices)
    to_status = models.CharField(max_length=20, choices=Decision.Status.choices)
    transition_method = models.CharField(max_length=50)
    metadata = models.JSONField(null=True, blank=True)
    triggered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decision_transitions',
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'decision_state_transitions'
        ordering = ['-timestamp']


class CommitRecord(TimeStampedModel):
    decision = models.OneToOneField(
        Decision,
        on_delete=models.CASCADE,
        related_name='commit_record',
    )
    committed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decision_commit_records',
    )
    committed_at = models.DateTimeField(auto_now_add=True)
    validation_snapshot = models.JSONField(null=True, blank=True)

    class Meta:
        db_table = 'decision_commit_records'
