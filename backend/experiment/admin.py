from django.contrib import admin
from .models import Experiment, ExperimentProgressUpdate


@admin.register(Experiment)
class ExperimentAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'status', 'experiment_outcome', 'start_date', 'end_date', 'created_by', 'created_at']
    list_filter = ['status', 'experiment_outcome', 'start_date', 'end_date']
    search_fields = ['name', 'hypothesis', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'hypothesis', 'expected_outcome', 'description')
        }),
        ('Experiment Design', {
            'fields': ('control_group', 'variant_group', 'success_metric', 'constraints')
        }),
        ('Timing', {
            'fields': ('start_date', 'end_date', 'started_at')
        }),
        ('Status and Outcome', {
            'fields': ('status', 'experiment_outcome', 'outcome_notes')
        }),
        ('Relationships', {
            'fields': ('task', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ExperimentProgressUpdate)
class ExperimentProgressUpdateAdmin(admin.ModelAdmin):
    list_display = ['id', 'experiment', 'update_date', 'created_by', 'created_at']
    list_filter = ['created_at', 'update_date']
    search_fields = ['notes', 'experiment__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Update Information', {
            'fields': ('experiment', 'update_date', 'notes', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )

