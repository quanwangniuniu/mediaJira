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
    budget_pool_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    budget_pool = serializers.ReadOnlyField(source='budget_pool.id')
    current_approver = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    ad_channel = serializers.PrimaryKeyRelatedField(queryset=AdChannel.objects.all(), write_only=True)
    ad_channel_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BudgetRequest
        fields = [
            'id', 'task', 'requested_by', 'amount', 'currency', 'status',
            'submitted_at', 'is_escalated', 'budget_pool', 'budget_pool_id', 'notes', 'current_approver', 'ad_channel', 'ad_channel_detail'
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

        # Extract budget_pool_id if provided
        budget_pool_id = validated_data.pop('budget_pool_id', None)

        # If task is provided, find or use the budget pool for this budget request
        if validated_data.get('task'):
            ad_channel = validated_data.get('ad_channel')
            currency = validated_data.get('currency')

            # If budget_pool_id is explicitly provided, validate and use it
            if budget_pool_id:
                try:
                    budget_pool = BudgetPool.objects.get(
                        id=budget_pool_id,
                        project=validated_data['task'].project,
                        ad_channel=ad_channel,
                        currency=currency
                    )
                    validated_data['budget_pool'] = budget_pool
                except BudgetPool.DoesNotExist:
                    raise serializers.ValidationError({
                        'budget_pool_id': f'Budget pool with id {budget_pool_id} does not exist or does not match the task project, ad channel, and currency.'
                    })
            else:
                # Try to find a matching budget pool automatically
                if ad_channel:
                    try:
                        budget_pool = self.find_budget_pool(validated_data['task'], ad_channel, currency)
                        validated_data['budget_pool'] = budget_pool
                    except BudgetPool.DoesNotExist:
                        raise serializers.ValidationError({
                            'budget_pool_id': 'No budget pool found for this task project, ad channel, and currency combination. Please select or create a budget pool first.'
                        })
        else:
            # If no task provided, budget_pool must be explicitly provided
            if budget_pool_id:
                try:
                    budget_pool = BudgetPool.objects.get(id=budget_pool_id)
                    validated_data['budget_pool'] = budget_pool
                except BudgetPool.DoesNotExist:
                    raise serializers.ValidationError({
                        'budget_pool_id': f'Budget pool with id {budget_pool_id} does not exist.'
                    })
            else:
                raise serializers.ValidationError({
                    'budget_pool_id': 'Budget pool is required when task is not provided.'
                })

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




