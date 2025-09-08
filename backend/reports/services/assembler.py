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

try:
    import markdown as md
    _MD_AVAILABLE = True
except Exception:
    _MD_AVAILABLE = False

# === CHART DEPENDENCIES ===
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    from matplotlib.ticker import FuncFormatter
    MATPLOTLIB_AVAILABLE = True
except Exception:
    plt = None
    mdates = None
    FuncFormatter = None
    MATPLOTLIB_AVAILABLE = False

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except Exception:
    pd = None
    PANDAS_AVAILABLE = False

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


# === CHART DEPENDENCIES AND HELPERS ===
def _check_chart_deps():
    if not MATPLOTLIB_AVAILABLE:
        raise ImportError("matplotlib is required. pip install matplotlib")
    if not PANDAS_AVAILABLE:
        raise ImportError("pandas is required. pip install pandas")


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


def _to_numeric_series(s: "pd.Series"):
    return pd.to_numeric(s, errors="coerce")


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
    if not tables and 'default' not in data:
        # If no 'tables' key, treat entire data as 'default' table
        if isinstance(data, list):
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


# === CHART GENERATION FUNCTIONS ===
def _generate_charts_from_data(tables: Dict[str, List[Dict[str, Any]]], 
                              chart_configs: List[Dict[str, Any]], 
                              section_id: Optional[str] = None) -> List[Dict[str, str]]:
    """Generate all charts for a section based on config."""
    if not MATPLOTLIB_AVAILABLE or not PANDAS_AVAILABLE:
        log.warning("Chart dependencies not available, skipping chart generation")
        return []
    
    _apply_chart_style()
    paths: List[Dict[str, str]] = []
    
    for cfg in chart_configs or []:
        try:
            ctype = cfg.get("type", "line")
            table = cfg.get("table") or cfg.get("slice_id") or "default"
            if table not in tables:
                log.warning("Chart table '%s' missing", table)
                continue
            data = tables[table]
            if not data:
                log.warning("Chart table '%s' empty", table)
                continue
            
            title = cfg.get("title") or ctype.title() + " Chart"
            
            if ctype == "line":
                path = _generate_line_chart(
                    data, 
                    cfg.get("x") or cfg.get("x_column") or "date", 
                    cfg.get("ys") or cfg.get("y_columns") or ["value"], 
                    title=title, 
                    x_label=cfg.get("x_label"), 
                    y_label=cfg.get("y_label"), 
                    y_format=cfg.get("y_format") or cfg.get("format_y_as", "number"), 
                    percent_as_ratio=cfg.get("percent_as_ratio", True)
                )
            elif ctype == "bar":
                path = _generate_bar_chart(
                    data, 
                    cfg.get("x") or cfg.get("x_column") or "category", 
                    cfg.get("y") or cfg.get("y_column") or "value", 
                    title=title, 
                    x_label=cfg.get("x_label"), 
                    y_label=cfg.get("y_label"), 
                    y_format=cfg.get("y_format") or cfg.get("format_y_as", "number"), 
                    horizontal=cfg.get("horizontal", False)
                )
            elif ctype == "pie":
                path = _generate_pie_chart(
                    data, 
                    cfg.get("label") or cfg.get("label_column") or "category", 
                    cfg.get("value") or cfg.get("value_column") or "value", 
                    title=title, 
                    show_percentages=cfg.get("show_percentages", True)
                )
            elif ctype == "scatter":
                path = _generate_scatter_chart(
                    data, 
                    cfg.get("x") or cfg.get("x_column") or "x", 
                    cfg.get("y") or cfg.get("y_column") or "y", 
                    title=title, 
                    x_label=cfg.get("x_label"), 
                    y_label=cfg.get("y_label"), 
                    x_format=cfg.get("x_format", "number"), 
                    y_format=cfg.get("y_format", "number")
                )
            else:
                log.warning("Unknown chart type '%s'", ctype)
                continue
            
            paths.append({"title": title, "path": path, "section_id": section_id or ""})
        except Exception as e:
            log.error("Chart gen failed [%s]: %s", cfg, e)
    
    return paths


def _generate_line_chart(data, x, ys, title, x_label=None, y_label=None, y_format="number", percent_as_ratio=True):
    """Generate line chart using matplotlib"""
    df = pd.DataFrame(data)
    fig, ax = plt.subplots()
    
    for i, col in enumerate(ys):
        y = pd.to_numeric(df[col], errors="coerce")
        ax.plot(df[x], y, marker="o", linewidth=2.2, markersize=5, 
                color=BRAND_COLORS[i % len(BRAND_COLORS)], label=col)
    
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(True)
    ax.set_title(title, fontweight="bold", pad=14)
    ax.set_xlabel(x_label or x)
    ax.set_ylabel(y_label or "Value")
    
    if len(ys) > 1:
        ax.legend()
    
    fig.tight_layout()
    return _save_chart_fig(fig, "line_chart")


def _generate_bar_chart(data, x, y, title, x_label=None, y_label=None, y_format="number", horizontal=False):
    """Generate bar chart using matplotlib"""
    df = pd.DataFrame(data)
    df[y] = pd.to_numeric(df[y], errors="coerce")
    df = df.dropna(subset=[y])
    
    fig, ax = plt.subplots()
    if horizontal:
        ax.barh(df[x].astype(str), df[y], color=BRAND_COLORS[0], alpha=0.9)
    else:
        ax.bar(df[x].astype(str), df[y], color=BRAND_COLORS[0], alpha=0.9)
    
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(True, axis="y")
    ax.set_title(title, fontweight="bold", pad=14)
    ax.set_xlabel(x_label or x)
    ax.set_ylabel(y_label or y)
    
    fig.tight_layout()
    return _save_chart_fig(fig, "bar_chart")


def _generate_pie_chart(data, label, value, title, show_percentages=True):
    """Generate pie chart using matplotlib"""
    df = pd.DataFrame(data)
    df[value] = pd.to_numeric(df[value], errors="coerce")
    df = df[df[value] > 0]
    
    fig, ax = plt.subplots(figsize=(8,8))
    autopct = "%1.1f%%" if show_percentages else None
    colors = (BRAND_COLORS * ((len(df)//len(BRAND_COLORS))+1))[: len(df)]
    ax.pie(df[value], labels=df[label].astype(str), autopct=autopct, colors=colors, startangle=90)
    ax.axis("equal")
    ax.set_title(title, fontweight="bold", pad=14)
    
    fig.tight_layout()
    return _save_chart_fig(fig, "pie_chart")


def _generate_scatter_chart(data, x, y, title, x_label=None, y_label=None, x_format="number", y_format="number"):
    """Generate scatter chart using matplotlib"""
    df = pd.DataFrame(data)
    df[x] = pd.to_numeric(df[x], errors="coerce")
    df[y] = pd.to_numeric(df[y], errors="coerce")
    df = df.dropna(subset=[x, y])
    
    fig, ax = plt.subplots()
    ax.scatter(df[x], df[y], color=BRAND_COLORS[0], alpha=0.7, s=50)
    
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(True)
    ax.set_title(title, fontweight="bold", pad=14)
    ax.set_xlabel(x_label or x)
    ax.set_ylabel(y_label or y)
    
    fig.tight_layout()
    return _save_chart_fig(fig, "scatter_chart")




