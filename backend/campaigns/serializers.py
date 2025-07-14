from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
from decimal import Decimal
from .models import (
    Campaign, CampaignAssignment, CampaignMetric, CampaignNote,
    CampaignStatus, CampaignType
)

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model
    
    Used for displaying user information in campaign-related endpoints
    """
    
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = ['id']
    
    def get_full_name(self, obj):
        """Get user's full name"""
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class CampaignAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for CampaignAssignment model
    
    Handles team member assignments to campaigns with role management
    """
    
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = CampaignAssignment
        fields = [
            'id', 'user', 'user_id', 'role', 'role_display',
            'assigned_at', 'is_active'
        ]
        read_only_fields = ['id', 'assigned_at']
    
    def validate(self, attrs):
        """Validate assignment data"""
        campaign = self.context.get('campaign')
        user = attrs.get('user')
        
        if campaign and user:
            # Check if user is already assigned to this campaign
            existing_assignment = CampaignAssignment.objects.filter(
                campaign=campaign,
                user=user,
                is_active=True
            ).exclude(pk=self.instance.pk if self.instance else None)
            
            if existing_assignment.exists():
                raise serializers.ValidationError({
                    'user_id': 'User is already assigned to this campaign.'
                })
        
        return attrs


class CampaignMetricSerializer(serializers.ModelSerializer):
    """
    Serializer for CampaignMetric model
    
    Handles campaign performance metrics with automatic calculations
    """
    
    class Meta:
        model = CampaignMetric
        fields = [
            'id', 'impressions', 'clicks', 'conversions',
            'cost_per_click', 'cost_per_impression', 'cost_per_conversion',
            'click_through_rate', 'conversion_rate',
            'recorded_at', 'date'
        ]
        read_only_fields = ['id', 'click_through_rate', 'conversion_rate', 'recorded_at']
    
    def validate(self, attrs):
        """Validate metric data"""
        impressions = attrs.get('impressions', 0)
        clicks = attrs.get('clicks', 0)
        conversions = attrs.get('conversions', 0)
        
        # Validate that clicks don't exceed impressions
        if clicks > impressions:
            raise serializers.ValidationError({
                'clicks': 'Clicks cannot exceed impressions.'
            })
        
        # Validate that conversions don't exceed clicks
        if conversions > clicks:
            raise serializers.ValidationError({
                'conversions': 'Conversions cannot exceed clicks.'
            })
        
        return attrs


class CampaignNoteSerializer(serializers.ModelSerializer):
    """
    Serializer for CampaignNote model
    
    Handles campaign notes and comments with privacy controls
    """
    
    author = UserSerializer(read_only=True)
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    
    class Meta:
        model = CampaignNote
        fields = [
            'id', 'title', 'content', 'is_private',
            'author', 'author_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Set the author to the current user"""
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)


class CampaignListSerializer(serializers.ModelSerializer):
    """
    Serializer for Campaign list view
    
    Optimized for listing campaigns with essential information
    """
    
    owner = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    campaign_type_display = serializers.CharField(source='get_campaign_type_display', read_only=True)
    budget_utilization = serializers.FloatField(read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    team_member_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'description', 'campaign_type', 'campaign_type_display',
            'status', 'status_display', 'budget', 'spent_amount', 'budget_utilization',
            'start_date', 'end_date', 'duration_days', 'owner', 'team_member_count',
            'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_team_member_count(self, obj):
        """Get count of active team members"""
        return obj.team_members.filter(campaign_assignments__is_active=True).count()


class CampaignDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for Campaign detail view
    
    Comprehensive campaign information with related data
    """
    
    owner = UserSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    campaign_type_display = serializers.CharField(source='get_campaign_type_display', read_only=True)
    budget_utilization = serializers.FloatField(read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    is_running = serializers.BooleanField(read_only=True)
    is_over_budget = serializers.BooleanField(read_only=True)
    
    # Related data
    assignments = CampaignAssignmentSerializer(many=True, read_only=True)
    metrics = CampaignMetricSerializer(many=True, read_only=True)
    notes = serializers.SerializerMethodField()
    
    # Available status transitions
    available_status_transitions = serializers.SerializerMethodField()
    
    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'description', 'campaign_type', 'campaign_type_display',
            'status', 'status_display', 'budget', 'spent_amount', 'budget_utilization',
            'start_date', 'end_date', 'duration_days', 'owner', 'is_running',
            'is_over_budget', 'is_active', 'tags', 'created_at', 'updated_at',
            'assignments', 'metrics', 'notes', 'available_status_transitions'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_notes(self, obj):
        """Get notes based on user permissions"""
        user = self.context['request'].user
        notes = obj.notes.filter(is_active=True)
        
        # Show private notes only to the author
        if not user.is_superuser:
            notes = notes.filter(
                models.Q(is_private=False) | models.Q(author=user)
            )
        
        return CampaignNoteSerializer(notes, many=True, context=self.context).data
    
    def get_available_status_transitions(self, obj):
        """Get available status transitions for the campaign"""
        current_status = obj.status
        transitions = []
        
        for status_choice in CampaignStatus.choices:
            status_value = status_choice[0]
            if obj.can_transition_to(status_value):
                transitions.append({
                    'value': status_value,
                    'label': status_choice[1]
                })
        
        return transitions


class CampaignCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new campaigns
    
    Handles campaign creation with proper validation and defaults
    """
    
    owner = UserSerializer(read_only=True)
    
    class Meta:
        model = Campaign
        fields = [
            'name', 'description', 'campaign_type', 'budget',
            'start_date', 'end_date', 'tags', 'owner'
        ]
        read_only_fields = ['owner']
    
    def validate(self, attrs):
        """Validate campaign creation data"""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        # Ensure start date is in the future
        if start_date and start_date <= timezone.now():
            raise serializers.ValidationError({
                'start_date': 'Start date must be in the future.'
            })
        
        # Validate date range
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create campaign and assign owner"""
        user = self.context['request'].user
        
        # Handle anonymous users by using a default user
        if user.is_anonymous:
            default_user, created = User.objects.get_or_create(
                username='default_user',
                defaults={
                    'email': 'default@example.com',
                    'first_name': 'Default',
                    'last_name': 'User'
                }
            )
            user = default_user
        
        validated_data['owner'] = user
        campaign = super().create(validated_data)
        
        # Create owner assignment
        CampaignAssignment.objects.create(
            campaign=campaign,
            user=user,
            role='owner'
        )
        
        return campaign


class CampaignUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating campaigns
    
    Handles campaign updates with status transition validation
    """
    
    class Meta:
        model = Campaign
        fields = [
            'name', 'description', 'campaign_type', 'status',
            'budget', 'spent_amount', 'start_date', 'end_date',
            'tags', 'is_active'
        ]
    
    def validate_status(self, value):
        """Validate status transitions"""
        instance = self.instance
        if instance and not instance.can_transition_to(value):
            current_status = instance.get_status_display()
            raise serializers.ValidationError(
                f'Cannot transition from "{current_status}" to "{value}".'
            )
        return value
    
    def validate(self, attrs):
        """Validate update data"""
        # Validate budget vs spent amount
        budget = attrs.get('budget', getattr(self.instance, 'budget', None))
        spent_amount = attrs.get('spent_amount', getattr(self.instance, 'spent_amount', None))
        
        if budget and spent_amount and spent_amount > budget:
            raise serializers.ValidationError({
                'spent_amount': 'Spent amount cannot exceed budget.'
            })
        
        return attrs


class CampaignStatusUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating campaign status
    
    Dedicated serializer for status transitions with validation
    """
    
    status = serializers.ChoiceField(choices=CampaignStatus.choices)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_status(self, value):
        """Validate status transition"""
        campaign = self.context['campaign']
        if not campaign.can_transition_to(value):
            current_status = campaign.get_status_display()
            raise serializers.ValidationError(
                f'Cannot transition from "{current_status}" to "{value}".'
            )
        return value


class CampaignMetricsSummarySerializer(serializers.Serializer):
    """
    Serializer for campaign metrics summary
    
    Provides aggregated metrics for dashboard and reporting
    """
    
    total_impressions = serializers.IntegerField()
    total_clicks = serializers.IntegerField()
    total_conversions = serializers.IntegerField()
    total_spent = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_ctr = serializers.DecimalField(max_digits=5, decimal_places=4)
    average_cvr = serializers.DecimalField(max_digits=5, decimal_places=4)
    average_cpc = serializers.DecimalField(max_digits=8, decimal_places=2)
    average_cpm = serializers.DecimalField(max_digits=8, decimal_places=2)
    budget_utilization = serializers.FloatField()
    days_remaining = serializers.IntegerField() 