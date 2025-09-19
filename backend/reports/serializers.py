# serializers.py 

from rest_framework import serializers
from .models import (
    ReportTemplate,
    Report,
    ReportSection,
    ReportAnnotation,
    ReportApproval,
    ReportAsset,
    SliceSnapshot,
    Job,
)


# -------------------------------
# ReportTemplate
# -------------------------------
class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = (
            "id", "name", "version", "is_default", "blocks", "variables",
            "created_at", "updated_at", "deleted_at",
        )
        read_only_fields = ("created_at", "updated_at", "deleted_at")


# -------------------------------
# ReportSection
# -------------------------------
class ReportSectionSerializer(serializers.ModelSerializer):
    # OAS requires report_id
    report_id = serializers.SlugRelatedField(
        source="report", slug_field="id", read_only=True
    )

    class Meta:
        model = ReportSection
        fields = (
            "id", "report_id", "title", "order_index", "content_md",
            "charts", "source_slice_ids", "created_at", "updated_at", "deleted_at",
        )
        read_only_fields = ("created_at", "updated_at", "deleted_at")


# -------------------------------
# ReportAnnotation
# -------------------------------
class ReportAnnotationSerializer(serializers.ModelSerializer):
    report_id = serializers.SlugRelatedField(
        source="report", slug_field="id", read_only=True
    )
    section_id = serializers.SlugRelatedField(
        source="section", slug_field="id", read_only=True, allow_null=True
    )

    class Meta:
        model = ReportAnnotation
        fields = (
            "id", "report_id", "section_id", "author_id", "body_md", "anchor",
            "status", "created_at", "updated_at", "resolved_at", "resolved_by", "deleted_at",
        )
        read_only_fields = ("created_at", "updated_at", "resolved_at")


# -------------------------------
# ReportApproval
# -------------------------------
class ReportApprovalSerializer(serializers.ModelSerializer):
    report_id = serializers.SlugRelatedField(
        source="report", slug_field="id", read_only=True
    )

    class Meta:
        model = ReportApproval
        fields = (
            "id", "report_id", "approver_id", "status", "comment", "created_at", "decided_at",
        )
        read_only_fields = ("created_at", "decided_at")


# -------------------------------
# ReportAsset
# -------------------------------
class ReportAssetSerializer(serializers.ModelSerializer):
    report_id = serializers.SlugRelatedField(
        source="report", slug_field="id", read_only=True
    )
    file_url = serializers.URLField()

    class Meta:
        model = ReportAsset
        fields = (
            "id", "report_id", "file_url", "file_type", "checksum", "created_at", "updated_at",
        )
        read_only_fields = ("created_at", "updated_at")


# -------------------------------
# SliceSnapshot (internal use, not in OAS)
# -------------------------------
class SliceSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = SliceSnapshot
        fields = "__all__"
        read_only_fields = ("created_at", "updated_at", "query_hash")


# -------------------------------
# Job (async task)
# -------------------------------
class JobSerializer(serializers.ModelSerializer):
    result_asset_id = serializers.SerializerMethodField()

    class Meta:
        model = Job
        fields = (
            "id", "type", "status", "created_at", "updated_at", "message",
            "result_asset_id", "page_id", "page_url",
        )
        read_only_fields = ("created_at", "updated_at")

    def get_result_asset_id(self, obj):
        return getattr(obj, "result_asset_id", None)


# -------------------------------
# Report
# -------------------------------
class ReportSerializer(serializers.ModelSerializer):
    report_template_id = serializers.SlugRelatedField(
        source="report_template", slug_field="id", queryset=ReportTemplate.objects.all()
    )

    class Meta:
        model = Report
        fields = (
            "id", "title", "owner_id",
            "created_at", "updated_at",
            "status",
            "report_template_id",
            "time_range_start", "time_range_end",
            "query_hash",
            "slice_config",
            "export_config_id",
            "deleted_at",
        )
        read_only_fields = ("created_at", "updated_at", "deleted_at", "query_hash")


    def validate_slice_config(self, cfg):
        if cfg is not None and not isinstance(cfg, dict):
            raise serializers.ValidationError("slice_config must be an object")
        return cfg

    def create(self, validated_data):
        rpt = super().create(validated_data)
        rpt.recompute_query_hash()
        rpt.save(update_fields=["query_hash", "updated_at"])
        return rpt

    def update(self, instance, validated_data):
        inst = super().update(instance, validated_data)
        inst.recompute_query_hash()
        inst.save(update_fields=["query_hash", "updated_at"])
        return inst

# -------------------------------
# Report 
# -------------------------------
class ReportDetailSerializer(ReportSerializer):
    sections = ReportSectionSerializer(many=True, read_only=True)

    class Meta(ReportSerializer.Meta):
        fields = ReportSerializer.Meta.fields + ("sections",)
