from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from decimal import Decimal
import uuid


class CampaignStatus(models.TextChoices):
    """
    Campaign status choices representing the workflow states
    
    DRAFT: Initial state when campaign is being planned
    ACTIVE: Campaign is currently running
    PAUSED: Campaign is temporarily stopped
    COMPLETED: Campaign has finished successfully
    CANCELLED: Campaign was cancelled before completion
    """
    DRAFT = 'draft', 'Draft'
    ACTIVE = 'active', 'Active'
    PAUSED = 'paused', 'Paused'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class CampaignType(models.TextChoices):
    """
    Types of advertising campaigns supported by the platform
    """
    DIGITAL_DISPLAY = 'digital_display', 'Digital Display'
    SOCIAL_MEDIA = 'social_media', 'Social Media'
    SEARCH_ENGINE = 'search_engine', 'Search Engine'
    VIDEO = 'video', 'Video'
    AUDIO = 'audio', 'Audio'
    PRINT = 'print', 'Print'
    OUTDOOR = 'outdoor', 'Outdoor'
    INFLUENCER = 'influencer', 'Influencer Marketing'


class Campaign(models.Model):
    """
    Core Campaign model representing advertising campaigns
    
    This model stores all essential campaign information including:
    - Basic campaign details (name, description, type)
    - Financial information (budget, costs)
    - Timeline and scheduling
    - Status and workflow management
    - Team assignments and ownership
    """
    
    # Primary identification
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=200,
        help_text="Campaign name that will be displayed throughout the platform"
    )
    description = models.TextField(
        blank=True,
        help_text="Detailed description of the campaign objectives and strategy"
    )
    
    # Campaign classification
    campaign_type = models.CharField(
        max_length=20,
        choices=CampaignType.choices,
        default=CampaignType.DIGITAL_DISPLAY,
        help_text="Type of advertising campaign"
    )
    status = models.CharField(
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.DRAFT,
        help_text="Current status of the campaign"
    )
    
    # Financial information
    budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Total allocated budget for the campaign"
    )
    spent_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Amount spent so far on the campaign"
    )
    
    # Timeline and scheduling
    start_date = models.DateTimeField(
        help_text="When the campaign should start"
    )
    end_date = models.DateTimeField(
        help_text="When the campaign should end"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Team and ownership
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_campaigns',
        help_text="Primary owner of the campaign"
    )
    team_members = models.ManyToManyField(
        User,
        through='CampaignAssignment',
        related_name='assigned_campaigns',
        help_text="Team members assigned to this campaign"
    )
    
    # Campaign settings
    is_active = models.BooleanField(default=True)
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Campaign'
        verbose_name_plural = 'Campaigns'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['campaign_type']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['owner']),
        ]
    
    def __str__(self):
        """String representation of the campaign"""
        return f"{self.name} ({self.get_status_display()})"
    
    def clean(self):
        """Custom validation for campaign data"""
        super().clean()
        
        # Validate date range
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValidationError({
                    'end_date': 'End date must be after start date.'
                })
        
        # Validate budget
        if self.budget and self.spent_amount:
            if self.spent_amount > self.budget:
                raise ValidationError({
                    'spent_amount': 'Spent amount cannot exceed budget.'
                })
    
    @property
    def budget_utilization(self) -> float:
        """Calculate budget utilization percentage"""
        if self.budget == 0:
            return 0.0
        return (self.spent_amount / self.budget) * 100
    
    @property
    def is_over_budget(self) -> bool:
        """Check if campaign is over budget"""
        return self.spent_amount > self.budget
    
    @property
    def duration_days(self) -> int:
        """Calculate campaign duration in days"""
        if self.start_date and self.end_date:
            return (self.end_date - self.start_date).days
        return 0
    
    @property
    def is_running(self) -> bool:
        """Check if campaign is currently running"""
        now = timezone.now()
        return (
            self.status == CampaignStatus.ACTIVE and
            self.start_date <= now <= self.end_date
        )
    
    def can_transition_to(self, new_status: str) -> bool:
        """Check if status transition is valid"""
        valid_transitions = {
            CampaignStatus.DRAFT: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
            CampaignStatus.ACTIVE: [CampaignStatus.PAUSED, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED],
            CampaignStatus.PAUSED: [CampaignStatus.ACTIVE, CampaignStatus.CANCELLED],
            CampaignStatus.COMPLETED: [],
            CampaignStatus.CANCELLED: [],
        }
        return new_status in valid_transitions.get(self.status, [])


class CampaignAssignment(models.Model):
    """
    Through model for campaign team assignments
    
    This model manages the relationship between campaigns and team members,
    including role assignments and permissions.
    """
    
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('manager', 'Manager'),
        ('analyst', 'Analyst'),
        ('viewer', 'Viewer'),
    ]
    
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='campaign_assignments'
    )
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='viewer',
        help_text="Role of the user in this campaign"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['campaign', 'user']
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.campaign.name} ({self.get_role_display()})"


class CampaignMetric(models.Model):
    """
    Campaign performance metrics and analytics
    
    This model stores various performance metrics for campaigns,
    allowing for detailed analytics and reporting.
    """
    
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='metrics'
    )
    
    # Basic metrics
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    conversions = models.PositiveIntegerField(default=0)
    
    # Financial metrics
    cost_per_click = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    cost_per_impression = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=Decimal('0.0000')
    )
    cost_per_conversion = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Calculated metrics
    click_through_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0000'),
        validators=[MinValueValidator(Decimal('0.0000')), MaxValueValidator(Decimal('1.0000'))]
    )
    conversion_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.0000'),
        validators=[MinValueValidator(Decimal('0.0000')), MaxValueValidator(Decimal('1.0000'))]
    )
    
    # Timestamp for when metrics were recorded
    recorded_at = models.DateTimeField(auto_now_add=True)
    date = models.DateField(auto_now_add=True)
    
    class Meta:
        ordering = ['-recorded_at']
        unique_together = ['campaign', 'date']
        indexes = [
            models.Index(fields=['campaign', 'date']),
            models.Index(fields=['recorded_at']),
        ]
    
    def __str__(self):
        return f"{self.campaign.name} - {self.date} ({self.impressions} impressions)"
    
    def save(self, *args, **kwargs):
        """Calculate derived metrics before saving"""
        if self.impressions > 0:
            self.click_through_rate = Decimal(str(self.clicks / self.impressions))
            if self.clicks > 0:
                self.conversion_rate = Decimal(str(self.conversions / self.clicks))
        
        super().save(*args, **kwargs)


class CampaignNote(models.Model):
    """
    Notes and comments for campaigns
    
    This model allows team members to add notes, comments,
    and observations about campaigns for better collaboration.
    """
    
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name='notes'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='campaign_notes'
    )
    title = models.CharField(max_length=200)
    content = models.TextField()
    is_private = models.BooleanField(
        default=False,
        help_text="Private notes are only visible to the author"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
            
    def __str__(self):
        return f"{self.title} - {self.campaign.name}" 