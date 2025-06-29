from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Campaign, CampaignAssignment, CampaignMetric, CampaignNote
from django.db.models import Q


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    """
    Admin interface for Campaign model
    
    Provides comprehensive campaign management with:
    - List display with key information
    - Filtering and search capabilities
    - Inline editing of related models
    - Custom actions for bulk operations
    """
    
    list_display = [
        'name', 'campaign_type', 'status', 'owner', 'budget_display',
        'spent_display', 'utilization_display', 'duration_display',
        'is_active', 'created_at'
    ]
    list_filter = [
        'status', 'campaign_type', 'is_active', 'created_at',
        'start_date', 'end_date'
    ]
    search_fields = ['name', 'description', 'owner__username', 'owner__email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'budget_utilization']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'campaign_type', 'status')
        }),
        ('Financial Information', {
            'fields': ('budget', 'spent_amount', 'budget_utilization')
        }),
        ('Timeline', {
            'fields': ('start_date', 'end_date')
        }),
        ('Team & Settings', {
            'fields': ('owner', 'is_active', 'tags')
        }),
        ('System Information', {
            'fields': ('id', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ['team_members']
    
    def budget_display(self, obj):
        """Display budget with currency formatting"""
        return f"${obj.budget:,.2f}"
    budget_display.short_description = 'Budget'
    budget_display.admin_order_field = 'budget'
    
    def spent_display(self, obj):
        """Display spent amount with currency formatting"""
        return f"${obj.spent_amount:,.2f}"
    spent_display.short_description = 'Spent'
    spent_display.admin_order_field = 'spent_amount'
    
    def utilization_display(self, obj):
        """Display budget utilization with color coding"""
        utilization = obj.budget_utilization
        color = 'red' if utilization > 100 else 'orange' if utilization > 80 else 'green'
        return format_html(
            '<span style="color: {};">{:.1f}%</span>',
            color, utilization
        )
    utilization_display.short_description = 'Utilization'
    utilization_display.admin_order_field = 'spent_amount'
    
    def duration_display(self, obj):
        """Display campaign duration in days"""
        return f"{obj.duration_days} days"
    duration_display.short_description = 'Duration'
    
    actions = ['activate_campaigns', 'pause_campaigns', 'complete_campaigns']
    
    def activate_campaigns(self, request, queryset):
        """Bulk action to activate campaigns"""
        updated = queryset.update(status='active')
        self.message_user(
            request,
            f'Successfully activated {updated} campaign(s).'
        )
    activate_campaigns.short_description = 'Activate selected campaigns'
    
    def pause_campaigns(self, request, queryset):
        """Bulk action to pause campaigns"""
        updated = queryset.update(status='paused')
        self.message_user(
            request,
            f'Successfully paused {updated} campaign(s).'
        )
    pause_campaigns.short_description = 'Pause selected campaigns'
    
    def complete_campaigns(self, request, queryset):
        """Bulk action to complete campaigns"""
        updated = queryset.update(status='completed')
        self.message_user(
            request,
            f'Successfully completed {updated} campaign(s).'
        )
    complete_campaigns.short_description = 'Complete selected campaigns'


@admin.register(CampaignAssignment)
class CampaignAssignmentAdmin(admin.ModelAdmin):
    """
    Admin interface for CampaignAssignment model
    """
    
    list_display = ['campaign', 'user', 'role', 'assigned_at', 'is_active']
    list_filter = ['role', 'is_active', 'assigned_at']
    search_fields = ['campaign__name', 'user__username', 'user__email']
    readonly_fields = ['assigned_at']
    
    fieldsets = (
        ('Assignment Information', {
            'fields': ('campaign', 'user', 'role')
        }),
        ('Status', {
            'fields': ('is_active', 'assigned_at')
        }),
    )


@admin.register(CampaignMetric)
class CampaignMetricAdmin(admin.ModelAdmin):
    """
    Admin interface for CampaignMetric model
    """
    
    list_display = [
        'campaign', 'date', 'impressions', 'clicks', 'conversions',
        'ctr_display', 'cvr_display', 'cpc_display'
    ]
    list_filter = ['date', 'recorded_at']
    search_fields = ['campaign__name']
    readonly_fields = ['recorded_at', 'click_through_rate', 'conversion_rate']
    
    fieldsets = (
        ('Campaign Information', {
            'fields': ('campaign', 'date')
        }),
        ('Performance Metrics', {
            'fields': ('impressions', 'clicks', 'conversions')
        }),
        ('Financial Metrics', {
            'fields': ('cost_per_click', 'cost_per_impression', 'cost_per_conversion')
        }),
        ('Calculated Metrics', {
            'fields': ('click_through_rate', 'conversion_rate'),
            'classes': ('collapse',)
        }),
        ('System Information', {
            'fields': ('recorded_at',),
            'classes': ('collapse',)
        }),
    )
    
    def ctr_display(self, obj):
        """Display click-through rate as percentage"""
        return f"{obj.click_through_rate * 100:.2f}%"
    ctr_display.short_description = 'CTR'
    ctr_display.admin_order_field = 'click_through_rate'
    
    def cvr_display(self, obj):
        """Display conversion rate as percentage"""
        return f"{obj.conversion_rate * 100:.2f}%"
    cvr_display.short_description = 'CVR'
    cvr_display.admin_order_field = 'conversion_rate'
    
    def cpc_display(self, obj):
        """Display cost per click with currency formatting"""
        return f"${obj.cost_per_click:,.2f}"
    cpc_display.short_description = 'CPC'
    cpc_display.admin_order_field = 'cost_per_click'


@admin.register(CampaignNote)
class CampaignNoteAdmin(admin.ModelAdmin):
    """
    Admin interface for CampaignNote model
    """
    
    list_display = ['title', 'campaign', 'author', 'is_private', 'created_at']
    list_filter = ['is_private', 'created_at', 'updated_at']
    search_fields = ['title', 'content', 'campaign__name', 'author__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Note Information', {
            'fields': ('campaign', 'author', 'title', 'content')
        }),
        ('Privacy', {
            'fields': ('is_private',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Filter notes based on user permissions"""
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(
            Q(campaign__owner=request.user) | 
            Q(campaign__team_members=request.user) |
            Q(author=request.user)
        ).distinct() 