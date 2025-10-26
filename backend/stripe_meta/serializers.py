from rest_framework import serializers
from stripe_meta.models import Plan, Subscription, UsageDaily, Payment
from core.models import Organization, CustomUser

class PlanSerializer(serializers.ModelSerializer):
    """Serializer for Plan model"""
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'max_team_members', 
            'max_previews_per_day', 'max_tasks_per_day', 'stripe_price_id'
        ]

class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model"""
    organization = serializers.SerializerMethodField()
    plan = PlanSerializer(read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'organization', 'plan', 'stripe_subscription_id',
            'start_date', 'end_date', 'is_active'
        ]
    
    def get_organization(self, obj):
        return {
            'id': obj.organization.id,
            'name': obj.organization.name,
            'slug': obj.organization.slug
        }

class UsageDailySerializer(serializers.ModelSerializer):
    """Serializer for UsageDaily model"""
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = UsageDaily
        fields = ['id', 'user', 'date', 'previews_used', 'tasks_used']
    
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'username': obj.user.username,
            'email': obj.user.email
        }

class CheckoutSessionSerializer(serializers.Serializer):
    """Serializer for checkout session creation"""
    plan_id = serializers.IntegerField(required=True)
    success_url = serializers.URLField(required=True)
    cancel_url = serializers.URLField(required=True)
    
    def validate_plan_id(self, value):
        """Validate that plan exists"""
        try:
            Plan.objects.get(id=value)
        except Plan.DoesNotExist:
            raise serializers.ValidationError("Plan not found")
        return value

class OrganizationSerializer(serializers.ModelSerializer):
    """Serializer for Organization model"""
    class Meta:
        model = Organization
        fields = ['id', 'name', 'slug']
    
    def validate_slug(self, value):
        """Validate that slug is unique"""
        if Organization.objects.filter(slug=value).exists():
            raise serializers.ValidationError("Organization with this slug already exists")
        return value

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    organization = OrganizationSerializer(read_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'organization']
