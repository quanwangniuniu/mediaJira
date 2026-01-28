"""
Campaign Management Module - Serializers
============================================================================
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from core.models import Project
from core.utils.project import has_project_access
from .models import (
    Campaign,
    CampaignStatusHistory,
    PerformanceCheckIn,
    PerformanceSnapshot,
    CampaignAttachment,
    CampaignTemplate,
)

User = get_user_model()


# ============================================================================
# User and Project Summary Serializers
# ============================================================================

class UserSummarySerializer(serializers.ModelSerializer):
    """Serializer for user summary information"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class ProjectSummarySerializer(serializers.ModelSerializer):
    """Serializer for project summary information"""
    class Meta:
        model = Project
        fields = ['id', 'name']


# ============================================================================
# Campaign Serializers
# ============================================================================

class CampaignSerializer(serializers.ModelSerializer):
    """Full Campaign serializer with all fields"""
    owner = UserSummarySerializer(read_only=True)
    owner_id = serializers.UUIDField(write_only=True, required=True)
    creator = UserSummarySerializer(read_only=True)
    assignee = UserSummarySerializer(read_only=True)
    assignee_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    project = ProjectSummarySerializer(read_only=True)
    project_id = serializers.UUIDField(write_only=True, required=True)
    
    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'objective', 'platforms', 'hypothesis', 'tags',
            'start_date', 'end_date', 'actual_completion_date',
            'owner', 'owner_id', 'creator', 'assignee', 'assignee_id',
            'project', 'project_id', 'budget_estimate',
            'status', 'status_note', 'latest_performance_summary',
            'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = [
            'id', 'creator', 'status', 'actual_completion_date',
            'latest_performance_summary', 'created_at', 'updated_at', 'is_deleted'
        ]

    def validate_platforms(self, value):
        """Validate platforms list"""
        if not value or not isinstance(value, list):
            raise serializers.ValidationError("Platforms must be a non-empty list")
        
        valid_platforms = [choice[0] for choice in Campaign.Platform.choices]
        invalid_platforms = [p for p in value if p not in valid_platforms]
        if invalid_platforms:
            raise serializers.ValidationError(
                f"Invalid platforms: {invalid_platforms}. Must be one of: {valid_platforms}"
            )
        return value

    def validate(self, data):
        """Cross-field validation"""
        # Validate end_date is after start_date
        start_date = data.get('start_date', self.instance.start_date if self.instance else None)
        end_date = data.get('end_date', self.instance.end_date if self.instance else None)
        
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })
        
        return data

    def create(self, validated_data):
        """Create campaign with automatic creator assignment"""
        user = self.context['request'].user
        
        # Set creator
        validated_data['creator'] = user
        
        # Validate project access
        project_id = validated_data.pop('project_id')
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            raise serializers.ValidationError({'project_id': 'Project not found'})
        
        if not has_project_access(user, project):
            raise serializers.ValidationError({
                'project_id': 'You must be a member of this project'
            })
        validated_data['project'] = project
        
        # Validate owner
        owner_id = validated_data.pop('owner_id')
        try:
            owner = User.objects.get(id=owner_id)
        except User.DoesNotExist:
            raise serializers.ValidationError({'owner_id': 'User not found'})
        
        if not has_project_access(owner, project):
            raise serializers.ValidationError({
                'owner_id': 'Owner must be a member of this project'
            })
        validated_data['owner'] = owner
        
        # Handle assignee
        assignee_id = validated_data.pop('assignee_id', None)
        if assignee_id:
            try:
                assignee = User.objects.get(id=assignee_id)
                if not has_project_access(assignee, project):
                    raise serializers.ValidationError({
                        'assignee_id': 'Assignee must be a member of this project'
                    })
                validated_data['assignee'] = assignee
            except User.DoesNotExist:
                raise serializers.ValidationError({'assignee_id': 'User not found'})
        
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update campaign"""
        # Handle project_id if provided
        if 'project_id' in validated_data:
            project_id = validated_data.pop('project_id')
            try:
                project = Project.objects.get(id=project_id)
            except Project.DoesNotExist:
                raise serializers.ValidationError({'project_id': 'Project not found'})
            
            user = self.context['request'].user
            if not has_project_access(user, project):
                raise serializers.ValidationError({
                    'project_id': 'You must be a member of this project'
                })
            validated_data['project'] = project
        
        # Handle owner_id if provided
        if 'owner_id' in validated_data:
            owner_id = validated_data.pop('owner_id')
            try:
                owner = User.objects.get(id=owner_id)
                project = validated_data.get('project', instance.project)
                if not has_project_access(owner, project):
                    raise serializers.ValidationError({
                        'owner_id': 'Owner must be a member of this project'
                    })
                validated_data['owner'] = owner
            except User.DoesNotExist:
                raise serializers.ValidationError({'owner_id': 'User not found'})
        
        # Handle assignee_id if provided
        if 'assignee_id' in validated_data:
            assignee_id = validated_data.pop('assignee_id')
            if assignee_id:
                try:
                    assignee = User.objects.get(id=assignee_id)
                    project = validated_data.get('project', instance.project)
                    if not has_project_access(assignee, project):
                        raise serializers.ValidationError({
                            'assignee_id': 'Assignee must be a member of this project'
                        })
                    validated_data['assignee'] = assignee
                except User.DoesNotExist:
                    raise serializers.ValidationError({'assignee_id': 'User not found'})
            else:
                validated_data['assignee'] = None
        
        return super().update(instance, validated_data)


class CampaignCreateSerializer(CampaignSerializer):
    """Serializer for campaign creation with required fields"""
    class Meta(CampaignSerializer.Meta):
        extra_kwargs = {
            'name': {'required': True},
            'objective': {'required': True},
            'platforms': {'required': True},
            'start_date': {'required': True},
        }


class CampaignUpdateSerializer(serializers.ModelSerializer):
    """Serializer for campaign updates (partial fields only)"""
    class Meta:
        model = Campaign
        fields = [
            'name', 'objective', 'platforms', 'hypothesis', 'tags',
            'end_date', 'budget_estimate', 'status_note',
            'assignee_id'
        ]
        extra_kwargs = {
            'name': {'required': False},
            'objective': {'required': False},
            'platforms': {'required': False},
        }

    assignee_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_platforms(self, value):
        """Validate platforms list"""
        if value is not None:
            valid_platforms = [choice[0] for choice in Campaign.Platform.choices]
            invalid_platforms = [p for p in value if p not in valid_platforms]
            if invalid_platforms:
                raise serializers.ValidationError(
                    f"Invalid platforms: {invalid_platforms}. Must be one of: {valid_platforms}"
                )
        return value


class CampaignStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for campaign status history (read-only)"""
    changed_by = UserSummarySerializer(read_only=True)
    from_status_display = serializers.CharField(source='get_from_status_display', read_only=True)
    to_status_display = serializers.CharField(source='get_to_status_display', read_only=True)
    
    class Meta:
        model = CampaignStatusHistory
        fields = [
            'id', 'campaign', 'from_status', 'from_status_display',
            'to_status', 'to_status_display', 'changed_by', 'note',
            'created_at'
        ]
        read_only_fields = ['id', 'campaign', 'from_status', 'to_status', 'changed_by', 'note', 'created_at']


# ============================================================================
# Performance Tracking Serializers
# ============================================================================

class PerformanceCheckInSerializer(serializers.ModelSerializer):
    """Serializer for performance check-ins"""
    checked_by = UserSummarySerializer(read_only=True)
    sentiment_display = serializers.CharField(source='get_sentiment_display', read_only=True)
    
    class Meta:
        model = PerformanceCheckIn
        fields = [
            'id', 'campaign', 'sentiment', 'sentiment_display',
            'note', 'checked_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'checked_by', 'created_at', 'updated_at']


class PerformanceCheckInCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating performance check-ins"""
    class Meta:
        model = PerformanceCheckIn
        fields = ['campaign', 'sentiment', 'note']

    def create(self, validated_data):
        """Create check-in with automatic user assignment"""
        validated_data['checked_by'] = self.context['request'].user
        return super().create(validated_data)


class PerformanceSnapshotSerializer(serializers.ModelSerializer):
    """Serializer for performance snapshots"""
    snapshot_by = UserSummarySerializer(read_only=True)
    metric_type_display = serializers.CharField(source='get_metric_type_display', read_only=True)
    milestone_type_display = serializers.CharField(source='get_milestone_type_display', read_only=True)
    screenshot_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PerformanceSnapshot
        fields = [
            'id', 'campaign', 'milestone_type', 'milestone_type_display',
            'spend', 'metric_type', 'metric_type_display', 'metric_value',
            'percentage_change', 'notes', 'screenshot', 'screenshot_url',
            'additional_metrics', 'snapshot_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'snapshot_by', 'screenshot_url', 'created_at', 'updated_at'
        ]

    def get_screenshot_url(self, obj):
        """Generate screenshot URL from file field"""
        if obj.screenshot and hasattr(obj.screenshot, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.screenshot.url)
            return obj.screenshot.url
        return None


class PerformanceSnapshotCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating performance snapshots"""
    class Meta:
        model = PerformanceSnapshot
        fields = [
            'campaign', 'milestone_type', 'spend', 'metric_type',
            'metric_value', 'percentage_change', 'notes', 'screenshot',
            'additional_metrics'
        ]

    def create(self, validated_data):
        """Create snapshot with automatic user assignment"""
        validated_data['snapshot_by'] = self.context['request'].user
        return super().create(validated_data)


# ============================================================================
# Campaign Attachment Serializers
# ============================================================================

class CampaignAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for campaign attachments"""
    uploaded_by = UserSummarySerializer(read_only=True)
    asset_type_display = serializers.CharField(source='get_asset_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = CampaignAttachment
        fields = [
            'id', 'campaign', 'file', 'file_url', 'url', 'asset_type',
            'asset_type_display', 'uploaded_by', 'metadata',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'file_url', 'created_at', 'updated_at'
        ]

    def get_file_url(self, obj):
        """Generate file URL from file field"""
        if obj.file and hasattr(obj.file, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class CampaignAttachmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating campaign attachments (supports file or URL)"""
    class Meta:
        model = CampaignAttachment
        fields = ['campaign', 'file', 'url', 'asset_type', 'metadata']

    def validate(self, data):
        """Ensure either file or url is provided"""
        file = data.get('file')
        url = data.get('url')
        
        if not file and not url:
            raise serializers.ValidationError({
                'file': 'Either file or URL must be provided',
                'url': 'Either file or URL must be provided'
            })
        
        return data

    def create(self, validated_data):
        """Create attachment with automatic user assignment"""
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)


# ============================================================================
# Campaign Template Serializers
# ============================================================================

class CampaignTemplateSerializer(serializers.ModelSerializer):
    """Serializer for campaign templates"""
    creator = UserSummarySerializer(read_only=True)
    project = ProjectSummarySerializer(read_only=True)
    sharing_scope_display = serializers.CharField(source='get_sharing_scope_display', read_only=True)
    
    class Meta:
        model = CampaignTemplate
        fields = [
            'id', 'name', 'description', 'creator', 'version_number',
            'sharing_scope', 'sharing_scope_display', 'project', 'project_id',
            'objective', 'platforms', 'hypothesis_framework', 'tag_suggestions',
            'task_checklist', 'review_schedule_pattern', 'decision_point_triggers',
            'recommended_variation_count', 'variation_templates',
            'usage_count', 'is_archived',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'creator', 'usage_count', 'created_at', 'updated_at'
        ]

    project_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    def create(self, validated_data):
        """Create template with automatic creator assignment"""
        validated_data['creator'] = self.context['request'].user
        
        # Handle project_id if provided
        project_id = validated_data.pop('project_id', None)
        if project_id:
            try:
                project = Project.objects.get(id=project_id)
                validated_data['project'] = project
            except Project.DoesNotExist:
                raise serializers.ValidationError({'project_id': 'Project not found'})
        
        return super().create(validated_data)

