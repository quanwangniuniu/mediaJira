from django.contrib import admin
from .models import EmailDraft, ContentBlock, Workflow


class ContentBlockInline(admin.TabularInline):
    """Inline editor for ContentBlock inside the EmailDraft admin page."""
    model = ContentBlock
    extra = 1
    fields = ("block_type", "order", "content")
    ordering = ("order",)


@admin.register(EmailDraft)
class EmailDraftAdmin(admin.ModelAdmin):
    """Admin configuration for EmailDraft."""
    list_display = ("id", "name", "subject", "status", "user")
    search_fields = ("name", "subject", "status", "user__username", "user__email")
    list_filter = ("status",)
    ordering = ("-id",)
    inlines = [ContentBlockInline]

    fieldsets = (
        (None, {"fields": ("name", "subject", "status", "user")}),
    )


@admin.register(ContentBlock)
class ContentBlockAdmin(admin.ModelAdmin):
    """Admin configuration for ContentBlock."""
    list_display = ("id", "email_draft", "block_type", "order")
    search_fields = ("block_type", "email_draft__subject", "email_draft__name")
    list_filter = ("block_type",)
    ordering = ("email_draft", "order")


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    """Admin configuration for Workflow."""
    list_display = ("id", "name", "is_active")
    search_fields = ("name",)
    list_filter = ("is_active",)
    ordering = ("-id",)
