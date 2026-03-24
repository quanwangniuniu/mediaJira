from django.contrib import admin
from .models import (
    AgentSession, AgentMessage, ImportedCSVFile,
    AgentWorkflowRun, AgentWorkflowDefinition,
    AgentWorkflowStep, AgentStepExecution,
)


@admin.register(AgentSession)
class AgentSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'project', 'title', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('title',)


@admin.register(AgentMessage)
class AgentMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'role', 'message_type', 'created_at')
    list_filter = ('role', 'message_type')


@admin.register(ImportedCSVFile)
class ImportedCSVFileAdmin(admin.ModelAdmin):
    list_display = ('id', 'original_filename', 'user', 'row_count', 'created_at')


@admin.register(AgentWorkflowRun)
class AgentWorkflowRunAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'workflow_definition', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(AgentWorkflowDefinition)
class AgentWorkflowDefinitionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'project', 'is_default', 'is_system', 'status', 'created_at')
    list_filter = ('status', 'is_system', 'is_default')
    search_fields = ('name',)


@admin.register(AgentWorkflowStep)
class AgentWorkflowStepAdmin(admin.ModelAdmin):
    list_display = ('id', 'workflow', 'name', 'step_type', 'order')
    list_filter = ('step_type',)


@admin.register(AgentStepExecution)
class AgentStepExecutionAdmin(admin.ModelAdmin):
    list_display = ('id', 'workflow_run', 'step_name', 'step_order', 'status', 'started_at')
    list_filter = ('status',)
