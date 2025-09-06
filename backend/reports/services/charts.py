# =============================
# File: /app/reports/services/charts.py
# Purpose: Generate static PNG charts (matplotlib) with consistent branding.
# Notes:
#  - No seaborn hard dependency.
#  - Safe rcParams. Axes spine visibility handled per-axis.
#  - Coerce numeric columns robustly.
#  - Returns rich metadata: [{"title","path","section_id"}]
# =============================
from __future__ import annotations
from typing import Dict, Any, List, Optional, Tuple
import os, tempfile, logging
from datetime import datetime

log = logging.getLogger(__name__)

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

# Brand palette
BRAND_COLORS = ["#007bff", "#28a745", "#ffc107", "#17a2b8", "#6c757d", "#dc3545"]

# Safe rcParams (no axes.spines.* keys here)
CHART_STYLE = {
    "figure.figsize": (8, 4.5),  # Smaller for faster export
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


def _check_deps():
    if not MATPLOTLIB_AVAILABLE:
        raise ImportError("matplotlib is required. pip install matplotlib")
    if not PANDAS_AVAILABLE:
        raise ImportError("pandas is required. pip install pandas")


def _apply_style():
    if plt:
        plt.rcParams.update(CHART_STYLE)


def _save_fig(fig, prefix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=".png", prefix=f"{prefix}_")
    os.close(fd)
    try:
        # Optimized for fast export: lower DPI, smaller file size
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


def generate_line_chart(
    data: List[Dict[str, Any]],
    x: str,
    ys: List[str],
    title: str,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
    y_format: str = "number",
    percent_as_ratio: bool = True,
) -> str:
    _check_deps(); _apply_style()
    if not data:
        raise ValueError("empty data")
    df = pd.DataFrame(data)
    if x not in df.columns:
        raise ValueError(f"x '{x}' not found")
    for col in ys:
        if col not in df.columns:
            raise ValueError(f"y '{col}' not found")
    # x as datetime if possible
    x_data = df[x]
    if pd.api.types.is_object_dtype(x_data):
        try: x_data = pd.to_datetime(x_data)
        except Exception: pass
    fig, ax = plt.subplots()
    # line series
    for i, col in enumerate(ys):
        y = _to_numeric_series(df[col])
        ax.plot(x_data, y, marker="o", linewidth=2.2, markersize=5, color=BRAND_COLORS[i % len(BRAND_COLORS)], label=col)
    # aesthetics
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(True)
    ax.set_title(title, fontweight="bold", pad=14)
    ax.set_xlabel(x_label or x)
    ax.set_ylabel(y_label or "Value")
    if y_format == "currency":
        ax.yaxis.set_major_formatter(FuncFormatter(_fmt_currency))
    elif y_format == "percentage":
        ax.yaxis.set_major_formatter(FuncFormatter(lambda v,p: _fmt_percent(v,p,ratio=percent_as_ratio)))
    elif y_format == "large_numbers":
        ax.yaxis.set_major_formatter(FuncFormatter(_fmt_large))
    # x date formatting
    if pd.api.types.is_datetime64_any_dtype(x_data):
        locator = mdates.AutoDateLocator()
        formatter = mdates.ConciseDateFormatter(locator)
        ax.xaxis.set_major_locator(locator)
        ax.xaxis.set_major_formatter(formatter)
        plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha="right")
    if len(ys) > 1:
        ax.legend(loc="upper left", bbox_to_anchor=(1,1))
    fig.tight_layout()
    return _save_fig(fig, "line_chart")


def generate_bar_chart(
    data: List[Dict[str, Any]],
    x: str,
    y: str,
    title: str,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
    y_format: str = "number",
    horizontal: bool = False,
) -> str:
    _check_deps(); _apply_style()
    if not data:
        raise ValueError("empty data")
    df = pd.DataFrame(data)
    if x not in df.columns or y not in df.columns:
        raise ValueError("x or y not found")
    df[y] = _to_numeric_series(df[y])
    df = df.dropna(subset=[y])
    # Sort for readability
    df = df.sort_values(y, ascending=horizontal)
    fig, ax = plt.subplots()
    if horizontal:
        ax.barh(df[x].astype(str), df[y], color=BRAND_COLORS[0], alpha=0.9)
    else:
        ax.bar(df[x].astype(str), df[y], color=BRAND_COLORS[0], alpha=0.9)
        if df[x].astype(str).str.len().max() > 10:
            plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha="right")
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(True, axis="y")
    ax.set_title(title, fontweight="bold", pad=14)
    ax.set_xlabel(x_label or x)
    ax.set_ylabel(y_label or y)
    axis = ax.xaxis if horizontal else ax.yaxis
    if y_format == "currency":
        axis.set_major_formatter(FuncFormatter(_fmt_currency))
    elif y_format == "percentage":
        axis.set_major_formatter(FuncFormatter(lambda v,p: _fmt_percent(v,p,ratio=True)))
    elif y_format == "large_numbers":
        axis.set_major_formatter(FuncFormatter(_fmt_large))
    fig.tight_layout()
    return _save_fig(fig, "bar_chart")


def generate_pie_chart(
    data: List[Dict[str, Any]],
    label: str,
    value: str,
    title: str,
    show_percentages: bool = True,
) -> str:
    _check_deps(); _apply_style()
    if not data:
        raise ValueError("empty data")
    df = pd.DataFrame(data)
    if label not in df.columns or value not in df.columns:
        raise ValueError("label or value not found")
    df[value] = _to_numeric_series(df[value])
    df = df[df[value] > 0]
    if df.empty:
        raise ValueError("no positive values for pie")
    fig, ax = plt.subplots(figsize=(8,8))
    autopct = "%1.1f%%" if show_percentages else None
    colors = (BRAND_COLORS * ((len(df)//len(BRAND_COLORS))+1))[: len(df)]
    ax.pie(df[value], labels=df[label].astype(str), autopct=autopct, colors=colors, startangle=90)
    ax.axis("equal")
    ax.set_title(title, fontweight="bold", pad=14)
    fig.tight_layout()
    return _save_fig(fig, "pie_chart")


def generate_scatter_chart(
    data: List[Dict[str, Any]],
    x: str,
    y: str,
    title: str,
    x_label: Optional[str] = None,
    y_label: Optional[str] = None,
    x_format: str = "number",
    y_format: str = "number",
) -> str:
    _check_deps(); _apply_style()
    if not data:
        raise ValueError("empty data")
    df = pd.DataFrame(data)
    if x not in df.columns or y not in df.columns:
        raise ValueError("x or y not found")
    df[x] = _to_numeric_series(df[x])
    df[y] = _to_numeric_series(df[y])
    df = df.dropna(subset=[x, y])
    if df.empty:
        raise ValueError("no valid numeric x,y pairs")
    
    fig, ax = plt.subplots()
    ax.scatter(df[x], df[y], color=BRAND_COLORS[0], alpha=0.7, s=50)
    
    # aesthetics
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(True)
    ax.set_title(title, fontweight="bold", pad=14)
    ax.set_xlabel(x_label or x)
    ax.set_ylabel(y_label or y)
    
    # formatting
    if x_format == "currency":
        ax.xaxis.set_major_formatter(FuncFormatter(_fmt_currency))
    elif x_format == "percentage":
        ax.xaxis.set_major_formatter(FuncFormatter(lambda v,p: _fmt_percent(v,p,ratio=True)))
    elif x_format == "large_numbers":
        ax.xaxis.set_major_formatter(FuncFormatter(_fmt_large))
        
    if y_format == "currency":
        ax.yaxis.set_major_formatter(FuncFormatter(_fmt_currency))
    elif y_format == "percentage":
        ax.yaxis.set_major_formatter(FuncFormatter(lambda v,p: _fmt_percent(v,p,ratio=True)))
    elif y_format == "large_numbers":
        ax.yaxis.set_major_formatter(FuncFormatter(_fmt_large))
    
    fig.tight_layout()
    return _save_fig(fig, "scatter_chart")


def generate_charts_from_data(tables: Dict[str, List[Dict[str, Any]]], chart_configs: List[Dict[str, Any]], section_id: Optional[str]=None) -> List[Dict[str, str]]:
    _check_deps()
    paths: List[Dict[str, str]] = []
    for cfg in chart_configs or []:
        try:
            ctype = cfg.get("type", "line")
            table = cfg.get("table") or cfg.get("slice_id") or "default"
            if table not in tables:
                log.warning("Chart table '%s' missing", table); continue
            data = tables[table]
            if not data:
                log.warning("Chart table '%s' empty", table); continue
            title = cfg.get("title") or ctype.title() + " Chart"
            if ctype == "line":
                path = generate_line_chart(data, cfg.get("x") or cfg.get("x_column") or "date", cfg.get("ys") or cfg.get("y_columns") or ["value"], title=title, x_label=cfg.get("x_label"), y_label=cfg.get("y_label"), y_format=cfg.get("y_format") or cfg.get("format_y_as", "number"), percent_as_ratio=cfg.get("percent_as_ratio", True))
            elif ctype == "bar":
                path = generate_bar_chart(data, cfg.get("x") or cfg.get("x_column") or "category", cfg.get("y") or cfg.get("y_column") or "value", title=title, x_label=cfg.get("x_label"), y_label=cfg.get("y_label"), y_format=cfg.get("y_format") or cfg.get("format_y_as", "number"), horizontal=cfg.get("horizontal", False))
            elif ctype == "pie":
                path = generate_pie_chart(data, cfg.get("label") or cfg.get("label_column") or "category", cfg.get("value") or cfg.get("value_column") or "value", title=title, show_percentages=cfg.get("show_percentages", True))
            elif ctype == "scatter":
                path = generate_scatter_chart(data, cfg.get("x") or cfg.get("x_column") or "x", cfg.get("y") or cfg.get("y_column") or "y", title=title, x_label=cfg.get("x_label"), y_label=cfg.get("y_label"), x_format=cfg.get("x_format", "number"), y_format=cfg.get("y_format", "number"))
            else:
                log.warning("Unknown chart type '%s'", ctype); continue
            paths.append({"title": title, "path": path, "section_id": section_id or ""})
        except Exception as e:
            log.error("Chart gen failed [%s]: %s", cfg, e)
    return paths


