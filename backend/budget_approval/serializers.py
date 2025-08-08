from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal
from .models import BudgetRequest, BudgetPool, ApprovalRecord
from core.models import Task, Project, AdChannel

User = get_user_model()


class BudgetRequestSerializer(serializers.ModelSerializer):
    """Budget Request Serializer"""
    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all())
    requested_by = serializers.ReadOnlyField(source='requested_by.id')
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.01'))
    currency = serializers.CharField(max_length=3, min_length=3)
    status = serializers.ReadOnlyField()
    submitted_at = serializers.ReadOnlyField()
    is_escalated = serializers.ReadOnlyField()
    budget_pool = serializers.ReadOnlyField(source='budget_pool.id')
    current_approver = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    ad_channel = serializers.PrimaryKeyRelatedField(queryset=AdChannel.objects.all())
    
    class Meta:
        model = BudgetRequest
        fields = [
            'id', 'task', 'requested_by', 'amount', 'currency', 'status',
            'submitted_at', 'is_escalated', 'budget_pool', 'notes', 'current_approver', 'ad_channel'
        ]
        read_only_fields = ['id', 'requested_by', 'status', 'submitted_at', 'is_escalated', 'budget_pool']
    
    def create(self, validated_data):
        validated_data['requested_by'] = self.context['request'].user

        # Find the budget pool for this budget request
        budget_pool = self.find_budget_pool(validated_data['task'], validated_data['ad_channel'], validated_data['currency'])
        validated_data['budget_pool'] = budget_pool

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


class ApprovalRecordSerializer(serializers.ModelSerializer):
    """Approval Record Serializer"""
    budget_request = serializers.ReadOnlyField(source='budget_request.id')
    approved_by = serializers.ReadOnlyField(source='approved_by.id')
    is_approved = serializers.ReadOnlyField()
    comment = serializers.ReadOnlyField()
    decided_at = serializers.ReadOnlyField()
    step_number = serializers.ReadOnlyField()
    
    class Meta:
        model = ApprovalRecord
        fields = [
            'budget_request', 'approved_by', 'is_approved', 'comment', 'decided_at', 'step_number'
        ]
        read_only_fields = ['budget_request', 'approved_by', 'is_approved', 'comment', 'decided_at', 'step_number']


class BudgetPoolSerializer(serializers.ModelSerializer):
    """Budget Pool Serializer"""
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    ad_channel = serializers.PrimaryKeyRelatedField(queryset=AdChannel.objects.all())
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.01'))
    used_amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=Decimal('0.00'))
    currency = serializers.CharField(max_length=3, min_length=3)
    available_amount = serializers.ReadOnlyField()

    class Meta:
        model = BudgetPool
        fields = [
            'id', 'project', 'ad_channel', 'total_amount', 
            'used_amount', 'available_amount', 'currency'
        ]
        read_only_fields = ['id', 'available_amount']


