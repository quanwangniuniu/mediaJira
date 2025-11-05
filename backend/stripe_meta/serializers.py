from rest_framework import serializers
from stripe_meta.models import Plan, Subscription, UsageDaily, Payment
from core.models import Organization, CustomUser

class PlanSerializer(serializers.ModelSerializer):
    """Serializer for Plan model"""
    price = serializers.SerializerMethodField()
    price_currency = serializers.SerializerMethodField()
    price_id = serializers.CharField(source='stripe_price_id', read_only=True)
    
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'desc', 'max_team_members', 
            'max_previews_per_day', 'max_tasks_per_day', 'stripe_price_id',
            'price', 'price_currency', 'price_id'
        ]
    
    def get_price(self, obj):
        """Get price from Stripe if stripe_price_id exists"""
        if hasattr(obj, '_price'):
            return obj._price
        return None
    
    def get_price_currency(self, obj):
        """Get currency from Stripe if stripe_price_id exists"""
        if hasattr(obj, '_currency'):
            return obj._currency
        return None

class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for Subscription model"""
    plan = PlanSerializer(read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'stripe_subscription_id',
            'start_date', 'end_date', 'is_active'
        ]

class UsageDailySerializer(serializers.ModelSerializer):
    """Serializer for UsageDaily model"""
    
    class Meta:
        model = UsageDaily
        fields = ['id', 'date', 'previews_used', 'tasks_used']

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

class OrganizationUserSerializer(serializers.ModelSerializer):
    """Minimal serializer for listing organization users"""
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class CreateOrganizationSerializer(serializers.Serializer):
    """Serializer for creating a new organization"""
    name = serializers.CharField(max_length=255, help_text="Organization name (required)")
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, help_text="Organization description (optional)")
    email_domain = serializers.CharField(max_length=255, required=False, allow_blank=True, help_text="Organization email domain (optional)")
    
    def validate_name(self, value):
        """Validate organization name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Organization name is required")
        return value.strip()
    
    def validate_email_domain(self, value):
        """Validate email domain format"""
        if value and value.strip():
            domain = value.strip()
            # Basic domain validation
            if not domain.startswith('@'):
                domain = f'@{domain}'
            # Check if it looks like a valid domain
            if '.' not in domain[1:] or len(domain) < 4:
                raise serializers.ValidationError("Please enter a valid email domain (e.g., @company.com)")
            return domain
        return value
