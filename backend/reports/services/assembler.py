# =============================
# File: /app/reports/services/assembler.py
# Purpose: Assemble sections (Jinja2 -> Markdown -> HTML) and inline chart <img>s
# Notes:
#  - KPI aggregation is driven by the *requested* metrics, not hardcoded.
#  - HTML tables are rendered from the materialized tables.
#  - Chart generation is best-effort; failures won't break the export.
# =============================
from __future__ import annotations
from typing import Dict, Any, List, Optional
from jinja2 import Environment, BaseLoader
import html as html_mod
import base64
from io import BytesIO
import os

try:
    import markdown as md
    _MD_AVAILABLE = True
except Exception:
    _MD_AVAILABLE = False

from ..models import Report
from .slices import materialize_report_slices
from .charts import generate_charts_from_data


# ---------- Markdown / HTML helpers ----------
def _markdown_to_html(text: str, safe: bool = False) -> str:
    if not text:
        return ""
    if _MD_AVAILABLE:
        exts = ["tables", "fenced_code"]
        if safe:
            # Keep attributes off for safer output in PDF renderers
            return md.markdown(text, extensions=exts, output_format="xhtml1", enable_attributes=False)
        return md.markdown(text, extensions=exts)
    # Fallback: show literal text
    return f"<pre>{html_mod.escape(text)}</pre>"


def _headers_from_rows(rows: List[Dict[str, Any]], max_probe: int = 100) -> List[str]:
    """
    Build a stable header list by scanning up to max_probe rows and unioning keys
    in their appearance order.
    """
    seen: Dict[str, None] = {}
    for r in rows[:max_probe]:
        for k in r.keys():
            if k not in seen:
                seen[k] = None
    return list(seen.keys())


def _fmt_cell(v: Any) -> str:
    """Format table cell value, handling various data types safely"""
    if v is None:
        return ""
    
    # Handle Undefined or problematic types
    if hasattr(v, '__class__') and 'Undefined' in str(v.__class__):
        return ""
    
    # Handle string values that might be numbers
    if isinstance(v, str):
        if v.lower() in ('undefined', 'null', 'none', '-', ''):
            return ""
        return v
    
    if isinstance(v, float):
        # Format floats with reasonable precision
        if abs(v) > 1000:
            return f"{v:,.1f}"
        else:
            return f"{v:.2f}"
    
    if isinstance(v, int):
        if abs(v) > 1000:
            return f"{v:,}"
        else:
            return str(v)

    return str(v)


def _table_html(rows: List[Dict[str, Any]]) -> str:
    """
    Render a simple <table> from a list of dict rows. Empty -> HTML comment.
    """
    if not rows:
        return "<!-- empty table -->"
    headers = _headers_from_rows(rows)
    thead = "<tr>" + "".join(f"<th>{html_mod.escape(str(h))}</th>" for h in headers) + "</tr>"
    body_parts: List[str] = []
    for r in rows:
        tds = "".join(f"<td>{html_mod.escape(_fmt_cell(r.get(h)))}</td>" for h in headers)
        body_parts.append(f"<tr>{tds}</tr>")
    tbody = "".join(body_parts)
    return f"<table><thead>{thead}</thead><tbody>{tbody}</tbody></table>"


# ---------- Numeric helpers ----------
def _to_number(x: Any) -> Optional[float]:
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().replace(",", "")
    if s in ("", "-", "NaN", "nan", "None", "null"):
        return None
    try:
        return float(s)
    except Exception:
        return None


# ---------- KPI aggregation (driven by requested metrics) ----------
def _aggregate_kpis_from_default(default_rows: List[Dict[str, Any]], requested_metrics: List[str]) -> Dict[str, Any]:
    """
    Aggregate a KPI dict from the 'default' table based on requested metrics.
    - For each requested metric M, sum numeric values across rows (if present).
    - If ROI/ROAS are requested but not present as numbers, derive them from Cost + Revenue.
        ROI  = (Revenue - Cost) / Cost    (ratio)
        ROAS =  Revenue / Cost            (multiplier)
    - We *never* average row-level ROI/ROAS; mixing percentages across rows is meaningless.
    """
    requested_metrics = list(requested_metrics or [])
    acc: Dict[str, float] = {}

    # 1) Sum the requested metrics that are numeric
    for m in requested_metrics:
        total = 0.0
        seen = False
        for r in default_rows:
            v = _to_number(r.get(m))
            if v is not None:
                total += v
                seen = True
        if seen:
            acc[m] = total

    # 2) Derive ROI/ROAS if requested and not already valid numbers
    cost = _to_number(acc.get("Cost"))
    revenue = _to_number(acc.get("Revenue"))
    if revenue is None:
        # Some datasets name it "Total Revenue"
        revenue = _to_number(acc.get("Total Revenue"))

    if cost and cost != 0:
        if "ROI" in requested_metrics and _to_number(acc.get("ROI")) is None and revenue is not None:
            acc["ROI"] = (revenue - cost) / cost
        if "ROAS" in requested_metrics and _to_number(acc.get("ROAS")) is None and revenue is not None:
            acc["ROAS"] = revenue / cost

    return acc


# ---------- Main assembler ----------
def assemble(report_id: str) -> Dict[str, Any]:
    """
    Build the final HTML by:
      1) Materializing slices (tables) via services.slices
      2) Aggregating top-level KPIs for templating
      3) Rendering each section's Markdown (Jinja2 first) + inlining chart <img> tags
    Returns a dict:
      {
        "html": str,
        "report": Report,
        "metrics": dict,         # KPI snapshot for templating
        "tables": dict[str, list[dict]],  # materialized tables
        "charts": list[dict],    # [{title, path, section_id}]
        "csv_paths": list[str],  # reserved for exporters that embed CSV
      }
    """
    # Load report + related objects
    rpt = Report.objects.prefetch_related("sections", "report_template").get(pk=report_id)

    # Materialize all slices
    slice_ctx = materialize_report_slices(rpt)  # {tables: {sid: rows[]}, slices: {sid: meta}}
    tables: Dict[str, List[Dict[str, Any]]] = slice_ctx.get("tables", {}) or {}
    slices_meta: Dict[str, Any] = slice_ctx.get("slices", {}) or {}

    # Determine the requested metrics for the default slice (fallback to report.slice_config.metrics)
    default_meta = slices_meta.get("default", {}) or {}
    requested_metrics: List[str] = list(
        default_meta.get("metrics")
        or (getattr(rpt, "slice_config", {}) or {}).get("metrics")
        or []
    )

    # Aggregate KPI snapshot from the default table using the requested metrics
    default_rows = tables.get("default", []) or []
    kpi_metrics = _aggregate_kpis_from_default(default_rows, requested_metrics)

    # Render HTML tables for all slices (so template can use {{ html_tables['default'] }})
    html_tables = {name: _table_html(rows) for name, rows in tables.items()}

    # Jinja2 env: autoescape OFF to allow our HTML fragments to pass through
    from jinja2 import Environment, BaseLoader, StrictUndefined
    
    env = Environment(loader=BaseLoader(), autoescape=False)
    
    # Add custom filters to handle problematic data types
    def safe_round(value, ndigits=2):
        """Safe round filter that handles Undefined and other problematic types"""
        try:
            if value is None:
                return 0
            if hasattr(value, '__class__') and 'Undefined' in str(value.__class__):
                return 0
            if isinstance(value, str):
                if value.lower() in ('undefined', 'null', 'none', '-', ''):
                    return 0
                try:
                    value = float(value)
                except (ValueError, TypeError):
                    return 0
            return round(float(value), ndigits)
        except (ValueError, TypeError, AttributeError):
            return 0
    
    env.filters['round'] = safe_round
    
    tpl_vars: Dict[str, Any] = rpt.report_template.variables if rpt.report_template else {}
    
    # Clean template variables to prevent Undefined type errors
    def clean_value(value: Any) -> Any:
        """Clean template variables to prevent Undefined type errors"""
        if value is None:
            return 0
        if hasattr(value, '__class__') and 'Undefined' in str(value.__class__):
            return 0
        if isinstance(value, str):
            if value.lower() in ('undefined', 'null', 'none', '-', ''):
                return 0
            # Try to convert string numbers
            try:
                if '.' in value:
                    return float(value)
                return int(value)
            except (ValueError, TypeError):
                return value
        return value
    
    # Clean all template variables
    cleaned_tpl_vars = {k: clean_value(v) for k, v in tpl_vars.items()}
    
    # Clean KPI metrics
    cleaned_kpi_metrics = {k: clean_value(v) for k, v in kpi_metrics.items()}

    def is_empty(value) -> bool:
        if value is None:
            return True
        if isinstance(value, (list, dict, tuple, set)) and len(value) == 0:
            return True
        if value == "" or value == 0:
            return True
        return False

    blocks: List[str] = []
    all_charts: List[Dict[str, str]] = []

    # Render sections in DB order
    for sec in rpt.sections.all():
        use_ids: List[str] = list(sec.source_slice_ids or ["default"])
        local_tables = {k: tables.get(k, []) for k in use_ids if k in tables}
        local_html_tables = {k: html_tables.get(k, "<!-- missing -->") for k in use_ids}

        # Generate declared charts for this section (best-effort)
        charts_meta: List[Dict[str, str]] = []
        try:
            section_chart_cfgs = list(sec.charts or [])
            if section_chart_cfgs:
                charts_meta = generate_charts_from_data(tables, section_chart_cfgs, section_id=sec.id)
                # charts_meta: [{ "title": str, "path": "/abs/path/to.png", "section_id": ... }, ...]
                all_charts.extend(charts_meta)
        except Exception:
            # swallow chart errors; they shouldn't block the whole export
            charts_meta = []

        # Get section content for template rendering
        content_md = sec.content_md or ""
        
        # Create chart name -> HTML mapping for this section
        def create_chart_html(chart_meta):
            """Create HTML for a single chart"""
            raw_src = chart_meta.get("path") or ""
            title = html_mod.escape(chart_meta.get("title") or "Chart")
            
            # If it's a local absolute path and exists, embed as data URI
            img_src = raw_src
            if raw_src and os.path.isabs(raw_src) and os.path.exists(raw_src):
                try:
                    with open(raw_src, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode("ascii")
                    img_src = f"data:image/png;base64,{b64}"
                except Exception:
                    img_src = raw_src
            
            return (
                f"<figure style='margin:10px 0'>"
                f"<img src='{img_src}' alt='{title}' style='max-width:100%'>"
                f"<figcaption style='color:#666;font-size:12px'>{title}</figcaption>"
                f"</figure>"
            )
        
        # Build chart name mapping
        charts_by_name = {}
        if charts_meta:
            for chart_meta in charts_meta:
                # Generate chart name from title (convert to snake_case)
                title = chart_meta.get("title", "unknown_chart")
                chart_name = title.lower().replace(" ", "_").replace("-", "_")
                charts_by_name[chart_name] = create_chart_html(chart_meta)
        
        # Prepare merged variables for template context
        merged_vars = {}
        merged_vars.update(cleaned_tpl_vars)  # Start with cleaned template vars
        merged_vars.update({
            'total_cost': clean_value(cleaned_kpi_metrics.get('Cost', cleaned_tpl_vars.get('total_cost', 0))),
            'total_revenue': clean_value(cleaned_kpi_metrics.get('Revenue', cleaned_tpl_vars.get('total_revenue', 0))),
            'net_profit': clean_value(cleaned_kpi_metrics.get('Net Profit', cleaned_tpl_vars.get('net_profit', 0))),
            'roi_percentage': clean_value(cleaned_kpi_metrics.get('ROI', cleaned_tpl_vars.get('roi_percentage', 0))),
            'avg_cpc': clean_value(cleaned_kpi_metrics.get('CPC', cleaned_tpl_vars.get('avg_cpc', 0))),
            'avg_cac': clean_value(cleaned_kpi_metrics.get('CAC', cleaned_tpl_vars.get('avg_cac', 0))),
            'active_campaigns': len([r for r in default_rows if str(r.get('Status', '')).upper() == 'ACTIVE']),
            'best_cpc': clean_value(cleaned_kpi_metrics.get('CPC', cleaned_tpl_vars.get('avg_cpc', 0))),
            'worst_cpc': clean_value(cleaned_kpi_metrics.get('CPC', cleaned_tpl_vars.get('avg_cpc', 0))),
            'date_range': cleaned_tpl_vars.get('date_range', 'Data Period'),
        })
        
        # Now use template rendering with chart functions and safe context
        try:
            template = env.from_string(content_md)
            
            # Create chart helper functions
            def chart(name):
                """Get chart HTML by name"""
                return charts_by_name.get(name, f'<!-- Chart "{name}" not found -->')
            
            def has_chart(name):
                """Check if chart exists"""
                return name in charts_by_name
            
            # Create charts object with safe access
            charts_object = type('Charts', (), {})()
            for name, html in charts_by_name.items():
                setattr(charts_object, name, html)
            
            # Create html_tables object with safe access  
            html_tables_object = type('HtmlTables', (), {
                'raw_data': html_tables.get('default', '<!-- No data available -->'),
                'default': html_tables.get('default', '<!-- No data available -->'), 
                'full_campaign_data': html_tables.get('default', '<!-- No data available -->'),
                'summary_stats': html_tables.get('default', '<!-- No data available -->'),
                'top_performers': html_tables.get('default', '<!-- No data available -->'),
                'underperformers': html_tables.get('default', '<!-- No data available -->'),
            })()
            
            # Enhanced template context
            enhanced_context = {
                'report': rpt,
                'section': sec,
                'vars': cleaned_tpl_vars,
                'metrics': cleaned_kpi_metrics,
                'tables': tables,
                'local_tables': local_tables,
                'html_tables': html_tables_object,
                'local_html_tables': local_html_tables,
                'is_empty': is_empty,
                'charts': charts_object,  # charts.chart_name access
                'chart': chart,           # chart('chart_name') function
                'has_chart': has_chart,   # has_chart('chart_name') function
            }
            
            # Add all other variables
            enhanced_context.update(merged_vars)
            
            rendered_md = template.render(**enhanced_context)
        except Exception as e:
            # Fallback: use content as-is
            rendered_md = content_md
        section_html = _markdown_to_html(rendered_md, safe=True)

        # Append section block
        blocks.append(f"<h2>{html_mod.escape(sec.title)}</h2>{section_html}")

    # Base CSS for readability and PDF stability
    base_css = """
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; color: #111; line-height: 1.6; }
    h1 { font-size: 28px; margin: 16px 0; }
    h2 { font-size: 20px; margin: 16px 0 8px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
    figure { page-break-inside: avoid; }
    img { display: block; }
    """

    html_doc = (
        "<!doctype html>"
        "<html><head><meta charset='utf-8'>"
        f"<title>{html_mod.escape(rpt.title)}</title>"
        f"<style>{base_css}</style>"
        "</head><body>"
        f"<h1>{html_mod.escape(rpt.title)}</h1>"
        f"{''.join(blocks)}"
        "</body></html>"
    )

    return {
        "html": html_doc,
        "report": rpt,
        "metrics": kpi_metrics,
        "tables": tables,
        "charts": all_charts,   # [{title, path, section_id}]
        "csv_paths": [],
    }
