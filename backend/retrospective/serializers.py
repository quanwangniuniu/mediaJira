"""
Serializers for retrospective models
Handles API serialization and deserialization
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from .models import RetrospectiveTask, Insight, RetrospectiveStatus, InsightSeverity
from campaigns.models import CampaignMetric

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


# Remove CampaignKPI serializers, directly use CampaignMetric
# CampaignMetric already has its own serializers in the campaigns app


class InsightListSerializer(serializers.ModelSerializer):
    """Serializer for listing Insight instances"""
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    generated_by_display = serializers.CharField(source='get_generated_by_display', read_only=True)
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = Insight
        fields = [
            'id', 'title', 'description', 'severity', 'severity_display',
            'rule_id', 'generated_by', 'generated_by_display', 'created_by',
            'created_at', 'is_active'
        ]


class InsightDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed Insight instances"""
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    generated_by_display = serializers.CharField(source='get_generated_by_display', read_only=True)
    created_by = UserSerializer(read_only=True)
    suggested_actions = serializers.JSONField(read_only=True)
    triggered_kpis = serializers.JSONField(read_only=True)
    
    class Meta:
        model = Insight
        fields = [
            'id', 'title', 'description', 'severity', 'severity_display',
            'rule_id', 'triggered_kpis', 'suggested_actions', 'generated_by',
            'generated_by_display', 'created_by', 'created_at', 'updated_at', 'is_active'
        ]


class InsightCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Insight instances"""
    class Meta:
        model = Insight
        fields = [
            'title', 'description', 'severity', 'suggested_actions', 'id'
        ]
        read_only_fields = ['id']
    
    def validate_severity(self, value):
        """Validate severity level"""
        if value not in dict(InsightSeverity.choices):
            raise serializers.ValidationError("Invalid severity level")
        return value


class RetrospectiveTaskListSerializer(serializers.ModelSerializer):
    """Serializer for listing RetrospectiveTask instances"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    created_by = UserSerializer(read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    
    class Meta:
        model = RetrospectiveTask
        fields = [
            'id', 'campaign', 'campaign_name', 'status', 'status_display',
            'scheduled_at', 'started_at', 'completed_at', 'duration_formatted',
            'created_by', 'created_at'
        ]
    
    def get_duration_formatted(self, obj):
        """Format duration for display"""
        if obj.duration:
            from .utils import RetrospectiveUtils
            return RetrospectiveUtils.format_duration(obj.duration.total_seconds())
        return None


class RetrospectiveTaskDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed RetrospectiveTask instances"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    campaign_description = serializers.CharField(source='campaign.description', read_only=True)
    created_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    kpi_count = serializers.SerializerMethodField()
    insight_count = serializers.SerializerMethodField()
    
    class Meta:
        model = RetrospectiveTask
        fields = [
            'id', 'campaign', 'campaign_name', 'campaign_description', 'status', 'status_display',
            'scheduled_at', 'started_at', 'completed_at', 'duration_formatted',
            'report_url', 'report_generated_at', 'reviewed_by', 'reviewed_at',
            'created_by', 'created_at', 'updated_at', 'kpi_count', 'insight_count'
        ]
    
    def get_duration_formatted(self, obj):
        """Format duration for display"""
        if obj.duration:
            from .utils import RetrospectiveUtils
            return RetrospectiveUtils.format_duration(obj.duration.total_seconds())
        return None
    
    def get_kpi_count(self, obj):
        """Get count of KPIs for this retrospective using CampaignMetric"""
        from campaigns.models import CampaignMetric
        return CampaignMetric.objects.filter(campaign=obj.campaign).count()
    
    def get_insight_count(self, obj):
        """Get count of insights for this retrospective"""
        return obj.insights.filter(is_active=True).count()


class RetrospectiveTaskCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating RetrospectiveTask instances"""
    class Meta:
        model = RetrospectiveTask
        fields = ['campaign', 'id']
        read_only_fields = ['id']
    
    def validate_campaign(self, value):
        """Validate campaign for retrospective creation"""
        # Check if campaign is completed
        if value.status != 'completed':
            raise serializers.ValidationError(
                "Cannot create retrospective for campaign that is not completed"
            )
        
        # Check if retrospective already exists
        if RetrospectiveTask.objects.filter(campaign=value).exists():
            raise serializers.ValidationError(
                "Retrospective already exists for this campaign"
            )
        
        return value


class RetrospectiveSummarySerializer(serializers.Serializer):
    """Serializer for retrospective summary data"""
    retrospective_id = serializers.CharField()
    campaign_id = serializers.CharField()
    campaign_name = serializers.CharField()
    status = serializers.CharField()
    scheduled_at = serializers.DateTimeField()
    started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    duration_hours = serializers.FloatField(allow_null=True)
    report_url = serializers.URLField(allow_null=True, allow_blank=True)
    report_generated_at = serializers.DateTimeField(allow_null=True)
    reviewed_by = serializers.CharField(allow_null=True)
    reviewed_at = serializers.DateTimeField(allow_null=True)
    kpi_summary = serializers.DictField()
    insights_summary = serializers.DictField()
    created_by = serializers.CharField()
    created_at = serializers.DateTimeField()


class KPIUploadSerializer(serializers.Serializer):
    """Serializer for bulk KPI upload"""
    retrospective_id = serializers.CharField()
    kpi_data = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    
    def validate_kpi_data(self, value):
        """Validate KPI data structure"""
        required_fields = ['metric_name', 'value', 'source']
        
        for kpi in value:
            for field in required_fields:
                if field not in kpi:
                    raise serializers.ValidationError(
                        f"Missing required field '{field}' in KPI data"
                    )
            
            # Validate source - using CampaignMetric sources
            valid_sources = ['internal', 'google_ads', 'facebook', 'tiktok', 'manual']
            if kpi['source'] not in valid_sources:
                raise serializers.ValidationError(
                    f"Invalid source '{kpi['source']}' for KPI"
                )
        
        return value


class InsightGenerationSerializer(serializers.Serializer):
    """Serializer for insight generation request"""
    retrospective_id = serializers.CharField()
    regenerate = serializers.BooleanField(default=False)
    
    def validate_retrospective_id(self, value):
        """Validate retrospective exists"""
        try:
            from .models import RetrospectiveTask
            RetrospectiveTask.objects.get(id=value)
        except RetrospectiveTask.DoesNotExist:
            raise serializers.ValidationError("Retrospective not found")
        return value


class ReportGenerationSerializer(serializers.Serializer):
    """Serializer for report generation request"""
    retrospective_id = serializers.CharField()
    format = serializers.ChoiceField(choices=['pdf', 'pptx'], default='pdf')
    
    def validate_retrospective_id(self, value):
        """Validate retrospective exists and is completed"""
        try:
            from .models import RetrospectiveTask
            retrospective = RetrospectiveTask.objects.get(id=value)
            if retrospective.status != RetrospectiveStatus.COMPLETED:
                raise serializers.ValidationError(
                    "Cannot generate report for retrospective that is not completed"
                )
        except RetrospectiveTask.DoesNotExist:
            raise serializers.ValidationError("Retrospective not found")
        return value


class ReportApprovalSerializer(serializers.Serializer):
    """Serializer for report approval"""
    retrospective_id = serializers.CharField()
    approved = serializers.BooleanField(default=True)
    comments = serializers.CharField(required=False, allow_blank=True)
    
    def validate_retrospective_id(self, value):
        """Validate retrospective exists and has report"""
        try:
            from .models import RetrospectiveTask
            retrospective = RetrospectiveTask.objects.get(id=value)
            if not retrospective.report_url:
                raise serializers.ValidationError(
                    "Cannot approve retrospective without generated report"
                )
            if retrospective.reviewed_by:
                raise serializers.ValidationError(
                    "Retrospective report already approved"
                )
        except RetrospectiveTask.DoesNotExist:
            raise serializers.ValidationError("Retrospective not found")
        return value


class RuleDefinitionSerializer(serializers.Serializer):
    """Serializer for rule definitions"""
    rule_id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField()
    severity = serializers.ChoiceField(choices=InsightSeverity.choices)
    threshold = serializers.FloatField()
    metric = serializers.CharField()
    condition = serializers.ChoiceField(choices=[
        'less_than', 'greater_than', 'equals', 'not_equals'
    ])
    suggested_actions = serializers.ListField(
        child=serializers.CharField(),
        min_length=1
    )


class KPIComparisonSerializer(serializers.Serializer):
    """Serializer for KPI comparison data"""
    metric_name = serializers.CharField()
    current_value = serializers.FloatField()
    target_value = serializers.FloatField(allow_null=True)
    previous_value = serializers.FloatField(allow_null=True)
    percentage_change = serializers.FloatField(allow_null=True)
    unit = serializers.CharField()
    is_on_target = serializers.BooleanField()
    sources = serializers.ListField(child=serializers.CharField()) 