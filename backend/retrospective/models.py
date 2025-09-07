from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid

def get_user_model_lazy():
    """Lazy evaluation of User model to avoid import-time Django setup issues"""
    return get_user_model()


class RetrospectiveStatus(models.TextChoices):
    """Status choices for retrospective tasks"""
    SCHEDULED = 'scheduled', 'Scheduled'
    IN_PROGRESS = 'in_progress', 'In Progress'
    COMPLETED = 'completed', 'Completed'
    REPORTED = 'reported', 'Reported'
    CANCELLED = 'cancelled', 'Cancelled'


class InsightSeverity(models.TextChoices):
    """Severity levels for insights"""
    LOW = 'low', 'Low'
    MEDIUM = 'medium', 'Medium'
    HIGH = 'high', 'High'
    CRITICAL = 'critical', 'Critical'


class RetrospectiveTask(models.Model):
    """
    Model for managing retrospective tasks triggered by campaign completion
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Campaign relationship (now referencing core.Project but keeping field name 'campaign' for backward-compat)
    campaign = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='retrospectives',
        help_text="Campaign this retrospective is for"
    )
    
    # Task management
    status = models.CharField(
        max_length=20,
        choices=RetrospectiveStatus.choices,
        default=RetrospectiveStatus.SCHEDULED,
        help_text="Current status of the retrospective task"
    )
    
    # Scheduling
    scheduled_at = models.DateTimeField(
        default=timezone.now,
        help_text="When the retrospective was scheduled"
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the retrospective analysis started"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the retrospective analysis completed"
    )
    
    # Report management
    report_url = models.URLField(
        blank=True,
        null=True,
        help_text="URL to the generated report (PDF/PPT)"
    )
    report_generated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the report was generated"
    )
    
    # Approval workflow
    reviewed_by = models.ForeignKey(
        get_user_model_lazy(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_retrospectives',
        help_text="User who reviewed and approved the report"
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the report was reviewed"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        get_user_model_lazy(),
        on_delete=models.CASCADE,
        related_name='created_retrospectives',
        help_text="User who created this retrospective"
    )
    
    class Meta:
        ordering = ['-scheduled_at']  # Order by scheduled time to avoid conflicts with Campaign
        verbose_name = 'Retrospective Task'
        verbose_name_plural = 'Retrospective Tasks'
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),  # Composite index to avoid conflicts
            models.Index(fields=['campaign', 'status']),  # Composite index to avoid conflicts
            models.Index(fields=['created_by', 'status']),  # New user status index
        ]
    
    def __str__(self):
        return f"Retrospective for {self.campaign.name} ({self.get_status_display()})"
    
    def clean(self):
        """Custom validation"""
        super().clean()
        
        if self.completed_at and self.started_at:
            if self.completed_at < self.started_at:
                raise ValidationError({
                    'completed_at': 'Completed time cannot be before started time.'
                })
    
    @property
    def duration(self):
        """Calculate duration of retrospective analysis"""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    def can_transition_to(self, new_status: str) -> bool:
        """Check if status transition is valid"""
        valid_transitions = {
            RetrospectiveStatus.SCHEDULED: [RetrospectiveStatus.IN_PROGRESS, RetrospectiveStatus.CANCELLED],
            RetrospectiveStatus.IN_PROGRESS: [RetrospectiveStatus.COMPLETED, RetrospectiveStatus.CANCELLED],
            RetrospectiveStatus.COMPLETED: [RetrospectiveStatus.REPORTED],
            RetrospectiveStatus.REPORTED: [],
            RetrospectiveStatus.CANCELLED: [],
        }
        return new_status in valid_transitions.get(self.status, [])


# Remove CampaignKPI model, directly use campaigns.CampaignMetric
# This avoids duplication and conflicts, reusing existing KPI data model


class Insight(models.Model):
    """
    Model for storing rule-based insights generated from KPI analysis
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relationships
    retrospective = models.ForeignKey(
        RetrospectiveTask,
        on_delete=models.CASCADE,
        related_name='insights',
        help_text="Retrospective task this insight belongs to"
    )
    
    # Link to CampaignMetric instead of CampaignKPI
    # Access CampaignMetric through campaign: retrospective.campaign.metrics.all()
    
    # Insight details
    title = models.CharField(
        max_length=200,
        help_text="Title of the insight"
    )
    description = models.TextField(
        help_text="Detailed description of the insight"
    )
    severity = models.CharField(
        max_length=20,
        choices=InsightSeverity.choices,
        default=InsightSeverity.MEDIUM,
        help_text="Severity level of the insight"
    )
    
    # Rule information
    rule_id = models.CharField(
        max_length=100,
        blank=True,
        help_text="ID of the rule that triggered this insight"
    )
    triggered_kpis = models.JSONField(
        default=list,
        help_text="List of KPI IDs that triggered this insight"
    )
    
    # Action suggestions
    suggested_actions = models.JSONField(
        default=list,
        help_text="List of suggested actions to address the insight"
    )
    
    # User management
    created_by = models.ForeignKey(
        get_user_model_lazy(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_insights',
        help_text="User who created this insight (if manual)"
    )
    generated_by = models.CharField(
        max_length=20,
        choices=[
            ('rule_engine', 'Rule Engine'),
            ('manual', 'Manual Entry'),
            ('ai', 'AI Generated'),
        ],
        default='rule_engine',
        help_text="How this insight was generated"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-severity', '-created_at']  # Keep unique, no conflicts
        verbose_name = 'Insight'
        verbose_name_plural = 'Insights'
        indexes = [
            models.Index(fields=['severity', 'created_at']),  # Composite index for query optimization
            models.Index(fields=['rule_id', 'severity']),  # Composite index for query optimization
            models.Index(fields=['generated_by', 'created_at']),  # Composite index for query optimization
            models.Index(fields=['retrospective', 'severity']),  # New composite index
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_severity_display()})"
    
    @property
    def is_manual(self) -> bool:
        """Check if insight was manually created"""
        return self.generated_by == 'manual'
    
    @property
    def is_rule_generated(self) -> bool:
        """Check if insight was generated by rule engine"""
        return self.generated_by == 'rule_engine' 


class CampaignMetric(models.Model):
    """
    Local KPI storage for retrospectives, replacing the removed campaigns app model.
    References core.Project but keeps attribute name 'campaign' for compatibility.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='retrospective_metrics'
    )
    impressions = models.IntegerField(default=0)
    clicks = models.IntegerField(default=0)
    conversions = models.IntegerField(default=0)
    cost_per_click = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_per_impression = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost_per_conversion = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    click_through_rate = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    conversion_rate = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    date = models.DateField()
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('campaign', 'date')
