from django.contrib import admin
from .models import Decision, Signal, Option


class SignalInline(admin.TabularInline):
    model = Signal
    extra = 0
    fields = ('metric', 'movement', 'period', 'display_text')
    readonly_fields = ('display_text',)


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0
    fields = ('text', 'is_selected', 'order')


@admin.register(Decision)
class DecisionAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'created_by_agent', 'agent_session_id', 'project', 'author')
    list_filter = ('status', 'created_by_agent')
    search_fields = ('title',)
    readonly_fields = ('status',)
    fields = (
        'title', 'status', 'project', 'author',
        'context_summary', 'reasoning', 'risk_level', 'confidence',
        'created_by_agent', 'agent_session_id',
        'project_seq', 'is_reference_case',
    )
    inlines = [SignalInline, OptionInline]
