from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.models import Organization, Project, ProjectMember

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """Lightweight representation of a user."""

    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name']

    def get_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.username or obj.email


class OrganizationSummarySerializer(serializers.ModelSerializer):
    """Lightweight representation of an organization."""

    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug']


class ProjectSerializer(serializers.ModelSerializer):
    """Full project serializer with membership metadata."""

    organization = OrganizationSummarySerializer(read_only=True)
    owner = UserSummarySerializer(read_only=True)
    is_active = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'name',
            'description',
            'organization',
            'owner',
            'project_type',
            'work_model',
            'advertising_platforms',
            'objectives',
            'kpis',
            'target_kpi_value',
            'budget_management_type',
            'total_monthly_budget',
            'pacing_enabled',
            'budget_config',
            'primary_audience_type',
            'audience_targeting',
            'created_at',
            'updated_at',
            'is_active',
            'member_count',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_active(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return request.user.active_project_id == obj.id
        return False

    def get_member_count(self, obj):
        return ProjectMember.objects.filter(project=obj, is_active=True).count()


class ProjectSummarySerializer(serializers.ModelSerializer):
    """Compact serializer for listing projects."""

    owner = UserSummarySerializer(read_only=True)
    is_active = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'owner', 'objectives', 'is_active', 'member_count']

    def get_is_active(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            return request.user.active_project_id == obj.id
        return False

    def get_member_count(self, obj):
        return ProjectMember.objects.filter(project=obj, is_active=True).count()


class ProjectMemberSerializer(serializers.ModelSerializer):
    """Serializer for project memberships."""

    user = UserSummarySerializer(read_only=True)
    project = ProjectSummarySerializer(read_only=True)

    class Meta:
        model = ProjectMember
        fields = ['id', 'user', 'project', 'role', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectMemberInviteSerializer(serializers.Serializer):
    """Serializer for inviting members to a project."""

    email = serializers.EmailField(required=True)
    role = serializers.ChoiceField(choices=[('owner', 'Owner'), ('member', 'Member'), ('viewer', 'Viewer')], default='member')


PROJECT_TYPE_CHOICES = [
    'paid_social',
    'paid_search',
    'programmatic',
    'influencer_ugc',
    'cross_channel',
    'performance',
    'brand_campaigns',
    'app_acquisition',
]

WORK_MODEL_CHOICES = [
    'solo_buyer',
    'small_team',
    'multi_team',
    'external_agency',
]

ADVERTISING_PLATFORM_CHOICES = [
    'meta',
    'google_ads',
    'tiktok',
    'linkedin',
    'snapchat',
    'twitter',
    'pinterest',
    'programmatic_dsp',
    'reddit',
    'other',
]


class ProjectOnboardingSerializer(serializers.Serializer):
    """Serializer for multi-step onboarding payload validation."""

    # SECTION 1: Project Basics
    name = serializers.CharField(max_length=200, required=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # SECTION 2: Project Type & Work Model (JSONField lists)
    project_type = serializers.ListField(
        child=serializers.ChoiceField(choices=PROJECT_TYPE_CHOICES), required=False, allow_empty=True
    )
    work_model = serializers.ListField(
        child=serializers.ChoiceField(choices=WORK_MODEL_CHOICES), required=False, allow_empty=True
    )

    # SECTION 3: Advertising Platforms
    advertising_platforms = serializers.ListField(
        child=serializers.ChoiceField(choices=ADVERTISING_PLATFORM_CHOICES), required=False, allow_empty=True
    )
    advertising_platforms_other = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # SECTION 4: Objectives & KPIs
    OBJECTIVE_CHOICES = ['awareness', 'consideration', 'conversion', 'retention_loyalty']
    objectives = serializers.ListField(
        child=serializers.ChoiceField(choices=OBJECTIVE_CHOICES),
        required=True,
        min_length=1,
        help_text="At least one objective must be selected",
    )
    kpis = serializers.DictField(
        required=True,
        help_text="Structured KPI data: {'ctr': {'target': 0.02, 'suggested_by': ['awareness']}}",
    )

    # SECTION 5: Budget & Pacing
    budget_management_type = serializers.ChoiceField(
        choices=Project.BUDGET_MANAGEMENT_CHOICES, required=False, allow_null=True
    )
    total_monthly_budget = serializers.DecimalField(
        max_digits=15, decimal_places=2, required=False, allow_null=True, min_value=0
    )
    pacing_enabled = serializers.BooleanField(required=False, default=False)
    budget_config = serializers.DictField(required=False, allow_empty=True)

    # SECTION 6: Audience & Targeting
    primary_audience_type = serializers.ChoiceField(
        choices=Project.PRIMARY_AUDIENCE_CHOICES, required=False, allow_null=True
    )
    target_regions = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True, help_text="Array of ISO region identifiers"
    )
    audience_targeting = serializers.DictField(required=False, allow_empty=True)

    # SECTION 7: Team & Collaboration
    owner_id = serializers.IntegerField(required=False, allow_null=True)
    invite_members = ProjectMemberInviteSerializer(many=True, required=False)

    def validate_project_type(self, value):
        return value or []

    def validate_work_model(self, value):
        return value or []

    def validate_advertising_platforms(self, value):
        return value or []

    def validate_objectives(self, value):
        if not value:
            raise serializers.ValidationError("At least one objective must be selected.")
        invalid = [item for item in value if item not in self.OBJECTIVE_CHOICES]
        if invalid:
            raise serializers.ValidationError(f"Invalid objectives: {invalid}")
        return value

    def validate_kpis(self, value):
        if not value or not isinstance(value, dict):
            raise serializers.ValidationError("KPIs must be a dictionary with at least one KPI entry.")
        for kpi_key, kpi_data in value.items():
            if not isinstance(kpi_data, dict):
                raise serializers.ValidationError(
                    f"KPI '{kpi_key}' must be a dictionary with 'target' and optional 'suggested_by'."
                )
            if 'target' in kpi_data and kpi_data['target'] is not None:
                try:
                    float(kpi_data['target'])
                except (TypeError, ValueError):
                    raise serializers.ValidationError(f"KPI '{kpi_key}' target must be numeric.")
            suggested_by = kpi_data.get('suggested_by')
            if suggested_by is not None and not isinstance(suggested_by, list):
                raise serializers.ValidationError(f"KPI '{kpi_key}' suggested_by must be a list.")
        return value

    def validate(self, attrs):
        target_regions = attrs.get('target_regions')
        if target_regions:
            audience_targeting = attrs.get('audience_targeting', {})
            audience_targeting['target_regions'] = target_regions
            attrs['audience_targeting'] = audience_targeting
        return attrs

