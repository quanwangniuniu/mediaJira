# admin.py — minimal, field names aligned with OpenAPI schemas
from __future__ import annotations
from django.contrib import admin
from .models import (
    ReportTemplate, Report, ReportSection, ReportAnnotation,
    ReportApproval, ReportAsset, SliceSnapshot, Job
)

# ---------- ReportTemplate ----------
@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "id", "name", "version", "is_default",
        "created_at", "updated_at", "deleted_at",
    )
    search_fields = ("id", "name")
    list_filter = ("is_default",)
    readonly_fields = ("created_at", "updated_at", "deleted_at")

# ---------- Report ----------
@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "owner_id", "status", "report_template",
        "time_range_start", "time_range_end",
        "query_hash", "export_config_id",
        "created_at", "updated_at", "deleted_at",
    )
    search_fields = ("id", "title", "owner_id")
    list_filter = ("status", "report_template")
    readonly_fields = ("query_hash", "created_at", "updated_at", "deleted_at")

# ---------- ReportSection ----------
@admin.register(ReportSection)
class ReportSectionAdmin(admin.ModelAdmin):
    list_display = (
        "id", "report", "title", "order_index",
        "created_at", "updated_at", "deleted_at",
    )
    search_fields = ("id", "title", "report__id")
    list_filter = ("report",)
    ordering = ("report", "order_index")
    readonly_fields = ("created_at", "updated_at", "deleted_at")

# ---------- ReportAnnotation ----------
@admin.register(ReportAnnotation)
class ReportAnnotationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "report", "section", "author_id",
        "status", "resolved_at", "resolved_by",
        "created_at", "updated_at", "deleted_at",
    )
    search_fields = ("id", "author_id", "report__id", "section__id", "body_md")
    list_filter = ("status", "report")
    readonly_fields = ("created_at", "updated_at", "resolved_at", "deleted_at")

# ---------- ReportApproval ----------
@admin.register(ReportApproval)
class ReportApprovalAdmin(admin.ModelAdmin):
    list_display = (
        "id", "report", "approver_id", "status", "comment",
        "created_at", "decided_at",
    )
    search_fields = ("id", "approver_id", "report__id")
    list_filter = ("status", "report")
    readonly_fields = ("created_at", "updated_at", "decided_at")

# ---------- ReportAsset ----------
@admin.register(ReportAsset)
class ReportAssetAdmin(admin.ModelAdmin):
    list_display = (
        "id", "report", "file_type", "file_url", "checksum",
        "created_at", "updated_at",
    )
    search_fields = ("id", "report__id", "file_url", "checksum")
    list_filter = ("file_type", "report")
    readonly_fields = ("created_at", "updated_at")

# ---------- SliceSnapshot (supporting audit) ----------
@admin.register(SliceSnapshot)
class SliceSnapshotAdmin(admin.ModelAdmin):
    list_display = (
        "id", "report", "section", "dataset",
        "time_grain", "time_range_start", "time_range_end",
        "query_hash",
        "created_at", "updated_at",
    )
    search_fields = ("id", "report__id", "section__id", "dataset", "query_hash")
    list_filter = ("dataset", "time_grain", "report")
    readonly_fields = ("created_at", "updated_at")

# ---------- Job ----------
@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = (
        "id", "type", "status", "report",
        "message", "result_asset", "page_id", "page_url",
        "created_at", "updated_at",
    )
    search_fields = ("id", "report__id", "page_id", "page_url", "result_asset__id")
    list_filter = ("type", "status", "report")
    readonly_fields = ("created_at", "updated_at")
