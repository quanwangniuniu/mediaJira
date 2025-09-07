from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal
from .models import BudgetRequest, BudgetPool
from core.models import Project, AdChannel
from task.models import Task

User = get_user_model()


class BudgetRequestSerializer(serializers.ModelSerializer):
    """Budget Request Serializer"""
    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all(), required=False, allow_null=True)
    requested_by = serializers.ReadOnlyField(source='requested_by.id')
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.01'))
    currency = serializers.CharField(max_length=3, min_length=3)
    status = serializers.ReadOnlyField()
    submitted_at = serializers.ReadOnlyField()
    is_escalated = serializers.ReadOnlyField()
    budget_pool = serializers.ReadOnlyField(source='budget_pool.id')
    current_approver = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    ad_channel = serializers.PrimaryKeyRelatedField(queryset=AdChannel.objects.all(), write_only=True)
    ad_channel_detail = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = BudgetRequest
        fields = [
            'id', 'task', 'requested_by', 'amount', 'currency', 'status',
            'submitted_at', 'is_escalated', 'budget_pool', 'notes', 'current_approver', 'ad_channel', 'ad_channel_detail'
        ]
        read_only_fields = ['id', 'requested_by', 'status', 'submitted_at', 'is_escalated', 'budget_pool']
    
    def get_ad_channel_detail(self, obj):
        """Return ad channel with name for read operations"""
        if obj.ad_channel:
            return {
                'id': obj.ad_channel.id,
                'name': obj.ad_channel.name
            }
        return None
    
    def create(self, validated_data):
        validated_data['requested_by'] = self.context['request'].user

        # If task is provided, find the budget pool for this budget request
        if validated_data.get('task'):
            # ad_channel should be an AdChannel instance from the form
            ad_channel = validated_data.get('ad_channel')
            if ad_channel:
                budget_pool = self.find_budget_pool(validated_data['task'], ad_channel, validated_data['currency'])
                validated_data['budget_pool'] = budget_pool
        else:
            # If no task provided, set budget_pool to None (will be set later when task is linked)
            validated_data['budget_pool'] = None

        return super().create(validated_data)
    
    def find_budget_pool(self, task, ad_channel, currency):
        # Find the budget pool for this budget request via associated task and currency
        budget_pool = BudgetPool.objects.get(
            project=task.project,
            ad_channel=ad_channel,
            currency=currency
        )
        return budget_pool


class ApprovalDecisionSerializer(serializers.Serializer):
    """Approval Decision Serializer"""
    decision = serializers.ChoiceField(choices=['approve', 'reject'])
    comment = serializers.CharField(required=True, allow_blank=False)
    next_approver = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        required=False, 
        help_text="ID of next approver"
    )


class BudgetPoolSerializer(serializers.ModelSerializer):
    """Budget Pool Serializer"""
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    ad_channel = serializers.PrimaryKeyRelatedField(queryset=AdChannel.objects.all())
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.01'))
    used_amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.00'), default=Decimal('0.00'))
    currency = serializers.CharField(max_length=3, min_length=3)
    available_amount = serializers.ReadOnlyField()

    class Meta:
        model = BudgetPool
        fields = [
            'id', 'project', 'ad_channel', 'total_amount', 
            'used_amount', 'available_amount', 'currency'
        ]
        read_only_fields = ['id', 'available_amount']

    def create(self, validated_data):
        """Create budget pool with default used_amount if not provided"""
        # Set used_amount to 0 if not provided
        if 'used_amount' not in validated_data:
            validated_data['used_amount'] = Decimal('0.00')
        
        return super().create(validated_data)




