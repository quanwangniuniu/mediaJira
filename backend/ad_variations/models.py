from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import Project, TimeStampedModel


class CreativeType(models.TextChoices):
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"
    CAROUSEL = "carousel", "Carousel"
    COLLECTION = "collection", "Collection"
    EMAIL = "email", "Email"


class VariationStatus(models.TextChoices):
    DRAFT = "Draft", "Draft"
    LIVE = "Live", "Live"
    TESTING = "Testing", "Testing"
    WINNER = "Winner", "Winner"
    LOSER = "Loser", "Loser"
    PAUSED = "Paused", "Paused"


class AdGroup(TimeStampedModel):
    campaign = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="ad_groups")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")

    def __str__(self) -> str:
        return self.name


class AdVariation(TimeStampedModel):
    campaign = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="ad_variations")
    ad_group = models.ForeignKey(AdGroup, null=True, blank=True, on_delete=models.SET_NULL, related_name="variations")
    name = models.CharField(max_length=255)
    creative_type = models.CharField(max_length=30, choices=CreativeType.choices)
    status = models.CharField(max_length=20, choices=VariationStatus.choices, default=VariationStatus.DRAFT)
    tags = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default="")
    format_payload = models.JSONField(default=dict, blank=True)
    delivery = models.CharField(max_length=100, blank=True, default="")
    bid_strategy = models.CharField(max_length=100, blank=True, default="")
    budget = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.name


class CopyElement(TimeStampedModel):
    variation = models.ForeignKey(AdVariation, on_delete=models.CASCADE, related_name="copy_elements")
    element_key = models.CharField(max_length=120)
    value = models.TextField()
    locale = models.CharField(max_length=40, blank=True, null=True)
    position = models.PositiveIntegerField(null=True, blank=True)
    meta = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]


class VariationPerformance(TimeStampedModel):
    variation = models.ForeignKey(AdVariation, on_delete=models.CASCADE, related_name="performance_entries")
    recorded_at = models.DateTimeField(default=timezone.now)
    metrics = models.JSONField(default=dict)
    trend_indicator = models.CharField(max_length=120, blank=True, null=True)
    observations = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ["-recorded_at"]


class VariationStatusHistory(TimeStampedModel):
    variation = models.ForeignKey(AdVariation, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=20, choices=VariationStatus.choices)
    to_status = models.CharField(max_length=20, choices=VariationStatus.choices)
    reason = models.TextField(blank=True, null=True)
    changed_at = models.DateTimeField(default=timezone.now)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ["-changed_at"]
