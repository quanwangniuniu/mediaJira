import re
from django.db import transaction
from .models import Report, ReportSection, ReportAnnotation

_VERSION_RE = re.compile(r"^(?P<base>.+?)__v(?P<v>\d+)$")

def _base_id(report_id: str) -> str:
    m = _VERSION_RE.match(report_id)
    return m.group("base") if m else report_id

def _next_version_id_for(base_id: str) -> str:
    like = base_id + "__v"
    ids = list(Report.objects.filter(id__startswith=like).values_list("id", flat=True))
    max_v = 1
    for rid in ids:
        m = _VERSION_RE.match(rid)
        if m and m.group("base") == base_id:
            max_v = max(max_v, int(m.group("v")) + 1)
    return f"{base_id}__v{max_v}"

@transaction.atomic
def fork_report_to_draft(original: Report) -> Report:
    base_id = _base_id(original.id)
    new_id = _next_version_id_for(base_id)
    new_rpt = Report.objects.create(
        id=new_id,
        title=original.title,
        owner_id=original.owner_id,
        status="draft",
        report_template_id=original.report_template_id,
        time_range_start=original.time_range_start,
        time_range_end=original.time_range_end,
        query_hash=original.query_hash or "",
        slice_config=original.slice_config or {},
        export_config_id=original.export_config_id,
    )
    for sec in original.sections.all():
        ReportSection.objects.create(
            id=f"{sec.id}__{new_id}",
            report=new_rpt,
            title=sec.title,
            order_index=sec.order_index,
            content_md=sec.content_md,
            charts=sec.charts,
            source_slice_ids=sec.source_slice_ids,
        )
    for ann in ReportAnnotation.objects.filter(report=original, status="open"):
        ReportAnnotation.objects.create(
            id=f"{ann.id}__{new_id}",
            report=new_rpt,
            section_id=None, 
            author_id=ann.author_id,
            body_md=ann.body_md,
            anchor=ann.anchor,
            status=ann.status,
        )
    return new_rpt
