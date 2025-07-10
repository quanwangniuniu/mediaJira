from django.db import models
# from django.core.validators import MinValueValidator, MaxValueValidator
# from django.utils import timezone
# from django.contrib.auth.models import User
# from django.core.exceptions import ValidationError
# from decimal import Decimal
# import uuid


class Organization(models.Model):
    name = models.CharField(max_length=255)
    parent_org_id = models.IntegerField(null=True, blank=True)
    desc = models.TextField(blank=True, null=True)
    is_parent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'organizations'

class Team(models.Model):
    name = models.CharField(max_length=255)
    organization_id = models.IntegerField()
    desc = models.TextField(blank=True, null=True)
    parent_team_id = models.IntegerField(null=True, blank=True)
    is_parent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'teams'

class TeamMember(models.Model):
    user_id = models.IntegerField()
    team_id = models.IntegerField()
    role_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'team_members'
        unique_together = ['user_id', 'team_id']
    
    def __str__(self):
        return f"{self.title} - {self.campaign.name}" 