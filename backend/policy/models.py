from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()


class Platform(models.TextChoices):
    """Supported advertising platforms"""
    META = "meta", "Meta (Facebook/Instagram)"
    GOOGLE_ADS = "google_ads", "Google Ads"
    TIKTOK = "tiktok", "TikTok"
    LINKEDIN = "linkedin", "LinkedIn"
    TWITTER = "twitter", "Twitter/X"
    SNAPCHAT = "snapchat", "Snapchat"
    PINTEREST = "pinterest", "Pinterest"
    OTHER = "other", "Other"


class PolicyChangeType(models.TextChoices):
    """Types of policy changes"""
    TARGETING_RULES = "targeting_rules", "Targeting Rules"
    CONTENT_POLICY = "content_policy", "Content Policy"
    PRIVACY_POLICY = "privacy_policy", "Privacy Policy"
    AD_PLACEMENT = "ad_placement", "Ad Placement"
    BUDGET_POLICY = "budget_policy", "Budget Policy"
    COMPLIANCE_REQUIREMENT = "compliance_requirement", "Compliance Requirement"
    DATA_USAGE = "data_usage", "Data Usage"
    OTHER = "other", "Other"


class MitigationStatus(models.TextChoices):
    """Status of mitigation efforts"""
    NOT_STARTED = "not_started", "Not Started"
    PLANNING = "planning", "Planning"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    REVIEWED = "reviewed", "Reviewed"


class PlatformPolicyUpdate(models.Model):
    """
    Platform Policy Update Task Model
    
    This task is created when a platform updates rules or policies that affect 
    ongoing campaigns. For example, Meta changes targeting rules for a specific 
    vertical, requiring adjustments to active campaigns.
    
    The task documents the platform, type of policy change, affected campaigns/ad sets, 
    and any immediate actions needed to remain compliant. Users can describe the 
    potential impact on performance or budget.
    
    The task tracks mitigation steps, including planning and execution, and allows 
    users to update the task with completion status and results of the adjustments. 
    Notes support linking to relevant campaigns, assets, or policy documentation.
    
    Finally, the task allows review after mitigation to ensure all impacts were 
    addressed and to record lessons for future platform updates.
    
    Note: This model is linked to Task via GenericForeignKey pattern.
    Use Task.link_to_object(policy_update_instance) to establish the link.
    """
    
    # --- Platform and Policy Information ---
    platform = models.CharField(
        max_length=50,
        choices=Platform.choices,
        help_text="The advertising platform that updated its policies",
    )
    
    policy_change_type = models.CharField(
        max_length=50,
        choices=PolicyChangeType.choices,
        help_text="Type of policy change (e.g., targeting rules, content policy)",
    )
    
    policy_description = models.TextField(
        help_text="Detailed description of the policy change and its implications",
    )
    
    policy_reference_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Link to official policy documentation or announcement",
    )
    
    effective_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when the policy change takes effect",
    )
    
    # --- Affected Campaigns/Ad Sets ---
    affected_campaigns = models.JSONField(
        default=list,
        blank=True,
        help_text="List of affected campaign IDs, names, or identifiers",
    )
    
    affected_ad_sets = models.JSONField(
        default=list,
        blank=True,
        help_text="List of affected ad set IDs, names, or identifiers",
    )
    
    affected_assets = models.JSONField(
        default=list,
        blank=True,
        help_text="List of affected asset IDs or references",
    )
    
    # --- Impact Assessment ---
    performance_impact = models.TextField(
        blank=True,
        help_text="Description of potential impact on campaign performance metrics",
    )
    
    budget_impact = models.TextField(
        blank=True,
        help_text="Description of potential impact on budget allocation or spending",
    )
    
    compliance_risk = models.TextField(
        blank=True,
        help_text="Assessment of compliance risks if actions are not taken",
    )
    
    # --- Immediate Actions ---
    immediate_actions_required = models.TextField(
        help_text="Immediate actions needed to remain compliant with the new policy",
    )
    
    action_deadline = models.DateField(
        null=True,
        blank=True,
        help_text="Deadline for completing immediate actions",
    )
    
    # --- Mitigation Tracking ---
    mitigation_status = models.CharField(
        max_length=20,
        choices=MitigationStatus.choices,
        default=MitigationStatus.NOT_STARTED,
        help_text="Current status of mitigation efforts",
    )
    
    mitigation_plan = models.TextField(
        blank=True,
        help_text="Detailed plan for mitigating the impact of the policy change",
    )
    
    mitigation_steps = models.JSONField(
        default=list,
        blank=True,
        help_text="List of mitigation steps with status tracking. Format: [{'step': 'description', 'status': 'pending|in_progress|completed', 'assigned_to': user_id, 'completed_at': datetime}]",
    )
    
    mitigation_execution_notes = models.TextField(
        blank=True,
        help_text="Notes on the execution of mitigation steps",
    )
    
    mitigation_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when mitigation was completed",
    )
    
    mitigation_results = models.TextField(
        blank=True,
        help_text="Results and outcomes of the mitigation efforts",
    )
    
    # --- Post-Mitigation Review ---
    post_mitigation_review = models.TextField(
        blank=True,
        help_text="Review after mitigation to ensure all impacts were addressed",
    )
    
    review_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when post-mitigation review was completed",
    )
    
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_policy_updates",
        help_text="User who completed the post-mitigation review",
    )
    
    all_impacts_addressed = models.BooleanField(
        default=False,
        help_text="Whether all impacts have been addressed and verified",
    )
    
    # --- Lessons Learned ---
    lessons_learned = models.TextField(
        blank=True,
        help_text="Lessons learned for handling future platform policy updates",
    )
    
    # --- Additional Notes and References ---
    notes = models.TextField(
        blank=True,
        help_text="Additional notes linking to relevant campaigns, assets, or policy documentation",
    )
    
    related_references = models.JSONField(
        default=list,
        blank=True,
        help_text="Links or references to campaigns, assets, policy documentation, or external resources",
    )
    
    # --- Metadata ---
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_policy_updates",
        help_text="User who created this policy update task",
    )
    
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_policy_updates",
        help_text="User responsible for handling this policy update",
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "platform_policy_update"
        ordering = ["-created_at"]
        verbose_name = "Platform Policy Update"
        verbose_name_plural = "Platform Policy Updates"
    
    def __str__(self) -> str:
        return f"PlatformPolicyUpdate #{self.id} - {self.get_platform_display()} ({self.get_policy_change_type_display()})"
    
    def clean(self):
        """Validate model data"""
        super().clean()
        
        # Note: We don't validate affected entities here to allow draft creation
        # without all fields filled. Validation can be done at the API/serializer level
        # when the task is submitted.
        
        # Validate mitigation_steps format if provided
        if self.mitigation_steps:
            for step in self.mitigation_steps:
                if not isinstance(step, dict):
                    raise ValidationError(
                        "Each mitigation step must be a dictionary."
                    )
                required_fields = ['step', 'status']
                for field in required_fields:
                    if field not in step:
                        raise ValidationError(
                            f"Mitigation step must include '{field}' field."
                        )
                if step.get('status') not in ['pending', 'in_progress', 'completed']:
                    raise ValidationError(
                        "Mitigation step status must be one of: pending, in_progress, completed"
                    )
    
    def save(self, *args, **kwargs):
        """Override save to run validation"""
        self.clean()
        super().save(*args, **kwargs)
    
    def mark_mitigation_completed(self):
        """Mark mitigation as completed"""
        if not self.mitigation_completed_at:
            self.mitigation_completed_at = timezone.now()
        if self.mitigation_status != MitigationStatus.COMPLETED:
            self.mitigation_status = MitigationStatus.COMPLETED
        self.save(update_fields=['mitigation_status', 'mitigation_completed_at'])
    
    def mark_reviewed(self, user: User | None = None):
        """Mark post-mitigation review as completed"""
        if not self.review_completed_at:
            self.review_completed_at = timezone.now()
        if user and not self.reviewed_by:
            self.reviewed_by = user
        if self.mitigation_status != MitigationStatus.REVIEWED:
            self.mitigation_status = MitigationStatus.REVIEWED
        self.save(update_fields=['mitigation_status', 'review_completed_at', 'reviewed_by'])
