# =============================
# File: /app/reports/services/assembler.py
# Purpose: Assemble sections (Native Python -> Markdown -> HTML) and inline chart <img>s
# Notes:
#  - KPI aggregation is driven by the *requested* metrics, not hardcoded.
#  - HTML tables are rendered from the materialized tables.
#  - Chart generation is best-effort; failures won't break the export.
# =============================
from __future__ import annotations
from typing import Dict, Any, List, Optional, Union
import html as html_mod
import base64
import os, tempfile, logging
import time
import re

log = logging.getLogger(__name__)

# === CHART DEPENDENCIES ===
try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    MATPLOTLIB_AVAILABLE = True
except Exception:
    plt = None
    MATPLOTLIB_AVAILABLE = False

from ..models import Report
from .csv_converter import CSVConverter, CSVConversionError


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


def _fmt_cell(v: Any, column_name: str = "") -> str:
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
        # For HTML display, show full names; truncation will be handled by CSS in PDF
        # Only truncate very long strings to prevent layout issues
        if len(v) > 100:
            return v[:97] + "..."
        return v
    
    if isinstance(v, float):
        # Format floats with reasonable precision
        if abs(v) > 1000:
            return f"{v:,.1f}"
        else:
            return f"{v:.2f}"
    
    if isinstance(v, int):
        # Don't add commas to integers - keep them as plain numbers
            return str(v)

    return str(v)


def _table_html(rows: List[Dict[str, Any]]) -> str:
    """
    Render a styled <table> from a list of dict rows. Empty -> HTML comment.
    """
    if not rows:
        return "<!-- empty table -->"
    headers = _headers_from_rows(rows)
    
    # Standard column style for all columns
    def get_column_style(header):
        return "border: 1px solid #ddd; padding: 2px; text-align: left; word-wrap: break-word; max-width: 80px; font-size: 6pt;"
    
    thead = "<tr>" + "".join(f"<th style='{get_column_style(h)}'>{html_mod.escape(str(h))}</th>" for h in headers) + "</tr>"
    body_parts: List[str] = []
    for r in rows:
        tds = "".join(f"<td style='{get_column_style(h)}'>{html_mod.escape(_fmt_cell(r.get(h), h))}</td>" for h in headers)
        body_parts.append(f"<tr>{tds}</tr>")
    tbody = "".join(body_parts)
    return f"""<table style="border-collapse: collapse; width: 100%; margin: 4px 0; font-family: Arial, sans-serif; border: 1px solid #ddd; table-layout: fixed; word-wrap: break-word; font-size: 6pt;">
    <thead style="background-color: #f8f9fa;">
        {thead}
    </thead>
    <tbody>
        {tbody}
    </tbody>
</table>"""


# === CHART DEPENDENCIES AND HELPERS ===


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


def _aggregate_kpis_from_default(default_rows: List[Dict[str, Any]], requested_metrics: List[str]) -> Dict[str, Any]:
    """
    Aggregate a KPI dict from the 'default' table based on requested metrics.
    - For each requested metric M, sum numeric values across rows (if present).
    - If ROI/ROAS are requested but not present as numbers, derive them from Cost + Revenue.
        ROI  = (Revenue - Cost) / Cost    (ratio)
        ROAS =  Revenue / Cost            (multiplier)
    - We *never* average row-level ROI/ROAS; mixing percentages across rows is meaningless.
    - Exclude 'Total' rows from campaign count and calculations.
    """
    requested_metrics = list(requested_metrics or [])
    acc: Dict[str, Any] = {}
    
    # Filter out 'Total' rows to avoid double counting
    data_rows = []
    for r in default_rows:
        # Skip rows where Name is 'Total' or similar summary indicators
        name = str(r.get('Name', '')).strip().lower()
        if name not in ['total', 'summary', 'grand total']:
            data_rows.append(r)
    
    # Add campaign count (excluding Total rows) - ALWAYS include this
    acc['campaign_count'] = len(data_rows)

    # 1) Sum the requested metrics that are numeric
    for m in requested_metrics:
        total = 0.0
        seen = False
        for r in data_rows:  # Use filtered data_rows instead of default_rows
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
    
    # 3) Calculate Net Profit correctly (Revenue - Cost)
    # Note: CSV data has incorrect "Net Profit" column (shows Revenue), so we calculate it properly
    if cost is not None and revenue is not None:
        acc["Net Profit"] = revenue - cost
    else:
        # If we can't calculate from Cost/Revenue, try to use the "Profit" column if available
        profit_total = 0.0
        profit_seen = False
        for r in data_rows:
            v = _to_number(r.get("Profit"))
            if v is not None:
                profit_total += v
                profit_seen = True
        if profit_seen:
            acc["Net Profit"] = profit_total

    return acc


def _process_csv_data(csv_data: Union[str, Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Process CSV data and convert to structured format for report assembly.
    
    Args:
        csv_data: CSV data as string or dictionary with CSV content
        
    Returns:
        Dictionary with processed tables
    """
    try:
        converter = CSVConverter()
        
        if isinstance(csv_data, str):
            # Direct CSV string
            result = converter.convert_string_to_json(csv_data)
        elif isinstance(csv_data, dict):
            if 'csv_content' in csv_data:
                # Dictionary with CSV content
                result = converter.convert_string_to_json(csv_data['csv_content'])
            elif 'csv_file_path' in csv_data:
                # Dictionary with CSV file path
                result = converter.convert_file_to_json(csv_data['csv_file_path'])
            else:
                # Assume it's already processed data
                return {'default': csv_data.get('data', [])}
        else:
            log.warning(f"Unsupported CSV data type: {type(csv_data)}")
            return {'default': []}
        
        # Return structured data
        return {
            'default': result.get('data', []),
            'metadata': result.get('metadata', {}),
            'headers': result.get('headers', [])
        }
        
    except CSVConversionError as e:
        log.error(f"CSV processing failed: {e}")
        return {'default': [], 'error': str(e)}
    except Exception as e:
        log.error(f"Unexpected error in CSV processing: {e}")
        return {'default': [], 'error': str(e)}


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
        # Check for CSV data first
        if 'csv_data' in data:
            csv_result = _process_csv_data(data['csv_data'])
            tables = {'default': csv_result.get('default', [])}
            # Store CSV metadata for potential use
            if 'metadata' in csv_result:
                data['csv_metadata'] = csv_result['metadata']
        # If no 'tables' key, check if data has 'default' key or treat entire data as 'default' table
        elif 'default' in data:
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

    html_tables = {name: _table_html(rows) for name, rows in tables.items()}

    def safe_round(value, ndigits=2):
        """Safe round function that handles None and other problematic types"""
        try:
            if value is None:
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

    tpl_vars: Dict[str, Any] = rpt.report_template.variables if rpt.report_template else {}

    def clean_value(value: Any) -> Any:
        """Clean template variables for safe string formatting"""
        if value is None:
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

    tpl_vars = {k: clean_value(v) for k, v in tpl_vars.items()}

    context = {
        'report': rpt,
        'tables': tables,
        'html_tables': html_tables,
        'kpi_metrics': kpi_metrics,
        'requested_metrics': requested_metrics,
        **tpl_vars
    }

    additional_charts = {}
    if tables and 'default' in tables:
        additional_charts = _generate_all_charts_from_data(tables['default'])

    rendered_sections = []
    for section_idx, section in enumerate(rpt.sections.all()):
        try:
            section_charts = section.charts or []
            
            chart_configs = []
            for chart_data in section_charts:
                if isinstance(chart_data, dict) and 'type' in chart_data:
                    config = {
                        'type': chart_data.get('type', 'bar'),
                        'title': chart_data.get('title', 'Chart'),
                        'data': chart_data.get('data', [])
                    }
                    chart_configs.append(config)
            
            chart_paths = _generate_charts_from_section_data(section_charts, section.id)
            
            if section_idx == 0 and additional_charts:
                for chart_type, chart_path in additional_charts.items():
                    chart_paths.append({
                        'title': f'{chart_type.replace("_", " ").title()}',
                        'path': chart_path,
                        'type': chart_type
                    })
            
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
            
            if hasattr(section, 'content_md') and section.content_md:
                try:
                    content_md = section.content_md
                    
                    # Remove template artifacts like #<h2> and similar
                    content_md = re.sub(r'#<h[1-6]>', '', content_md)
                    content_md = re.sub(r'</h[1-6]><br>', '', content_md)
                    content_md = re.sub(r'#<br>', '', content_md)
                    # Remove standalone # symbols
                    content_md = re.sub(r'^#\s*$', '', content_md, flags=re.MULTILINE)
                    content_md = re.sub(r'\n#\s*\n', '\n\n', content_md)
                    # Remove #<h2> patterns that appear in the middle of text
                    content_md = re.sub(r'#<h2>', '', content_md)
                    # Also remove any remaining #<h2> patterns that might have been created during markdown processing
                    content_md = re.sub(r'#<h2>', '', content_md)
                    
                    template_vars = {
                        'campaign_count': kpi_metrics.get('campaign_count', 0),
                        'total_cost': kpi_metrics.get('Cost', 0),
                        'total_revenue': kpi_metrics.get('Revenue', 0),
                        'net_profit': kpi_metrics.get('Net Profit', kpi_metrics.get('Revenue', 0) - kpi_metrics.get('Cost', 0)),
                        'overall_roi': kpi_metrics.get('ROI', 0)
                    }
                    
                    for var_name, var_value in template_vars.items():
                        if isinstance(var_value, (int, float)):
                            if var_name == 'overall_roi':
                                content_md = content_md.replace(f'{{{{ {var_name} }}}}', f'{var_value:.2f}')
                            else:
                                content_md = content_md.replace(f'{{{{ {var_name} }}}}', f'{var_value:,.2f}')
                        else:
                            content_md = content_md.replace(f'{{{{ {var_name} }}}}', str(var_value))
                    
                    net_profit_value = template_vars.get('net_profit', 0)
                    if isinstance(net_profit_value, (int, float)):
                        net_profit_formatted = f'${net_profit_value:,.2f}'
                        content_md = re.sub(r'Net profit[^:]*:.*?\$[0-9,.-]+', f'Net profit: {net_profit_formatted}', content_md, flags=re.IGNORECASE)
                    
                    campaign_count = kpi_metrics.get('campaign_count', 0)
                    content_md = re.sub(r'Total campaigns analyzed: 108', f'Total campaigns analyzed: {campaign_count}', content_md)
                    content_md = re.sub(r'campaigns analyzed: 108', f'campaigns analyzed: {campaign_count}', content_md)
                    
                    content_html = content_md.replace('\n', '<br>')
                    content_html = content_html.replace('## ', '<h2>').replace('\n', '</h2><br>')
                    content_html = content_html.replace('# ', '<h1>').replace('\n', '</h1><br>')
                    
                    content_html = re.sub(r'#<h2>', '', content_html)
                    content_html = re.sub(r'#<h1>', '', content_html)
                    
                    section_title_patterns = [
                        f'<h2>{section.title}</h2>',
                        f'<h2>{section.title}<br>',
                        f'<h2>{section.title}</h2><br>'
                    ]
                    for pattern in section_title_patterns:
                        if pattern in content_html:
                            content_html = content_html.replace(pattern, '')
                    
                    rendered_html = f"""
                    <div class="section">
                    <h2>{section.title}</h2>
                    <div class="content">
                        {content_html}
                        </div>
                    </div>
                    """
                    
                    for chart in chart_images:
                        rendered_html += f'''
                    <div class="chart-container">
                        <h3>{chart["title"]}</h3>
                        <img src="{chart["data_url"]}" alt="{chart["title"]}" />
                    </div>
                    '''
                    
                    if section_idx == 0 and 'default' in html_tables and html_tables['default']:
                        rendered_html += f'''
                    <div class="table">
                        {html_tables["default"]}
                    </div>
                    '''
                except Exception as e:
                    log.error("Failed to render section template %s: %s", section.id, e)
                    rendered_html = f"<h2>{section.title}</h2>"
                    if hasattr(section, 'content_md') and section.content_md:
                        rendered_html += f"<div class='content'>{section.content_md}</div>"
            else:
                rendered_html = f"<h2>{section.title}</h2>"
                
                for chart in chart_images:
                    rendered_html += f'<div class="chart"><h3>{chart["title"]}</h3><img src="{chart["data_url"]}" alt="{chart["title"]}" /></div>'
                
                if section_idx == 0 and 'default' in html_tables:
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

    final_html = ""
    for section in rendered_sections:
        final_html += section['html'] + "\n"

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
                # Use the new quadrant chart for scatter plots
                # Convert data to campaign format for the new function
                campaigns = []
                for item in data:
                    campaigns.append({
                        'name': str(item.get('name', 'Unknown'))[:30],
                        'cost': float(item.get('spend', item.get('x', 0)) or 0),
                        'roi': float(item.get('roi', item.get('y', 0)) or 0),
                        'revenue': float(item.get('revenue', 0) or 0),
                        'profit': float(item.get('profit', 0) or 0)
                    })
                path = _generate_roi_cost_quadrant_chart(campaigns)
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
        # Use portrait-oriented figure size for PDF printing
        fig, ax = plt.subplots(figsize=(6, 4))
        
        # Create bar chart with better styling
        bars = ax.bar(range(len(x_data)), y_data, color='#007bff', alpha=0.8, edgecolor='white', linewidth=1)
        
        # Customize chart with smaller fonts for PDF
        ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
        ax.set_xlabel('Campaigns', fontsize=10, fontweight='bold')
        ax.set_ylabel('Cost ($)', fontsize=10, fontweight='bold')
        
        # Set x-axis labels with better spacing - CRITICAL FIX
        ax.set_xticks(range(len(x_data)))
        ax.set_xticklabels(x_data, rotation=45, ha='right', fontsize=8)
        
        # Ensure all bars are visible by setting proper limits
        ax.set_xlim(-0.5, len(x_data) - 0.5)
        
        # Add value labels on bars
        for i, (bar, value) in enumerate(zip(bars, y_data)):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + max(y_data)*0.02,
                   f'${value:.0f}', ha='center', va='bottom', fontsize=8, fontweight='bold')
        
        # Add grid for better readability
        ax.grid(True, alpha=0.3, axis='y')
        ax.set_axisbelow(True)
        
        plt.tight_layout()
        
        # Save to temporary file with better settings for PDF
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight', pad_inches=0.3)
        plt.close(fig)
        
        return temp_file.name
    except Exception as e:
        log.error("Failed to generate bar chart: %s", e)
        return None




def _generate_all_charts_from_data(data: List[Dict[str, Any]]) -> Dict[str, str]:
    """Generate insightful charts from the data with optimized data processing."""
    chart_paths = {}
    
    if not MATPLOTLIB_AVAILABLE or not data:
        return chart_paths
    
    try:
        # Process data once and reuse for all charts
        processed_data = _process_campaign_data(data)
        if not processed_data:
            return chart_paths
        
        # Generate all charts using the same processed data
        # Order: Top 10 by Cost and ROI vs Cost first, then others
        chart_generators = [
            ('roi_category_pie_chart', _generate_roi_category_pie_chart),
            ('top_cost_chart', _generate_top_cost_chart),
            ('quadrant_chart', _generate_roi_cost_quadrant_chart),
            ('profit_loss_chart', _generate_profit_loss_chart),
            ('efficiency_chart', _generate_cost_efficiency_chart),
            ('status_chart', _generate_spend_return_by_status_chart)
        ]
        
        for chart_name, generator_func in chart_generators:
            try:
                chart_path = generator_func(processed_data)
                if chart_path:
                    chart_paths[chart_name] = chart_path
            except Exception as e:
                log.error("Failed to generate %s: %s", chart_name, e)
        
    except Exception as e:
        log.error("Failed to generate charts from data: %s", e)
    
    return chart_paths

def _process_campaign_data(data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Process raw data into standardized campaign format - called once for all charts."""
    campaigns = []
    
    for row in data:
        if not row.get('Name') or row.get('Name') == 'Total':
            continue
            
        # Extract and convert data
        cost = float(row.get('Cost', 0) or 0)
        revenue = float(row.get('Revenue', 0) or 0)
        profit = float(row.get('Profit', 0) or 0)
        name = str(row.get('Name', ''))[:100]  # Show more characters in charts
        status = str(row.get('Status', ''))
        sales = float(row.get('Sales', 0) or 0)
        leads = float(row.get('Leads', 0) or 0)
        calls = float(row.get('Calls', 0) or 0)
        ad_source_id = str(row.get('Ad Source ID', ''))
        
        # Calculate derived metrics once
        cost_per_sale = cost / sales if sales > 0 else float('inf')
        cost_per_lead = cost / leads if leads > 0 else float('inf')
        cost_per_call = cost / calls if calls > 0 else float('inf')
        roi = (revenue - cost) / cost if cost > 0 else 0
        
        campaigns.append({
            'name': name,
            'cost': cost,
            'revenue': revenue,
            'profit': profit,
            'status': status,
            'sales': sales,
            'leads': leads,
            'calls': calls,
            'Ad Source ID': ad_source_id,
            'cost_per_sale': cost_per_sale,
            'cost_per_lead': cost_per_lead,
            'cost_per_call': cost_per_call,
            'roi': roi
        })
    
    return campaigns

def _generate_top_cost_chart(campaigns: List[Dict[str, Any]]) -> Optional[str]:
    """Generate a bar chart showing top 10 campaigns by cost."""
    try:
        # Filter campaigns with cost > 0
        valid_campaigns = [c for c in campaigns if c['cost'] > 0]
        
        if not valid_campaigns:
            return None
        
        # Sort by cost (descending) and take top 10
        sorted_campaigns = sorted(valid_campaigns, key=lambda x: x['cost'], reverse=True)[:10]
        
        if not sorted_campaigns:
            return None
        
        # Prepare data
        names = [c['name'] for c in sorted_campaigns]
        costs = [c['cost'] for c in sorted_campaigns]
        source_ids = [c.get('Ad Source ID', 'N/A') for c in sorted_campaigns]
        
        # Create chart
        fig, ax = plt.subplots(figsize=(12, 6))
        
        # Create horizontal bar chart for better readability
        y_pos = range(len(names))
        bars = ax.barh(y_pos, costs, color='steelblue', alpha=0.7)
        
        # Customize chart
        ax.set_yticks(y_pos)
        # Create labels with Source ID below campaign name
        labels_with_source_id = []
        for name, source_id in zip(names, source_ids):
            labels_with_source_id.append(f"{name}\n{source_id}")
        ax.set_yticklabels(labels_with_source_id, fontsize=9)
        ax.set_xlabel('Cost ($)', fontsize=12, fontweight='bold')
        ax.set_title('Top 10 Campaigns by Cost', fontsize=14, fontweight='bold', pad=20)
        
        # Add value labels on bars
        for i, (bar, cost) in enumerate(zip(bars, costs)):
            width = bar.get_width()
            ax.text(width + max(costs) * 0.01, bar.get_y() + bar.get_height()/2, 
                   f'${cost:,.0f}', ha='left', va='center', fontsize=9, fontweight='bold')
        
        
        # Invert y-axis to show highest cost at top
        ax.invert_yaxis()
        
        # Adjust layout
        plt.tight_layout()
        
        # Save chart
        chart_path = f'/tmp/top_cost_chart_{int(time.time())}.png'
        plt.savefig(chart_path, dpi=150, bbox_inches='tight', pad_inches=0.3)
        plt.close()
        
        return chart_path
        
    except Exception as e:
        log.error("Failed to generate top cost chart: %s", e)
        return None

def _generate_profit_loss_chart(campaigns: List[Dict[str, Any]]) -> Optional[str]:
    """Generate a diverging bar chart showing top 5 profitable and top 5 loss-making campaigns."""
    try:
        # Sort by profit (descending for profitable, ascending for losses)
        profitable = [c for c in campaigns if c['profit'] > 0]
        loss_making = [c for c in campaigns if c['profit'] < 0]
        
        profitable.sort(key=lambda x: x['profit'], reverse=True)
        loss_making.sort(key=lambda x: x['profit'])
        
        # Get top 5 of each
        top_profitable = profitable[:5]
        top_losses = loss_making[:5]
        
        if not top_profitable and not top_losses:
            return None
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        # Prepare data
        names = []
        profits = []
        colors = []
        source_ids = []
        
        # Add loss-making campaigns (negative values)
        for campaign in top_losses:
            names.append(campaign['name'])
            profits.append(campaign['profit'])
            colors.append('#ff6b6b')  # Red for losses
            source_ids.append(campaign.get('Ad Source ID', 'N/A'))
        
        # Add profitable campaigns (positive values)
        for campaign in top_profitable:
            names.append(campaign['name'])
            profits.append(campaign['profit'])
            colors.append('#51cf66')  # Green for profits
            source_ids.append(campaign.get('Ad Source ID', 'N/A'))
        
        # Create horizontal bar chart
        y_pos = range(len(names))
        bars = ax.barh(y_pos, profits, color=colors, alpha=0.8)
        
        # Customize chart
        ax.set_yticks(y_pos)
        # Create labels with Source ID below campaign name
        labels_with_source_id = []
        for name, source_id in zip(names, source_ids):
            labels_with_source_id.append(f"{name}\n{source_id}")
        ax.set_yticklabels(labels_with_source_id, fontsize=7)
        ax.set_xlabel('Net Profit ($)', fontsize=10, fontweight='bold')
        ax.set_title('Top 5 Profitable vs Top 5 Loss-Making Campaigns', fontsize=14, fontweight='bold', pad=20)
        
        # Add zero line
        ax.axvline(x=0, color='black', linestyle='-', linewidth=0.8)
        
        # Add value labels on bars
        for i, (bar, profit) in enumerate(zip(bars, profits)):
            width = bar.get_width()
            ax.text(width + (5 if width > 0 else -5), bar.get_y() + bar.get_height()/2, 
                   f'${profit:.0f}', ha='left' if width > 0 else 'right', va='center', fontsize=8)
        
        # Add legend
        ax.legend(['Loss-Making', 'Profitable'], loc='upper right')
        
        plt.tight_layout()
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight', pad_inches=0.3)
        plt.close(fig)
        
        return temp_file.name
    except Exception as e:
        log.error("Failed to generate profit/loss chart: %s", e)
        return None


def _generate_roi_category_pie_chart(campaigns: List[Dict[str, Any]]) -> Optional[str]:
    """Generate a pie chart categorizing campaigns by ROI intervals."""
    try:
        # Categorize campaigns by ROI
        categories = {
            'Profitable (>0%)': [],
            'Break Even (0%)': [],
            'Moderate Loss (0% to -50%)': [],
            'High Loss (<-50%)': []
        }
        
        for campaign in campaigns:
            roi = campaign.get('roi', 0)
            if roi > 0:
                categories['Profitable (>0%)'].append(campaign)
            elif roi == 0:
                categories['Break Even (0%)'].append(campaign)
            elif roi > -0.5:  # Between 0% and -50% ROI (exclusive of 0%)
                categories['Moderate Loss (0% to -50%)'].append(campaign)
            else:  # roi <= -0.5 (<= -50% ROI)
                categories['High Loss (<-50%)'].append(campaign)
        
        
        # Remove empty categories
        non_zero_categories = {k: len(v) for k, v in categories.items() if v}
        
        if not non_zero_categories:
            return None
        
        # Prepare data with full labels
        labels = list(non_zero_categories.keys())
        sizes = list(non_zero_categories.values())
        colors = ['#51cf66', '#74c0fc', '#ffd43b', '#ff6b6b']  # Green, Blue, Yellow, Red
        
        # Create pie chart with larger size
        fig, ax = plt.subplots(figsize=(12, 10))
        
        # Create pie chart
        wedges, texts, autotexts = ax.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%', 
                                         startangle=90, textprops={'fontsize': 12})
        
        # Customize text
        for autotext in autotexts:
            autotext.set_color('white')
            autotext.set_fontweight('bold')
            autotext.set_fontsize(14)
        
        # Set title
        ax.set_title('ROI Category Distribution', fontsize=16, fontweight='bold', pad=20)
        
        
        plt.tight_layout()
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        fig.savefig(temp_file.name, format='png', bbox_inches='tight')
        plt.close(fig)
        return temp_file.name
        
    except Exception as e:
        log.error("Failed to generate ROI category pie chart: %s", e)
        return None


def _generate_cost_efficiency_chart(campaigns: List[Dict[str, Any]]) -> Optional[str]:
    """Generate a horizontal bar chart showing cost efficiency metrics."""
    try:
        # Filter campaigns with meaningful data
        valid_campaigns = [c for c in campaigns if c['cost'] > 0 and (c['sales'] > 0 or c['leads'] > 0 or c['calls'] > 0)]
        
        if not valid_campaigns:
            return None
        
        # Calculate efficiency scores (lower is better)
        efficiency_data = []
        for campaign in valid_campaigns:
            # Use cost per sale as primary metric, fallback to cost per lead, then cost per call
            if campaign['sales'] > 0:
                efficiency = campaign['cost_per_sale']
                metric = 'CPS'
            elif campaign['leads'] > 0:
                efficiency = campaign['cost_per_lead']
                metric = 'CPL'
            elif campaign['calls'] > 0:
                efficiency = campaign['cost_per_call']
                metric = 'CPC'
            else:
                continue
            
            if efficiency != float('inf'):
                efficiency_data.append({
                    'name': campaign['name'],
                    'efficiency': efficiency,
                    'metric': metric,
                    'cost': campaign['cost'],
                    'sales': campaign['sales'],
                    'leads': campaign['leads'],
                    'calls': campaign['calls'],
                    'Ad Source ID': campaign.get('Ad Source ID', 'N/A')
                })
        
        # Sort by efficiency (ascending - most efficient first)
        efficiency_data.sort(key=lambda x: x['efficiency'])
        
        # Take top 15 for readability
        top_15 = efficiency_data[:15]
        
        if not top_15:
            return None
        
        fig, ax = plt.subplots(figsize=(10, 8))
        
        names = [item['name'] for item in top_15]
        efficiencies = [item['efficiency'] for item in top_15]
        metrics = [item['metric'] for item in top_15]
        source_ids = [item.get('Ad Source ID', 'N/A') for item in top_15]
        
        # Color based on efficiency (green for good, red for poor)
        colors = []
        max_eff = max(efficiencies)
        min_eff = min(efficiencies)
        
        for eff in efficiencies:
            if max_eff == min_eff:
                colors.append('#51cf66')
            else:
                # Normalize to 0-1, then map to color
                normalized = (eff - min_eff) / (max_eff - min_eff)
                if normalized < 0.3:
                    colors.append('#51cf66')  # Green for efficient
                elif normalized < 0.7:
                    colors.append('#ffd43b')  # Yellow for medium
                else:
                    colors.append('#ff6b6b')  # Red for inefficient
        
        y_pos = range(len(names))
        bars = ax.barh(y_pos, efficiencies, color=colors, alpha=0.8)
        
        # Customize chart
        ax.set_yticks(y_pos)
        # Create labels with Source ID below campaign name
        labels_with_source_id = []
        for name, source_id in zip(names, source_ids):
            labels_with_source_id.append(f"{name}\n{source_id}")
        ax.set_yticklabels(labels_with_source_id, fontsize=7)
        ax.set_xlabel('Cost Efficiency ($)', fontsize=10, fontweight='bold')
        ax.set_title('Cost Efficiency Analysis (Lower is Better)', fontsize=14, fontweight='bold', pad=20)
        
        # Add value labels
        for i, (bar, eff, metric) in enumerate(zip(bars, efficiencies, metrics)):
            width = bar.get_width()
            ax.text(width + width*0.01, bar.get_y() + bar.get_height()/2, 
                   f'${eff:.0f} ({metric})', ha='left', va='center', fontsize=8)
        
        
        plt.tight_layout()
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight', pad_inches=0.3)
        plt.close(fig)
        
        return temp_file.name
    except Exception as e:
        log.error("Failed to generate cost efficiency chart: %s", e)
        return None


def _generate_spend_return_by_status_chart(campaigns: List[Dict[str, Any]]) -> Optional[str]:
    """Generate a grouped bar chart showing spend vs return by status."""
    try:
        # Group by status
        status_data = {}
        for campaign in campaigns:
            status = campaign['status']
            if status not in status_data:
                status_data[status] = {'cost': 0, 'revenue': 0, 'count': 0}
            status_data[status]['cost'] += campaign['cost']
            status_data[status]['revenue'] += campaign['revenue']
            status_data[status]['count'] += 1
        
        if not status_data:
            return None
        
        statuses = list(status_data.keys())
        costs = [status_data[s]['cost'] for s in statuses]
        revenues = [status_data[s]['revenue'] for s in statuses]
        counts = [status_data[s]['count'] for s in statuses]
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        x = range(len(statuses))
        width = 0.35
        
        # Create grouped bars
        bars1 = ax.bar([i - width/2 for i in x], costs, width, label='Total Cost', color='#ff6b6b', alpha=0.8)
        bars2 = ax.bar([i + width/2 for i in x], revenues, width, label='Total Revenue', color='#51cf66', alpha=0.8)
        
        # Customize chart
        ax.set_xlabel('Campaign Status', fontsize=12, fontweight='bold')
        ax.set_ylabel('Amount ($)', fontsize=12, fontweight='bold')
        ax.set_title('Spend vs Return by Campaign Status', fontsize=16, fontweight='bold', pad=20)
        ax.set_xticks(x)
        ax.set_xticklabels(statuses, fontsize=11)
        ax.legend(fontsize=11)
        
        # Calculate max value for y-axis limit
        max_value = max(max(costs), max(revenues))
        ax.set_ylim(0, max_value * 1.3)  # Add more space at the top
        
        # Add value labels on bars
        for bar, value in zip(bars1, costs):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + max_value*0.01,
                   f'${value:.0f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
        
        for bar, value in zip(bars2, revenues):
            height = bar.get_height()
            ax.text(bar.get_x() + bar.get_width()/2., height + max_value*0.01,
                   f'${value:.0f}', ha='center', va='bottom', fontsize=9, fontweight='bold')
        
        # Add campaign count labels with background box
        for i, count in enumerate(counts):
            y_pos = max_value * 1.15  # Position above the bars
            ax.text(i, y_pos, f'({count} campaigns)', 
                   ha='center', va='bottom', fontsize=10, style='italic',
                   bbox=dict(boxstyle='round,pad=0.3', facecolor='lightgray', alpha=0.7))
        
        plt.tight_layout()
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight', pad_inches=0.3)
        plt.close(fig)
        
        return temp_file.name
    except Exception as e:
        log.error("Failed to generate spend/return by status chart: %s", e)
        return None


def _generate_roi_cost_quadrant_chart(campaigns: List[Dict[str, Any]]) -> Optional[str]:
    """Generate a quadrant scatter plot showing ROI vs Cost."""
    try:
        # Filter campaigns with meaningful data
        valid_campaigns = [c for c in campaigns if c['cost'] > 0]
        
        if not valid_campaigns:
            return None
        
        costs = [c['cost'] for c in valid_campaigns]
        rois = [c['roi'] * 100 for c in valid_campaigns]  # Convert to percentage
        names = [c['name'] for c in valid_campaigns]
        
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # Create scatter plot
        scatter = ax.scatter(costs, rois, c=rois, cmap='RdYlGn', alpha=0.7, s=60, edgecolors='black', linewidth=0.5)
        
        # Add quadrant lines
        median_cost = sorted(costs)[len(costs)//2]
        median_roi = sorted(rois)[len(rois)//2]
        
        ax.axhline(y=median_roi, color='black', linestyle='--', alpha=0.5, linewidth=1)
        ax.axvline(x=median_cost, color='black', linestyle='--', alpha=0.5, linewidth=1)
        
        # Add quadrant labels
        ax.text(median_cost * 0.1, max(rois) * 0.9, 'High ROI\nLow Cost\n(Growth Potential)', 
               ha='center', va='center', fontsize=10, bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgreen", alpha=0.7))
        ax.text(max(costs) * 0.9, max(rois) * 0.9, 'High ROI\nHigh Cost\n(Winners)', 
               ha='center', va='center', fontsize=10, bbox=dict(boxstyle="round,pad=0.3", facecolor="lightblue", alpha=0.7))
        ax.text(median_cost * 0.1, min(rois) * 1.1, 'Low ROI\nLow Cost\n(Irrelevant)', 
               ha='center', va='center', fontsize=10, bbox=dict(boxstyle="round,pad=0.3", facecolor="lightgray", alpha=0.7))
        ax.text(max(costs) * 0.9, min(rois) * 1.1, 'Low ROI\nHigh Cost\n(Burning Money)', 
               ha='center', va='center', fontsize=10, bbox=dict(boxstyle="round,pad=0.3", facecolor="lightcoral", alpha=0.7))
        
        # Customize chart
        ax.set_xlabel('Cost ($)', fontsize=10, fontweight='bold')
        ax.set_ylabel('ROI (%)', fontsize=10, fontweight='bold')
        ax.set_title('ROI vs Cost Quadrant Analysis', fontsize=14, fontweight='bold', pad=20)
        
        # Add colorbar
        cbar = plt.colorbar(scatter, ax=ax)
        cbar.set_label('ROI (%)', fontsize=10)
        
        # Add grid
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        plt.savefig(temp_file.name, dpi=150, bbox_inches='tight', pad_inches=0.3)
        plt.close(fig)
        
        return temp_file.name
    except Exception as e:
        log.error("Failed to generate ROI/cost quadrant chart: %s", e)
        return None



# Legacy chart generation functions removed - now using _generate_charts_from_section_data


