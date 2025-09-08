from django.db import models                            # Django ORM model/field types
from django.db.models import Q                          # Q object for conditional unique constraints
from django.utils import timezone                       # Timezone-aware current time
from hashlib import sha256                              # SHA-256 digest algorithm (for query_hash/checksum)
import json                                             # JSON serialization (stable string for hashing)


# ---------- Base class: timestamp + soft delete ----------
class Timestamped(models.Model):                        # Common timestamp/soft-delete fields for all tables
    created_at = models.DateTimeField(auto_now_add=True)  # Automatically set creation time on first save
    updated_at = models.DateTimeField(auto_now=True)      # Automatically update modification time on every save
    deleted_at = models.DateTimeField(null=True, blank=True)  # Soft-delete time (non-null means deleted)

    class Meta:                                          # Model metadata
        abstract = True                                  # Abstract base class, no physical table created


# ---------- Template: ReportTemplate ----------
class ReportTemplate(Timestamped):                      # Report template (versioned)
    id = models.CharField(primary_key=True, max_length=64)  # Primary key (externally generated: UUID/ULID/Snowflake etc.)
    name = models.CharField(max_length=128)             # Template name
    version = models.IntegerField()                     # Template version number
    is_default = models.BooleanField(default=False)     # Whether this is the default template
    blocks = models.JSONField(default=list, blank=True) # Template block definitions (e.g. text/chart/table/kpi list)
    variables = models.JSONField(default=dict, blank=True)  # Template variables (default values for Jinja2 context)

    class Meta:                                         # Model metadata
        unique_together = ("name", "version")           # Same name but different versions must not duplicate

    def __str__(self) -> str:                           # Debug/admin-friendly display
        return f"{self.name} v{self.version}"           # Return “name vversion”


# ---------- Report main entity: Report ----------
class Report(Timestamped):                              # Report entity (draft → review → approved → published)
    STATUS = [                                          # Report lifecycle status enumeration
        ("draft", "draft"),
        ("in_review", "in_review"),
        ("approved", "approved"),
        ("published", "published"),
    ]

    id = models.CharField(primary_key=True, max_length=64)   # Primary key (externally generated)
    title = models.CharField(max_length=200)                 # Report title
    owner_id = models.CharField(max_length=64)               # Owner ID (not strongly bound to Django User)
    status = models.CharField(max_length=16, choices=STATUS, default="draft")  # Current status

    report_template = models.ForeignKey(                     # Reference to template (nullable; report not deleted if template deleted)
        ReportTemplate, on_delete=models.SET_NULL, null=True, blank=True, related_name="reports"
    )
    time_range_start = models.DateTimeField(null=True, blank=True)  # Data window start
    time_range_end = models.DateTimeField(null=True, blank=True)    # Data window end

    slice_config = models.JSONField(default=dict, blank=True)       # Slice parameters (dataset/dims/metrics/filters etc.)
    query_hash = models.CharField(max_length=64, blank=True, default="")  # Query fingerprint (audit/cache key)

    # ⚠️ Soft reference to external export config: only store ID; if later changed to FK, add FK field and backfill via migration
    export_config_id = models.CharField(max_length=64, null=True, blank=True)  # ID of external ExportConfig

    class Meta:                                              # Model metadata
        indexes = [
            models.Index(fields=["status"]),                 # Frequently filtered by status
            models.Index(fields=["owner_id", "status"]),     # Filter by owner+status
            models.Index(fields=["created_at"]),             # Sort/paginate by creation time
        ]

    def recompute_query_hash(self) -> None:
        # Use slice_config directly (no normalization needed)
        payload = {
            "slice_config": self.slice_config or {},
            "time_range": [
                self.time_range_start.isoformat() if self.time_range_start else None,
                self.time_range_end.isoformat() if self.time_range_end else None,
            ],
            "report_template_id": self.report_template_id,
        }
        raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        self.query_hash = sha256(raw).hexdigest()


# ---------- Report section: ReportSection ----------
class ReportSection(Timestamped):                           # Report sections (for narrative structure)
    id = models.CharField(primary_key=True, max_length=64)   # Primary key (externally generated)
    report = models.ForeignKey(                              # Belongs to report (cascade delete if report deleted)
        Report, on_delete=models.CASCADE, related_name="sections"
    )
    title = models.CharField(max_length=200)                 # Section title
    order_index = models.IntegerField()                      # Order index (render/export sequence)
    content_md = models.TextField(blank=True, default="")    # Markdown content
    charts = models.JSONField(default=list, blank=True)      # List of chart configs (rendered as images on export)
    source_slice_ids = models.JSONField(default=list, blank=True)  # Slice IDs referenced in this section (lineage)

    class Meta:                                              # Model metadata
        ordering = ["order_index"]                           # Default ordering ascending by index
        indexes = [
            models.Index(fields=["report", "order_index"]),  # Faster queries by report+order
        ]
        constraints = [
            models.UniqueConstraint(                         # ✅ Constraint: order index must be unique within a report
                fields=["report", "order_index"],
                name="uniq_section_order_per_report",
            ),
        ]

    def __str__(self) -> str:                                # Debug/admin-friendly display
        return f"{self.report_id} / {self.order_index} - {self.title}"  # “reportID / index - title”


# ---------- Annotation: ReportAnnotation ----------
class ReportAnnotation(Timestamped):                         # Annotations and discussions on reports/sections
    STATUS = [("open", "open"), ("resolved", "resolved")]    # Annotation status enumeration

    id = models.CharField(primary_key=True, max_length=64)    # Primary key (externally generated)
    report = models.ForeignKey(                               # Associated report (cascade delete if report deleted)
        Report, on_delete=models.CASCADE, related_name="annotations"
    )
    section = models.ForeignKey(                              # Optional: target specific section (set null if section deleted)
        ReportSection, on_delete=models.SET_NULL, null=True, blank=True, related_name="annotations"
    )
    author_id = models.CharField(max_length=64)               # Author ID (not strongly bound to Django User)
    body_md = models.TextField()                              # Annotation content (Markdown)
    anchor = models.JSONField(default=dict, blank=True)       # Position info (e.g. element/coordinates)
    status = models.CharField(max_length=16, choices=STATUS, default="open")  # Current status
    resolved_at = models.DateTimeField(null=True, blank=True) # Resolution time
    resolved_by = models.CharField(max_length=64, null=True, blank=True)  # Resolver ID

    class Meta:                                               # Model metadata
        ordering = ["-created_at"]                            # Default ordering new → old
        indexes = [
            models.Index(fields=["report", "status"]),        # Filter by report+status
            models.Index(fields=["created_at"]),              # Sort/paginate by time
        ]

    def mark_resolved(self, user_id: str | None = None) -> None:  # Business helper: mark as resolved
        self.status = "resolved"                              # Change status to resolved
        self.resolved_at = timezone.now()                     # Record TZ-aware resolution time
        if user_id:                                           # If resolver ID is provided
            self.resolved_by = user_id                        # Save resolver ID


# ---------- Approval: ReportApproval ----------
class ReportApproval(Timestamped):                           # Approval records (can have multiple approvals)
    STATUS = [("pending", "pending"), ("approved", "approved"), ("rejected", "rejected")]  # Status enumeration

    id = models.CharField(primary_key=True, max_length=64)    # Primary key (externally generated)
    report = models.ForeignKey(                               # Associated report (cascade delete if report deleted)
        Report, on_delete=models.CASCADE, related_name="approvals"
    )
    approver_id = models.CharField(max_length=64)             # Approver ID
    status = models.CharField(max_length=16, choices=STATUS, default="pending")  # Current status
    comment = models.TextField(null=True, blank=True)         # Approval comments
    decided_at = models.DateTimeField(null=True, blank=True)  # Decision time

    class Meta:                                               # Model metadata
        indexes = [
            models.Index(fields=["report", "status"]),        # Filter by report+status
        ]
        constraints = [
            models.UniqueConstraint(                          # ✅ Constraint: only one pending per approver+report
                fields=["report", "approver_id"],
                condition=Q(status="pending"),
                name="uniq_pending_approval_per_approver",
            ),
        ]


# ---------- Asset: ReportAsset ----------
class ReportAsset(Timestamped):                               # Export/render-generated asset (file)
    TYPE = [("image", "image"), ("csv", "csv"), ("pptx", "pptx"), ("pdf", "pdf"), ("confluence", "confluence")]  # Asset type enumeration

    id = models.CharField(primary_key=True, max_length=64)     # Primary key (externally generated)
    report = models.ForeignKey(                                # Associated report (cascade delete if report deleted)
        Report, on_delete=models.CASCADE, related_name="assets"
    )
    file_url = models.TextField()                              # File URL (TextField is safer for long strings; can switch to URLField if validation is needed)
    file_type = models.CharField(max_length=16, choices=TYPE)   # File type
    checksum = models.CharField(max_length=64, blank=True, default="")  # Content checksum (sha256 hex)

    class Meta:                                                # Model metadata
        indexes = [
            models.Index(fields=["report", "file_type", "created_at"]),  # Query by report+type+time
        ]

    @staticmethod
    def compute_checksum_bytes(b: bytes) -> str:               # Compute sha256 from bytes
        return sha256(b).hexdigest()                           # Return hex string


# ---------- Slice lineage snapshot: SliceSnapshot ----------
class SliceSnapshot(Timestamped):                              # Freeze query slice used in an export/publish
    id = models.CharField(primary_key=True, max_length=64)     # Primary key (externally generated)
    report = models.ForeignKey(                                # Associated report (cascade delete if report deleted)
        Report, on_delete=models.CASCADE, related_name="slice_snapshots"
    )
    section = models.ForeignKey(                               # Optional: associated section (set null if section deleted)
        ReportSection, on_delete=models.SET_NULL, null=True, blank=True
    )

    dataset = models.CharField(max_length=128, blank=True, default="")   # Dataset identifier
    dimensions = models.JSONField(default=list, blank=True)    # Dimension list
    metrics = models.JSONField(default=list, blank=True)       # Metric list
    filters = models.JSONField(default=dict, blank=True)       # Filter conditions (key-value pairs)
    time_grain = models.CharField(max_length=16, blank=True, default="") # Granularity (day/week/month)
    time_range_start = models.DateTimeField(null=True, blank=True)       # Time window start
    time_range_end = models.DateTimeField(null=True, blank=True)         # Time window end

    query_hash = models.CharField(max_length=64, blank=True, default="") # Query fingerprint of the snapshot

    class Meta:                                                # Model metadata
        indexes = [
            models.Index(fields=["report", "section"]),        # Combined index report+section
            models.Index(fields=["time_range_start"]),         # Index on time range start
        ]

    def recompute_hash(self) -> None:                          # Compute snapshot hash (same logic as Report)
        payload = {
            "dataset": self.dataset,
            "dimensions": self.dimensions,
            "metrics": self.metrics,
            "filters": self.filters,
            "time_grain": self.time_grain,
            "time_range": [
                self.time_range_start.isoformat() if self.time_range_start else None,
                self.time_range_end.isoformat() if self.time_range_end else None,
            ],
        }
        self.query_hash = sha256(                              # Use stable JSON for sha256
            json.dumps(payload, sort_keys=True).encode("utf-8")
        ).hexdigest()


# ---------- Async job: Job (with Celery) ----------
class Job(Timestamped):                                        # Export/publish async job status
    TYPE = [("export", "export"), ("publish", "publish")]       # Job types
    STATUS = [                                                  # Job status state machine
        ("queued", "queued"),
        ("running", "running"),
        ("succeeded", "succeeded"),
        ("failed", "failed"),
    ]

    id = models.CharField(primary_key=True, max_length=64)      # Primary key (externally generated)
    report = models.ForeignKey(                                 # Associated report (cascade delete if report deleted)
        Report, on_delete=models.CASCADE, related_name="jobs"
    )
    type = models.CharField(max_length=8, choices=TYPE)         # Job type
    status = models.CharField(max_length=10, choices=STATUS, default="queued")  # Current status
    message = models.TextField(null=True, blank=True)           # Status info/error details

    result_asset = models.ForeignKey(                           # If export: associated generated asset
        ReportAsset, null=True, blank=True, on_delete=models.SET_NULL, related_name="jobs"
    )
    page_id = models.CharField(max_length=64, null=True, blank=True)   # If publish: returned page ID
    page_url = models.TextField(null=True, blank=True)                # If publish: returned page URL

    class Meta:                                                # Model metadata
        indexes = [
            models.Index(fields=["report", "type", "created_at"]),     # Query by report+type+time
        ]


# ---------- (Optional) Read-only shadow models: connect external tables without migrations ----------
# Note: If you need to “read” someone else's ExportConfig/MetricRecord in ORM but don't want migrations,
# you can use managed=False as a shadow model; set db_table to the real external table name.
# To enable: uncomment below.

# class ExportConfigRO(models.Model):                             # Read-only shadow: external export config
#     class Meta:
#         managed = False                                        # Not managed by migration system
#         db_table = "exports_exportconfig"                      # Real external table name (example)
#     id = models.CharField(primary_key=True, max_length=64)     # Primary key (same as external)
#     format = models.CharField(max_length=8)                    # Only list fields you need
#     # ... other necessary fields
#
# class MetricRecordRO(models.Model):                             # Read-only shadow: external metric records
#     class Meta:
#         managed = False                                        # Not managed by migration system
#         db_table = "metrics_metricrecord"                      # Real external table name (example)
#     id = models.CharField(primary_key=True, max_length=64)     # Primary key
#     metric_type = models.CharField(max_length=64)              # Metric name
#     value = models.DecimalField(max_digits=20, decimal_places=6)  # Value
#     date = models.DateField()                                  # Date
#     # ... other necessary dimension fields
