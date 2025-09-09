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
import os, tempfile, logging
from datetime import datetime
import time

log = logging.getLogger(__name__)

# markdown removed - not used

# === CHART DEPENDENCIES ===
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    from matplotlib.ticker import FuncFormatter
    import numpy as np
    MATPLOTLIB_AVAILABLE = True
except Exception:
    plt = None
    mdates = None
    FuncFormatter = None
    np = None
    MATPLOTLIB_AVAILABLE = False

# pandas removed - using pure matplotlib for chart generation

from ..models import Report

# === CHART STYLING ===
BRAND_COLORS = ["#007bff", "#28a745", "#ffc107", "#17a2b8", "#6c757d", "#dc3545"]

CHART_STYLE = {
    "figure.figsize": (8, 4.5),
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "axes.edgecolor": "#dee2e6",
    "axes.linewidth": 1,
    "axes.labelcolor": "#495057",
    "axes.titlecolor": "#212529",
    "axes.titlesize": 14,
    "axes.labelsize": 12,
    "grid.color": "#e9ecef",
    "grid.alpha": 0.7,
    "grid.linewidth": 0.5,
    "font.family": "sans-serif",
    "font.sans-serif": ["Segoe UI", "Arial", "DejaVu Sans", "Liberation Sans"],
    "font.size": 11,
    "xtick.color": "#6c757d",
    "ytick.color": "#6c757d",
}

# markdown functions removed - not used


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
    Render a styled <table> from a list of dict rows. Empty -> HTML comment.
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
    return f"""<table style="border-collapse: collapse; width: 100%; margin: 20px 0; font-family: Arial, sans-serif;">
    <thead style="background-color: #f8f9fa;">
        {thead}
    </thead>
    <tbody>
        {tbody}
    </tbody>
</table>"""


# === CHART DEPENDENCIES AND HELPERS ===
def _check_chart_deps():
    if not MATPLOTLIB_AVAILABLE:
        raise ImportError("matplotlib is required. pip install matplotlib")
    # pandas no longer required - using pure matplotlib


def _apply_chart_style():
    if plt:
        plt.rcParams.update(CHART_STYLE)


def _save_chart_fig(fig, prefix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=".png", prefix=f"{prefix}_")
    os.close(fd)
    try:
        fig.savefig(path, dpi=96, bbox_inches="tight", facecolor="white", edgecolor="none")
        return path
    except Exception as e:
        if os.path.exists(path):
            os.unlink(path)
        raise
    finally:
        plt.close(fig)


def _fmt_currency(x, pos):
    if abs(x) >= 1e6: return f"${x/1e6:.1f}M"
    if abs(x) >= 1e3: return f"${x/1e3:.0f}K"
    return f"${x:.0f}"


def _fmt_percent(x, pos, ratio=True):
    v = x * 100 if ratio else x
    return f"{v:.1f}%"


def _fmt_large(x, pos):
    if abs(x) >= 1e6: return f"{x/1e6:.1f}M"
    if abs(x) >= 1e3: return f"{x/1e3:.0f}K"
    return f"{x:.0f}"


# _to_numeric_series removed - no longer needed without pandas


def _embed_image_as_base64(image_path: str) -> str:
    """Convert image file to base64 data URL for embedding in HTML."""
    try:
        with open(image_path, "rb") as f:
            img_data = f.read()
        b64_data = base64.b64encode(img_data).decode("utf-8")
        return f"data:image/png;base64,{b64_data}"
    except Exception as e:
        log.error("Failed to embed image %s: %s", image_path, e)
        return ""


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
def assemble(report_id: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Simplified assembly: Get report sections, render with data and charts, return HTML.
    
    Args:
        report_id: Report ID
        data: Dictionary containing tables and any additional context
    
    Returns:
        Dict with HTML string and metadata for export
    """
    # Load report + related objects
    rpt = Report.objects.prefetch_related("sections", "report_template").get(pk=report_id)

    # Extract or create tables from data
    if data is None:
        data = {}
    
    tables: Dict[str, List[Dict[str, Any]]] = data.get('tables', {})
    if not tables:
        # If no 'tables' key, check if data has 'default' key or treat entire data as 'default' table
        if 'default' in data:
            tables = {'default': data['default']}
        elif isinstance(data, list):
            tables = {'default': data}
        elif isinstance(data, dict) and data:
            tables = {'default': [data]}
        else:
            tables = {'default': []}

    # Simplified metrics extraction
    requested_metrics: List[str] = (getattr(rpt, "slice_config", {}) or {}).get("metrics", [])
    
    # Aggregate KPI snapshot from the default table using the requested metrics
    default_rows = tables.get("default", []) or []
    kpi_metrics = _aggregate_kpis_from_default(default_rows, requested_metrics)

    # Render HTML tables for all tables (so template can use {{ html_tables['default'] }})
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

    # Clean template variables
    tpl_vars = {k: clean_value(v) for k, v in tpl_vars.items()}

    # Build context for template rendering
    context = {
        'report': rpt,
        'tables': tables,
        'html_tables': html_tables,
        'kpi_metrics': kpi_metrics,
        'requested_metrics': requested_metrics,
        **tpl_vars
    }

    # Render sections
    rendered_sections = []
    for section in rpt.sections.all():
        try:
            # Get chart data from this section
            section_charts = section.charts or []
            
            # Convert section chart data to chart configs for generation
            chart_configs = []
            for chart_data in section_charts:
                if isinstance(chart_data, dict) and 'type' in chart_data:
                    config = {
                        'type': chart_data.get('type', 'bar'),
                        'title': chart_data.get('title', 'Chart'),
                        'data': chart_data.get('data', [])
                    }
                    chart_configs.append(config)
            
            # Generate charts for this section
            chart_paths = _generate_charts_from_section_data(section_charts, section.id)
            
            # Convert chart paths to base64 data URLs
            chart_images = []
            for chart in chart_paths:
                if chart.get('path'):
                    try:
                        base64_data = _embed_image_as_base64(chart['path'])
                        if base64_data:
                            chart_images.append({
                                'title': chart.get('title', 'Chart'),
                                'data_url': base64_data
                            })
                    except Exception as e:
                        log.error("Failed to embed chart %s: %s", chart.get('path'), e)
            
            # Render section content
            if hasattr(section, 'content_md') and section.content_md:
                # Convert markdown to HTML and render as template
                try:
                    # Simple markdown to HTML conversion for basic formatting
                    content_html = section.content_md.replace('\n', '<br>')
                    content_html = content_html.replace('## ', '<h2>').replace('\n', '</h2><br>')
                    content_html = content_html.replace('# ', '<h1>').replace('\n', '</h1><br>')
                    
                    # Create a simple template with the content
                    template_content = f"""
                    <h2>{section.title}</h2>
                    <div class="content">
                        {content_html}
                    </div>
                    """ + """
                    {% for chart in charts %}
                    <div class="chart">
                        <h3>{{ chart.title }}</h3>
                        <img src="{{ chart.data_url }}" alt="{{ chart.title }}" />
                    </div>
                    {% endfor %}
                    {% if html_tables.default %}
                    <div class="table">
                        {{ html_tables.default }}
                    </div>
                    {% endif %}
                    """
                    
                    template = env.from_string(template_content)
                    rendered_html = template.render(**context, charts=chart_images)
                except Exception as e:
                    log.error("Failed to render section template %s: %s", section.id, e)
                    # Fallback to simple HTML
                    rendered_html = f"<h2>{section.title}</h2>"
                    if hasattr(section, 'content_md') and section.content_md:
                        rendered_html += f"<div class='content'>{section.content_md}</div>"
            else:
                # Fallback: simple HTML with tables and charts
                rendered_html = f"<h2>{section.title}</h2>"
                
                # Add charts
                for chart in chart_images:
                    rendered_html += f'<div class="chart"><h3>{chart["title"]}</h3><img src="{chart["data_url"]}" alt="{chart["title"]}" /></div>'
                
                # Add default table if available
                if 'default' in html_tables:
                    rendered_html += f'<div class="table">{html_tables["default"]}</div>'
            
            rendered_sections.append({
                'id': section.id,
                'title': section.title,
                'html': rendered_html
            })
            
        except Exception as e:
            log.error("Failed to render section %s: %s", section.id, e)
            rendered_sections.append({
                'id': section.id,
                'title': section.title,
                'html': f"<h2>{section.title}</h2><p>Error rendering section: {str(e)}</p>"
            })

    # Combine all sections into final HTML
    final_html = ""
    for section in rendered_sections:
        final_html += section['html'] + "\n"

    # Return result
    return {
        'html': final_html,
        'sections': rendered_sections,
        'tables': tables,
        'kpi_metrics': kpi_metrics,
        'report_id': report_id
    }


# === CHART GENERATION FUNCTIONS ===
def _generate_charts_from_section_data(section_charts: List[Dict[str, Any]], 
                                      section_id: Optional[str] = None) -> List[Dict[str, str]]:
    """Generate charts from section chart data."""
    if not MATPLOTLIB_AVAILABLE:
        log.warning("Matplotlib not available, skipping chart generation")
        return []
    
    _apply_chart_style()
    paths: List[Dict[str, str]] = []
    
    for chart_data in section_charts or []:
        try:
            if not isinstance(chart_data, dict) or 'type' not in chart_data:
                continue
                
            ctype = chart_data.get("type", "bar")
            data = chart_data.get("data", [])
            title = chart_data.get("title", "Chart")
            
            if not data:
                log.warning("Chart data empty for %s", title)
                continue
            
            if ctype == "bar":
                # Extract x and y data for bar chart
                x_data = [item.get('channel', item.get('category', f'Item {i}')) for i, item in enumerate(data)]
                y_data = [item.get('spend', item.get('value', 0)) for item in data]
                path = _generate_bar_chart_from_arrays(x_data, y_data, title)
            elif ctype == "scatter":
                # Extract x and y data for scatter chart
                x_data = [item.get('spend', item.get('x', 0)) for item in data]
                y_data = [item.get('roi', item.get('y', 0)) for item in data]
                path = _generate_scatter_chart_from_arrays(x_data, y_data, title)
            else:
                log.warning("Unsupported chart type: %s", ctype)
                continue
            
            if path:
                paths.append({'path': path, 'title': title})
                
        except Exception as e:
            log.error("Failed to generate chart %s: %s", title, e)
    
    return paths

def _generate_bar_chart_from_arrays(x_data: List[str], y_data: List[float], title: str) -> Optional[str]:
    """Generate a bar chart from x and y arrays."""
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Create bar chart
        bars = ax.bar(x_data, y_data, color=BRAND_COLORS[0], alpha=0.8)
        
        # Customize chart
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_xlabel('Channel', fontsize=12)
        ax.set_ylabel('Spend', fontsize=12)
        
        # Rotate x-axis labels if they're long
        plt.xticks(rotation=45, ha='right')
        
        # Add value labels on bars
        for bar, value in zip(bars, y_data):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height,
                   f'${value:.0f}', ha='center', va='bottom')
        
        plt.tight_layout()
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight')
        plt.close(fig)
        
        return temp_file.name
    except Exception as e:
        log.error("Failed to generate bar chart: %s", e)
        return None

def _generate_scatter_chart_from_arrays(x_data: List[float], y_data: List[float], title: str) -> Optional[str]:
    """Generate a scatter chart from x and y arrays."""
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Create scatter plot
        scatter = ax.scatter(x_data, y_data, c=BRAND_COLORS[1], alpha=0.7, s=60)
        
        # Customize chart
        ax.set_title(title, fontsize=14, fontweight='bold')
        ax.set_xlabel('Spend', fontsize=12)
        ax.set_ylabel('ROI (%)', fontsize=12)
        
        # Add grid
        ax.grid(True, alpha=0.3)
        
        # Add trend line
        if len(x_data) > 1:
            z = np.polyfit(x_data, y_data, 1)
            p = np.poly1d(z)
            # Make trend line more visible with thicker line and different color
            ax.plot(x_data, p(x_data), "r-", alpha=0.9, linewidth=3, label="Trend Line")
            ax.legend()
        
        plt.tight_layout()
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight')
        plt.close(fig)
        
        return temp_file.name
    except Exception as e:
        log.error("Failed to generate scatter chart: %s", e)
        return None

# Legacy chart generation functions removed - now using _generate_charts_from_section_data


