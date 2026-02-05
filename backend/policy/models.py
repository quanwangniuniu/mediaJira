from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from task.models import Task

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
    """Types of platform policy changes"""
    TARGETING_RULES = "targeting_rules", "Targeting Rules"
    CONTENT_POLICY = "content_policy", "Content Policy"
    PRIVACY_POLICY = "privacy_policy", "Privacy Policy"
    AD_PLACEMENT = "ad_placement", "Ad Placement"
    BUDGET_POLICY = "budget_policy", "Budget Policy"
    COMPLIANCE_REQUIREMENT = "compliance_requirement", "Compliance Requirement"
    DATA_USAGE = "data_usage", "Data Usage"
    OTHER = "other", "Other"


class MitigationStatus(models.TextChoices):
    """High-level mitigation lifecycle status"""
    NOT_STARTED = "not_started", "Not Started"
    PLANNING = "planning", "Planning"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    REVIEWED = "reviewed", "Reviewed"


class PlatformPolicyUpdate(models.Model):
    """
    Domain model for platform policy updates that impact active campaigns.

    Each PlatformPolicyUpdate is strictly bound to one Task
    with Task.type = "platform_policy_update".

    Access from Task: task.platform_policy_update (OneToOneField reverse via related_name).
    This is the single authoritative policy-update payload for that task.

    Task handles:
    - workflow status
    - approvals
    - attachments
    - comments
    - relations to other tasks

    This model stores policy-specific business data only.
    """

    # --- Task Binding ---
    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name="platform_policy_update",
        null=True,
        blank=True,
        help_text="Associated workflow task (type = platform_policy_update)",
    )

    # --- Platform & Policy Info ---
    platform = models.CharField(
        max_length=50,
        choices=Platform.choices,
        help_text="Advertising platform that issued the policy update",
    )

    policy_change_type = models.CharField(
        max_length=50,
        choices=PolicyChangeType.choices,
        help_text="Type of policy change",
    )

    policy_description = models.TextField(
        help_text="Detailed description of the policy change and implications",
    )

    policy_reference_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Official platform policy or announcement URL",
    )

    effective_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when the policy change becomes effective",
    )

    # --- Affected Scope ---
    affected_campaigns = models.JSONField(
        default=list,
        blank=True,
        help_text="Affected campaign identifiers (IDs, names, external refs)",
    )

    affected_ad_sets = models.JSONField(
        default=list,
        blank=True,
        help_text="Affected ad set identifiers",
    )

    affected_assets = models.JSONField(
        default=list,
        blank=True,
        help_text="Affected asset identifiers or references",
    )

    # --- Impact Assessment ---
    performance_impact = models.TextField(
        blank=True,
        help_text="Potential impact on performance metrics",
    )

    budget_impact = models.TextField(
        blank=True,
        help_text="Potential impact on budget or spend",
    )

    compliance_risk = models.TextField(
        blank=True,
        help_text="Risk if policy change is not addressed",
    )

    # --- Immediate Actions ---
    immediate_actions_required = models.TextField(
        help_text="Immediate actions required to remain compliant",
    )

    action_deadline = models.DateField(
        null=True,
        blank=True,
        help_text="Deadline for required immediate actions",
    )

    # --- Mitigation Tracking ---
    mitigation_status = models.CharField(
        max_length=20,
        choices=MitigationStatus.choices,
        default=MitigationStatus.NOT_STARTED,
        help_text="Current mitigation lifecycle status",
    )

    mitigation_plan = models.TextField(
        blank=True,
        help_text="Mitigation planning notes",
    )

    mitigation_steps = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Step-level mitigation tracking. "
            "Example: "
            "[{'step': '...', 'status': 'pending|in_progress|completed', "
            "'assigned_to': <user_id|null>, 'completed_at': <iso8601|null>}]"
        ),
    )

    mitigation_execution_notes = models.TextField(
        blank=True,
        help_text="Execution notes during mitigation",
    )

    mitigation_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when mitigation was completed",
    )

    mitigation_results = models.TextField(
        blank=True,
        help_text="Results or outcomes after mitigation",
    )

    # --- Post-Mitigation Review ---
    post_mitigation_review = models.TextField(
        blank=True,
        help_text="Review notes after mitigation completion",
    )

    review_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when review was completed",
    )

    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_platform_policy_updates",
        help_text="Reviewer of the post-mitigation outcome",
    )

    all_impacts_addressed = models.BooleanField(
        default=False,
        help_text="Whether all identified impacts were addressed",
    )

    lessons_learned = models.TextField(
        blank=True,
        help_text="Lessons learned for future policy updates",
    )

    # --- Notes & References ---
    notes = models.TextField(
        blank=True,
        help_text="Additional notes (may include links)",
    )

    related_references = models.JSONField(
        default=list,
        blank=True,
        help_text="Additional related references or external links",
    )

    # --- Ownership / Assignment ---
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_platform_policy_updates",
        help_text="User who created this policy update record",
    )

    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_platform_policy_updates",
        help_text="User responsible for handling this policy update",
    )

    # --- Metadata ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_policy_update"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["platform", "mitigation_status"]),
            models.Index(fields=["assigned_to", "mitigation_status"]),
            models.Index(fields=["effective_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"PlatformPolicyUpdate #{self.id} for Task {self.task_id}"

    # --- Validation ---
    def clean(self):
        super().clean()

        # Enforce correct Task type
        if self.task_id and self.task.type != "platform_policy_update":
            raise ValidationError(
                {"task": "Task.type must be 'platform_policy_update'."}
            )

        # Validate mitigation_steps structure
        if self.mitigation_steps:
            if not isinstance(self.mitigation_steps, list):
                raise ValidationError(
                    {"mitigation_steps": "mitigation_steps must be a list."}
                )

            for idx, step in enumerate(self.mitigation_steps):
                if not isinstance(step, dict):
                    raise ValidationError(
                        {"mitigation_steps": f"Item {idx} must be a dictionary."}
                    )

                if "step" not in step or "status" not in step:
                    raise ValidationError(
                        {"mitigation_steps": f"Item {idx} must include 'step' and 'status'."}
                    )

                if step.get("status") not in {
                    "pending",
                    "in_progress",
                    "completed",
                }:
                    raise ValidationError(
                        {
                            "mitigation_steps": (
                                f"Item {idx} has invalid status "
                                f"({step.get('status')})."
                            )
                        }
                    )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    # --- Domain Helpers ---
    def mark_mitigation_completed(self):
        """Mark mitigation as completed."""
        if not self.mitigation_completed_at:
            self.mitigation_completed_at = timezone.now()
        self.mitigation_status = MitigationStatus.COMPLETED
        self.save(
            update_fields=[
                "mitigation_status",
                "mitigation_completed_at",
                "updated_at",
            ]
        )

    def mark_reviewed(self, user=None):
        """Mark post-mitigation review as completed."""
        if not self.review_completed_at:
            self.review_completed_at = timezone.now()
        if user and not self.reviewed_by:
            self.reviewed_by = user
        self.mitigation_status = MitigationStatus.REVIEWED
        self.save(
            update_fields=[
                "mitigation_status",
                "review_completed_at",
                "reviewed_by",
                "updated_at",
            ]
        )
