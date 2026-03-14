from django.contrib import admin
from task.models import ApprovalChain, ApprovalChainStep, AlertTask


@admin.register(AlertTask)
class AlertTaskAdmin(admin.ModelAdmin):
    list_display = ["id", "task", "alert_type", "severity", "status", "created_at"]
    list_filter = ["alert_type", "severity", "status"]
    search_fields = ["task__summary", "investigation_notes"]
    raw_id_fields = ["task", "acknowledged_by", "assigned_to"]
    readonly_fields = ["created_at", "updated_at"]


class ApprovalChainStepInline(admin.TabularInline):
    model = ApprovalChainStep
    extra = 1
    ordering = ['order']


@admin.register(ApprovalChain)
class ApprovalChainAdmin(admin.ModelAdmin):
    list_display = ['name', 'project', 'task_type', 'total_steps', 'required_approvals', 'created_at']
    list_filter = ['task_type', 'project']
    fields = ['name', 'project', 'task_type', 'required_approvals']
    inlines = [ApprovalChainStepInline]

    def total_steps(self, obj):
        return obj.total_steps
    total_steps.short_description = 'Steps'
