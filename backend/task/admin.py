from django.contrib import admin
from task.models import ApprovalChain, ApprovalChainStep


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
