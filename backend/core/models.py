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
    email_domain = models.CharField(max_length=100, blank=True, null=True, help_text="Email domain for SSO organization matching (e.g., 'agencyX.com')")
    parent_org = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='child_organizations'
    )
    desc = models.TextField(blank=True, null=True)
    is_parent = models.BooleanField(default=False)

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
        on_delete=models.SET_NULL,
        related_name='child_teams'
    )
    desc = models.TextField(blank=True, null=True)
    is_parent = models.BooleanField(default=False)

    class Meta:
        unique_together = ("organization", "name")

    def __str__(self):
        return f"{self.organization.name} / {self.name}"

# Team Role Constants
class TeamRole:
    """Team-level role constants"""
    LEADER = 2
    MEMBER = 3
    
    CHOICES = [
        (LEADER, 'Team Leader'),
        (MEMBER, 'Member'),
    ]
    
    @classmethod
    def get_role_name(cls, role_id):
        """Get role name by ID"""
        role_map = dict(cls.CHOICES)
        return role_map.get(role_id, 'Unknown')
    
    @classmethod
    def is_valid_role(cls, role_id):
        """Check if role ID is valid"""
        return role_id in [cls.LEADER, cls.MEMBER]
    
    @classmethod
    def can_manage_team(cls, role_id):
        """Check if role can manage team members"""
        return role_id == cls.LEADER

class TeamMember(TimeStampedModel):
    """Team membership model for managing user-team relationships"""
    user = models.ForeignKey(
        'core.CustomUser',
        on_delete=models.CASCADE,
        related_name='team_memberships'
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='members'
    )
    role_id = models.IntegerField(
        choices=TeamRole.CHOICES,
        default=TeamRole.MEMBER,
        help_text="Role of the user in this team"
    )

    class Meta:
        unique_together = ['user', 'team']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.team.name} ({TeamRole.get_role_name(self.role_id)})"

    @property
    def role_name(self):
        """Get the role name for this membership"""
        return TeamRole.get_role_name(self.role_id)

    @property
    def is_leader(self):
        """Check if this member is a team leader"""
        return self.role_id == TeamRole.LEADER

class Role(TimeStampedModel):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="roles",
        null=True,
        blank=True,
        help_text="Organization this role belongs to. Leave empty for super admin roles."
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
        ("BUDGET_REQUEST", "Budget Request"),
        ("BUDGET_POOL", "Budget Pool"),
        ("BUDGET_ESCALATION", "Budget Escalation"),
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

class Project(TimeStampedModel):
    name = models.CharField(max_length=200)
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="projects"
    )

    def __str__(self):
        return self.name

class AdChannel(TimeStampedModel):
    name = models.CharField(max_length=200)
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="ad_channels"
    )

    def __str__(self):
        return self.name


