#!/usr/bin/env python3
"""
MediaJira Reports - Demo Data Seeding Script (English Version)
=================================================================
This script creates demo data for the MediaJira Reports system:
- Creates a marketing campaign analysis template (English)
- Creates a report with real data from inline_result.json
- Sets up sections with charts and data tables
"""

import json
import os
import sys
import argparse
from django.conf import settings
from django.utils import timezone

# Setup Django
if __name__ == "__main__":
    import django
    sys.path.append('/app')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

from reports.models import ReportTemplate, Report, ReportSection, Job
from django.contrib.auth import get_user_model

User = get_user_model()

def load_inline_data():
    """Load real marketing data from inline_result.json"""
    json_path = "/app/reports/demo_package/inline_result.json"
    if not os.path.exists(json_path):
        print(f"❌ File not found: {json_path}")
        return None
    
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"✅ Data loaded: {len(data['rows'])} rows, {len(data['columns'])} columns")
    return data

def create_marketing_template():
    """Create marketing campaign analysis template (English)"""
    import uuid
    import time
    
    # Generate unique ID with timestamp
    timestamp = int(time.time())
    unique_suffix = str(uuid.uuid4())[:8]
    template_id = f"marketing-template-en-{timestamp}-{unique_suffix}"
    template_blocks = [
        {
            'type': 'text',
            'id': 'sec-executive-summary',
            'title': 'Executive Summary',
            'content': '''# Marketing Campaign Performance Report

## Report Overview
Time Period: {{ date_range }}
Data Source: Real advertising campaign data

## Key Metrics
- **Total Campaign Cost**: ${{ total_cost | round(2) }}
- **Total Revenue**: ${{ total_revenue | round(2) }}
- **Net Profit**: ${{ net_profit | round(2) }}
- **Overall ROI**: {{ roi_percentage }}%
- **Active Campaigns**: {{ active_campaigns }} campaigns

{% if has_chart('campaign_performance_overview') %}
{{ charts.campaign_performance_overview|safe }}
{% endif %}

{% if has_chart('roi_analysis') %}
{{ charts.roi_analysis|safe }}
{% endif %}

## Key Insights
1. **Campaign Efficiency**: Current overall ROI is {{ roi_percentage }}%, requires cost optimization
2. **Channel Performance**: META platform dominates, YouTube and Google show stable performance
3. **Conversion Quality**: Average cost per click ${{ avg_cpc | round(2) }}, customer acquisition cost ${{ avg_cac | round(2) }}

## Data Summary
{{ html_tables.summary_stats }}
''',
            'order': 1
        },
        {
            'type': 'text',
            'id': 'sec-campaign-performance',
            'title': 'Campaign Performance Analysis',
            'content': '''# Campaign Performance Analysis

## Complete Data Table
Below is the detailed performance data for all campaign groups:

{{ html_tables.full_campaign_data }}

## Performance Distribution Charts
{{ chart('cost_vs_revenue_scatter')|safe }}

## ROI Analysis
{{ chart('campaign_status_distribution')|safe }}

### Top Performing Campaigns
{{ html_tables.top_performers }}

### Campaigns Requiring Optimization
{{ html_tables.underperformers }}

## Cost Efficiency Analysis
- **Average CPC**: ${{ avg_cpc | round(2) }}
- **Best CPC**: ${{ best_cpc | round(2) }}
- **Worst CPC**: ${{ worst_cpc | round(2) }}

{% if has_chart('revenue_analysis') %}
{{ charts.revenue_analysis|safe }}
{% endif %}
''',
            'order': 2
        },
        {
            'type': 'table',
            'id': 'sec-data-table',
            'title': 'Complete Data Table',
            'content': '''# Complete Marketing Data Table

{{ html_tables.raw_data }}

This table displays complete data for all {{ active_campaigns }} campaign groups, containing all 58 data fields.
''',
            'order': 3
        }
    ]
    
    template_variables = {
        'date_range': 'January 1, 2024 - January 31, 2024',
        'total_cost': 9477.39,
        'total_revenue': 245.92,
        'net_profit': -9231.47,
        'roi_percentage': -97.47,
        'avg_cpc': 2.9,
        'avg_cac': 2430.83,
        'active_campaigns': 145
    }
    
    template, created = ReportTemplate.objects.update_or_create(
        id=template_id,
        defaults={
            'name': 'Marketing Campaign Performance Analysis Template (English)',
            'version': 1,
            'is_default': True,
            'blocks': template_blocks,
            'variables': template_variables
        }
    )
    
    action = "created" if created else "updated"
    print(f"✅ Template {action}: {template.name} v{template.version} (ID: {template.id})")
    return template

def create_demo_report(template, user, inline_data):
    """Create demo report with real data (English)"""
    import uuid
    import time
    
    # Generate unique report ID
    timestamp = int(time.time())
    unique_suffix = str(uuid.uuid4())[:8]
    report_id = f"demo-marketing-report-en-{timestamp}-{unique_suffix}"
    
    # Calculate statistics from data
    rows = inline_data['rows']
    columns = inline_data['columns']
    
    # Store inline_data in report's slice_config using correct data_root format
    slice_config_with_data = {
        'dataset': 'marketing_campaigns',
        'data_source': 'inline_result.json',
        'rows_count': len(rows)-1,
        'slices': {
            'default': {
                'data_root': inline_data,  # Use correct data_root format
                'dimensions': ['Name', 'Status'],  # Sample dimensions
                'metrics': ['Clicks', 'Cost', 'Revenue', 'ROI']  # Sample metrics
            }
        }
    }
    
    # Find column indices
    col_indices = {col: idx for idx, col in enumerate(columns)}
    
    def safe_float(value, default=0.0):
        if value is None or value == '':
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default
    
    # Calculate statistics
    total_cost = 0
    total_revenue = 0
    total_clicks = 0
    active_campaigns = 0
    
    for row in rows[1:]:  # Skip header
        if len(row) > max(col_indices.get('Cost', 0), col_indices.get('Revenue', 0), col_indices.get('Clicks', 0), col_indices.get('Status', 0)):
            cost = safe_float(row[col_indices.get('Cost', 0)])
            revenue = safe_float(row[col_indices.get('Revenue', 0)])
            clicks = safe_float(row[col_indices.get('Clicks', 0)])
            status = str(row[col_indices.get('Status', 0)]) if col_indices.get('Status', 0) < len(row) else ''
            
            total_cost += cost
            total_revenue += revenue
            total_clicks += clicks
            
            if status in ['ACTIVE', 'PAUSED']:
                active_campaigns += 1
    
    roi_percentage = ((total_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0
    avg_cpc = total_cost / total_clicks if total_clicks > 0 else 0
    avg_cac = total_cost / 4 if total_cost > 0 else 0  # Assume 4 conversions
    
    report_data = {
        'id': report_id,
        'title': 'Marketing Campaign Performance Report - Real Data Analysis (English)',
        'owner_id': str(user.id),
        'status': 'draft',
        'report_template': template,
        'slice_config': slice_config_with_data,
        'export_config_id': 'demo_full_export_en'
    }
    
    report = Report.objects.create(**report_data)
    print(f"✅ Report created: {report.title} (ID: {report.id})")
    
    # Create report sections based on template blocks
    sections_created = 0
    for i, block in enumerate(template.blocks):
        section_content = block.get('content', '')
        
        # Add special content for table type blocks
        if block.get('type') == 'table':
            section_content = f"""# {block.get('title', 'Data Table')}

Below is the complete table with all {len(rows)-1} campaign groups and {len(columns)} data fields:

Data Summary:
- Total campaign cost: ${total_cost:,.2f}
- Total revenue: ${total_revenue:,.2f}
- Overall ROI: {roi_percentage:.2f}%
- Data rows: {len(rows)-1}

{{{{ html_tables.raw_data }}}}

## Data Field Description
- **Name**: Campaign group name
- **Clicks**: Number of clicks
- **Cost**: Campaign cost
- **Revenue**: Revenue generated
- **ROI**: Return on investment
- **Status**: Campaign status (ACTIVE/PAUSED/REMOVED)
"""
        
        # Configure different charts for different sections, supporting Chinese title matching
        section_charts = []
        title = block.get('title', '').lower()
        
        if 'executive' in title or 'summary' in title:
            # Executive summary section - overview charts
            section_charts = [
                {
                    'type': 'bar',
                    'title': 'Campaign Performance Overview',
                    'x': 'Name',
                    'y': 'Cost',
                    'data_source': 'default'
                },
                {
                    'type': 'bar',
                    'title': 'ROI Analysis',
                    'x': 'Name', 
                    'y': 'ROI',
                    'data_source': 'default'
                }
            ]
        elif 'performance' in title or 'analysis' in title or 'campaign' in title:
            # Performance analysis section - detailed charts
            section_charts = [
                {
                    'type': 'scatter',
                    'title': 'Cost vs Revenue Scatter',
                    'x': 'Cost',
                    'y': 'Revenue', 
                    'data_source': 'default'
                },
                {
                    'type': 'bar',
                    'title': 'Campaign Status Distribution',
                    'x': 'Status',
                    'y': 'Clicks',
                    'data_source': 'default'
                }
            ]
        elif 'data' in title or 'table' in title or 'complete' in title:
            # Data table section - simple overview chart
            section_charts = [
                {
                    'type': 'bar',
                    'title': 'Revenue Analysis',
                    'x': 'Status',
                    'y': 'Revenue',
                    'data_source': 'default'
                }
            ]
        
        ReportSection.objects.create(
            id=f'{report.id}-section-{i+1}',
            report=report,
            title=block.get('title', f'Section {i+1}'),
            order_index=block.get('order', i+1),
            content_md=section_content,
            charts=section_charts,  # Add chart configuration
            source_slice_ids=['default']  # Reference default slice
        )
        sections_created += 1
    
    print(f"✅ Created {sections_created} report sections with complete data")
    return report

def create_user_if_needed():
    """Create or get admin user"""
    try:
        user = User.objects.get(username='admin')
        print(f"✅ User exists: {user.username}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='Admin123test'
        )
        print(f"✅ User created: {user.username}")
    
    return user

def main():
    parser = argparse.ArgumentParser(description='Create MediaJira Reports demo data (English)')
    parser.add_argument('--clean', action='store_true', help='Clean existing data')
    parser.add_argument('--template-only', action='store_true', help='Create template only')
    parser.add_argument('--report-only', action='store_true', help='Create report only')
    
    args = parser.parse_args()
    
    print("🌱 MediaJira Reports - Demo Data Seeding Script (English)")
    print("=" * 60)
    
    if args.clean:
        print("🧹 Cleaning existing data...")
        # Clean existing English demo data
        ReportSection.objects.filter(report__title__contains='English').delete()
        Report.objects.filter(title__contains='English').delete()
        ReportTemplate.objects.filter(id__contains='en').delete()
        Job.objects.filter(report__title__contains='English').delete()
        print("✅ Cleanup completed")
    
    # Load data
    inline_data = load_inline_data()
    if not inline_data:
        print("❌ Failed to load data")
        return
    
    # Create user
    user = create_user_if_needed()
    
    # Create template
    if not args.report_only:
        template = create_marketing_template()
    else:
        try:
            template = ReportTemplate.objects.get(id='marketing-performance-template-en')
        except ReportTemplate.DoesNotExist:
            print("❌ Template not found, creating...")
            template = create_marketing_template()
    
    # Create report
    if not args.template_only:
        report = create_demo_report(template, user, inline_data)
        
        print()
        print("📊 Demo data creation completed!")
        print(f"📋 Template ID: {template.id}")
        print(f"📄 Report ID: {report.id}")
        print(f"👤 User: {user.username}")
        print(f"📈 Data rows: {len(inline_data['rows'])-1}")
        print()
        print("🚀 Next steps:")
        print(f"1. View report: curl -u admin:Admin123test http://localhost:8000/api/reports/{report.id}/")
        print(f"2. Submit for approval: curl -u admin:Admin123test -X POST http://localhost:8000/api/reports/{report.id}/submit/")
        print("3. Run complete demo: ./scripts/demo_api_celery.sh")

if __name__ == "__main__":
    main()
