from django.db import models
from django.conf import settings
from django.utils import timezone

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True

class Organization(TimeStampedModel):
    name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.name

class Team(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="teams"
    )
    name = models.CharField(max_length=200)
    parent = models.ForeignKey(
        "self", null=True, blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        unique_together = ("organization", "name")

    def __str__(self):
        return f"{self.organization.name} / {self.name}"

class Role(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="roles"
    )
    name = models.CharField(max_length=100)
    level = models.PositiveIntegerField(
        default=10,
        help_text="Lower number = higher privilege"
    )

    class Meta:
        unique_together = ("organization", "name")
        ordering = ["level"]

    def __str__(self):
        return f"{self.name} (Level {self.level})"

class Permission(TimeStampedModel):
    MODULE_CHOICES = [
        ("ASSET", "Asset"),
        ("CAMPAIGN", "Campaign"),
        ("BUDGET", "Budget"),
    ]
    ACTION_CHOICES = [
        ("VIEW", "View"),
        ("EDIT", "Edit"),
        ("APPROVE", "Approve"),
        ("DELETE", "Delete"),
        ("EXPORT", "Export"),
    ]

    module = models.CharField(max_length=20, choices=MODULE_CHOICES)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)

    class Meta:
        unique_together = ("module", "action")

    def __str__(self):
        return f"{self.module}:{self.action}"

class RolePermission(TimeStampedModel):
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="role_permissions"
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name="permission_roles"
    )

    class Meta:
        unique_together = ("role", "permission")

class UserRole(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_roles"
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name="user_roles"
    )
    team = models.ForeignKey(
        Team,
        null=True, blank=True,
        on_delete=models.CASCADE
    )
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "role", "team")

class PermissionApprover(models.Model):
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('permission', 'user')
