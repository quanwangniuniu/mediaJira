# backend/decision/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django_fsm import FSMField, transition
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import TimeStampedModel

User = get_user_model()


class Decision(TimeStampedModel):
    """
    Decision Model - Core entity for capturing operational decisions.
    
    Lifecycle: DRAFT → COMMITTED → REVIEWED → ARCHIVED
    After COMMITTED, core fields become immutable.
    """
    
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        COMMITTED = 'COMMITTED', 'Committed'
        REVIEWED = 'REVIEWED', 'Reviewed'
        ARCHIVED = 'ARCHIVED', 'Archived'
    
    class RiskLevel(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
    
    # === Core Decision Fields (immutable after commit) ===
    title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional title for the decision"
    )
    context_summary = models.TextField(
        help_text="Summary of the context that led to this decision"
    )
    reasoning = models.TextField(
        help_text="Explanation of why the selected option was chosen"
    )
    risk_level = models.CharField(
        max_length=10,
        choices=RiskLevel.choices,
        help_text="Expected risk level of this decision"
    )
    confidence = models.IntegerField(
        choices=[(i, str(i)) for i in range(1, 6)],
        help_text="Confidence level (1-5) in this decision"
    )
    
    # === Status & Lifecycle ===
    status = FSMField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        protected=True,
        help_text="Current lifecycle status"
    )
    
    # === Ownership & Commit Info ===
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='authored_decisions',
        help_text="User who created this decision"
    )
    committed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='committed_decisions',
        help_text="User who committed this decision"
    )
    committed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when decision was committed"
    )
    
    # === Approval Flow (for high-risk decisions) ===
    requires_approval = models.BooleanField(
        default=False,
        help_text="Whether this decision requires lead approval before commit"
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_decisions',
        help_text="Lead who approved this high-risk decision"
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when approval was granted"
    )
    is_reference_case = models.BooleanField(
        default=False,
        help_text="Flagged as a reference case by Lead"
    )
    
    # === Metadata ===
    last_edited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='last_edited_decisions',
        help_text="User who last edited this decision"
    )
    
    class Meta:
        db_table = 'decisions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['risk_level']),
            models.Index(fields=['is_reference_case']),
        ]
    
    def __str__(self):
        title_str = self.title or f"Decision #{self.id}"
        return f"{title_str} ({self.get_status_display()})"
    
    # === Immutability Check ===
    def _is_committed(self):
        """Check if decision is committed or beyond"""
        return self.status in [self.Status.COMMITTED, self.Status.REVIEWED, self.Status.ARCHIVED]
    
    def _check_immutability(self, field_name):
        """Raise ValidationError if trying to modify immutable field after commit"""
        if self._is_committed() and self.pk:
            # Check if this field is being changed
            old_instance = Decision.objects.get(pk=self.pk)
            if getattr(old_instance, field_name) != getattr(self, field_name):
                raise ValidationError(
                    f"Cannot modify {field_name} after decision is committed. "
                    f"Current status: {self.get_status_display()}"
                )
    
    def clean(self):
        """Validate decision before save"""
        super().clean()
        
        # Validate required fields before commit
        if self.status == self.Status.COMMITTED:
            if not self.context_summary:
                raise ValidationError("Context summary is required before commit")
            if not self.signals.exists():
                raise ValidationError("At least one Signal is required before commit")
            if self.options.filter(is_selected=True).count() != 1:
                raise ValidationError("Exactly one Option must be selected before commit")
            if not self.reasoning:
                raise ValidationError("Reasoning is required before commit")
        
        # Check immutability for core fields
        if self.pk:
            self._check_immutability('context_summary')
            self._check_immutability('reasoning')
            self._check_immutability('risk_level')
            self._check_immutability('confidence')
    
    def save(self, *args, **kwargs):
        """Override save to enforce immutability"""
        self.clean()
        
        # Track who last edited (only for drafts)
        if self.status == self.Status.DRAFT and hasattr(self, '_current_user'):
            self.last_edited_by = self._current_user
        
        super().save(*args, **kwargs)
    
    # === FSM Transitions ===
    
    @transition(
        field=status,
        source=Status.DRAFT,
        target=Status.COMMITTED,
        conditions=[lambda self: self._can_commit()]
    )
    def commit(self, user=None, confirmation_statements=None):
        """
        Commit the decision.
        
        Args:
            user: User performing the commit
            confirmation_statements: List of confirmation statements (for audit)
        """
        if not self._can_commit():
            raise ValidationError("Cannot commit: validation checks failed")
        
        # Store old state for transition record
        old_state = self.status
        
        # Set commit metadata before transition
        self.committed_by = user
        self.committed_at = timezone.now()
        
        # FSM transition decorator automatically updates status when method is called
        # The @transition decorator handles the state change
        # We just need to save after the transition
        # Note: With protected=True, we cannot directly set status, but @transition handles it
        self.save()
        
        # Create commit record if confirmation statements provided
        if confirmation_statements:
            CommitRecord.objects.create(
                decision=self,
                committed_by=user,
                confirmation_statements=confirmation_statements
            )
        
        # Record state transition
        DecisionStateTransition.objects.create(
            decision=self,
            from_state=old_state,
            to_state=self.Status.COMMITTED,
            triggered_by=user,
            transition_method='commit'
        )
    
    @transition(
        field=status,
        source=Status.COMMITTED,
        target=Status.REVIEWED
    )
    def mark_reviewed(self, user=None):
        """Mark decision as reviewed (after review entry is added)"""
        old_state = self.status
        # FSM transition decorator automatically updates status
        # We just need to save after the transition
        self.save()
        
        DecisionStateTransition.objects.create(
            decision=self,
            from_state=old_state,
            to_state=self.Status.REVIEWED,
            triggered_by=user,
            transition_method='mark_reviewed'
        )
    
    @transition(
        field=status,
        source=[Status.COMMITTED, Status.REVIEWED],
        target=Status.ARCHIVED
    )
    def archive(self, user=None):
        """Archive the decision"""
        old_state = self.status
        # FSM transition decorator automatically updates status
        # We just need to save after the transition
        self.save()
        
        DecisionStateTransition.objects.create(
            decision=self,
            from_state=old_state,
            to_state=self.Status.ARCHIVED,
            triggered_by=user,
            transition_method='archive'
        )
    
    @transition(
        field=status,
        source=Status.ARCHIVED,
        target=Status.DRAFT
    )
    def unarchive(self, user=None):
        """Unarchive decision (admin only)"""
        old_state = self.status
        # FSM transition decorator automatically updates status
        # We just need to save after the transition
        self.save()
        
        DecisionStateTransition.objects.create(
            decision=self,
            from_state=old_state,
            to_state=self.Status.DRAFT,
            triggered_by=user,
            transition_method='unarchive'
        )
    
    # === Helper Methods ===
    
    def _can_commit(self):
        """Check if decision can be committed"""
        # Check required fields
        if not self.context_summary:
            return False
        if not self.signals.exists():
            return False
        if self.options.filter(is_selected=True).count() != 1:
            return False
        if not self.reasoning:
            return False
        
        # Check approval requirement for high-risk
        if self.risk_level == self.RiskLevel.HIGH and self.requires_approval:
            if not self.approved_by or not self.approved_at:
                return False
        
        return True
    
    @property
    def selected_option(self):
        """Get the selected option"""
        return self.options.filter(is_selected=True).first()
    
    @property
    def is_immutable(self):
        """Check if core fields are immutable"""
        return self._is_committed()


class Signal(models.Model):
    """
    Signal Model - Represents triggers or observations that prompted a decision.
    """
    
    class SignalType(models.TextChoices):
        METRIC_CHANGE = 'METRIC_CHANGE', 'Metric Change'
        CLIENT_REQUEST = 'CLIENT_REQUEST', 'Client Request'
        INTUITION = 'INTUITION', 'Intuition'
        ALERT = 'ALERT', 'Alert'
        TREND = 'TREND', 'Trend'
        OTHER = 'OTHER', 'Other'
    
    class Severity(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        CRITICAL = 'CRITICAL', 'Critical'
    
    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='signals',
        help_text="Associated decision"
    )
    type = models.CharField(
        max_length=20,
        choices=SignalType.choices,
        help_text="Type of signal"
    )
    description = models.TextField(
        help_text="Description of the signal"
    )
    severity = models.CharField(
        max_length=10,
        choices=Severity.choices,
        blank=True,
        null=True,
        help_text="Perceived severity of the signal"
    )
    source = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Optional source of the signal"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order of signals"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_signals'
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"Signal: {self.get_type_display()} - {self.description[:50]}"


class Option(models.Model):
    """
    Option Model - Represents a candidate action considered for a decision.
    Exactly one option must be marked as selected before commit.
    """
    
    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='options',
        help_text="Associated decision"
    )
    text = models.TextField(
        help_text="Description of this option"
    )
    is_selected = models.BooleanField(
        default=False,
        help_text="Whether this option was selected"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order of options"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_options'
        ordering = ['order', 'created_at']
    
    def __str__(self):
        selected_str = " [SELECTED]" if self.is_selected else ""
        return f"Option: {self.text[:50]}{selected_str}"
    
    def clean(self):
        """Validate option selection"""
        super().clean()
        
        # If this option is being selected, ensure no other option is selected
        if self.is_selected and self.decision_id:
            other_selected = Option.objects.filter(
                decision_id=self.decision_id,
                is_selected=True
            ).exclude(pk=self.pk)
            
            if other_selected.exists():
                raise ValidationError(
                    "Another option is already selected. "
                    "Only one option can be selected per decision."
                )
    
    def save(self, *args, **kwargs):
        """Override save to enforce single selection"""
        self.clean()
        super().save(*args, **kwargs)


class Review(models.Model):
    """
    Review Model - Post-execution reflection on decision outcome.
    Multiple reviews can be added to a committed decision.
    """
    
    class Quality(models.TextChoices):
        GOOD = 'GOOD', 'Good'
        ACCEPTABLE = 'ACCEPTABLE', 'Acceptable'
        POOR = 'POOR', 'Poor'
    
    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='reviews',
        help_text="Associated decision"
    )
    outcome_text = models.TextField(
        help_text="Summary of what happened after execution"
    )
    reflection_text = models.TextField(
        help_text="What was learned from this decision"
    )
    quality = models.CharField(
        max_length=15,
        choices=Quality.choices,
        help_text="Assessment of decision quality"
    )
    reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='decision_reviews',
        help_text="User who wrote this review"
    )
    reviewed_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this review was created"
    )
    playbook_tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Optional tags linking to playbooks or learning notes"
    )
    
    class Meta:
        db_table = 'decision_reviews'
        ordering = ['-reviewed_at']
    
    def __str__(self):
        return f"Review for Decision #{self.decision_id} - {self.get_quality_display()}"
    
    def save(self, *args, **kwargs):
        """Auto-transition decision to REVIEWED if not already"""
        super().save(*args, **kwargs)
        
        if self.decision.status == Decision.Status.COMMITTED:
            self.decision.mark_reviewed(user=self.reviewer)


class DecisionStateTransition(models.Model):
    """
    Audit trail for decision state transitions.
    Records all lifecycle changes for accountability.
    """
    
    decision = models.ForeignKey(
        Decision,
        on_delete=models.CASCADE,
        related_name='state_transitions',
        help_text="Associated decision"
    )
    from_state = models.CharField(
        max_length=20,
        choices=Decision.Status.choices,
        help_text="Previous state"
    )
    to_state = models.CharField(
        max_length=20,
        choices=Decision.Status.choices,
        help_text="New state"
    )
    transition_method = models.CharField(
        max_length=50,
        help_text="Name of the method that triggered this transition"
    )
    triggered_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decision_transitions',
        help_text="User who triggered this transition"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="When this transition occurred"
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional context about the transition"
    )
    
    class Meta:
        db_table = 'decision_state_transitions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['decision', '-timestamp']),
        ]
    
    def __str__(self):
        return f"Decision {self.decision_id}: {self.get_from_state_display()} → {self.get_to_state_display()}"


class CommitRecord(models.Model):
    """
    Commit Record Model - Records confirmation statements made during commit.
    Optional but recommended for audit purposes.
    """
    
    decision = models.OneToOneField(
        Decision,
        on_delete=models.CASCADE,
        related_name='commit_record',
        help_text="Associated decision"
    )
    committed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='commit_records',
        help_text="User who committed"
    )
    confirmation_statements = models.JSONField(
        default=list,
        help_text="List of confirmation statements checked during commit"
    )
    committed_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Commit timestamp"
    )
    
    class Meta:
        db_table = 'decision_commit_records'
    
    def __str__(self):
        return f"Commit record for Decision #{self.decision_id}"