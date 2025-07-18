from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager

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
        'core.Organization',
        on_delete=models.CASCADE,
        related_name="teams"
    )
    name = models.CharField(max_length=200)
    parent = models.ForeignKey(
        'self', null=True, blank=True,
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

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    is_verified = models.BooleanField(default=False)
    email = models.EmailField(unique=True)
    verification_token = models.CharField(max_length=100, blank=True, null=True)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    objects = CustomUserManager()

    def __str__(self):
        return self.email 