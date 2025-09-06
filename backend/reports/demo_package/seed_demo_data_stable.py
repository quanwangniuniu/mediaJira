#!/usr/bin/env python3
"""
MediaJira Reports - Stable Demo Data Seeding Script
==================================================
Robust demo script that handles ID conflicts and ensures repeatability.
Features:
- Random ID generation to avoid conflicts
- Comprehensive error handling
- Automatic cleanup
- Stable execution
"""

import json
import os
import sys
import argparse
import uuid
import time
from django.conf import settings
from django.utils import timezone

# Setup Django
if __name__ == "__main__":
    import django
    sys.path.append('/app')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()

from reports.models import ReportTemplate, Report, ReportSection, Job, ReportAsset
from django.contrib.auth import get_user_model

User = get_user_model()

def generate_unique_ids():
    """Generate unique IDs with timestamp and UUID"""
    timestamp = int(time.time())
    unique_suffix = str(uuid.uuid4())[:8]
    
    return {
        'template_id': f"marketing-template-en-{timestamp}-{unique_suffix}",
        'report_id': f"demo-marketing-report-en-{timestamp}-{unique_suffix}"
    }

def cleanup_existing_data(force=False):
    """Comprehensive cleanup with error handling"""
    print("🧹 Cleaning existing demo data...")
    
    cleanup_stats = {
        'reports': 0,
        'templates': 0,
        'sections': 0,
        'jobs': 0,
        'assets': 0
    }
    
    try:
        # Clean reports by title pattern
        deleted = Report.objects.filter(
            title__icontains='Marketing Campaign Performance'
        ).delete()
        cleanup_stats['reports'] = deleted[0] if deleted[0] > 0 else 0
        
        # Clean reports by ID pattern  
        deleted = Report.objects.filter(
            id__startswith='demo-marketing-report-en-'
        ).delete()
        cleanup_stats['reports'] += deleted[0] if deleted[0] > 0 else 0
        
        # Clean templates
        deleted = ReportTemplate.objects.filter(
            id__startswith='marketing-template-en-'
        ).delete()
        cleanup_stats['templates'] = deleted[0] if deleted[0] > 0 else 0
        
        # Clean sections
        deleted = ReportSection.objects.filter(
            report__title__icontains='Marketing Campaign Performance'
        ).delete()
        cleanup_stats['sections'] = deleted[0] if deleted[0] > 0 else 0
        
        # Clean jobs (check if task_name field exists)
        try:
            deleted = Job.objects.filter(
                task_name__in=['export_report', 'publish_report']
            ).delete()
            cleanup_stats['jobs'] = deleted[0] if deleted[0] > 0 else 0
        except Exception:
            # If task_name field doesn't exist, clean by other criteria
            deleted = Job.objects.filter(
                id__contains='exp_'
            ).delete()
            cleanup_stats['jobs'] = deleted[0] if deleted[0] > 0 else 0
        
        # Clean demo assets
        try:
            deleted = ReportAsset.objects.filter(
                report_id__startswith='demo-marketing-report-en-'
            ).delete()
            cleanup_stats['assets'] = deleted[0] if deleted[0] > 0 else 0
        except Exception:
            # Alternative cleanup method
            deleted = ReportAsset.objects.filter(
                file_url__contains='demo-marketing-report-en-'
            ).delete()
            cleanup_stats['assets'] = deleted[0] if deleted[0] > 0 else 0
        
        total_cleaned = sum(cleanup_stats.values())
        if total_cleaned > 0:
            print(f"   Cleaned: {cleanup_stats['reports']} reports, {cleanup_stats['templates']} templates, "
                  f"{cleanup_stats['sections']} sections, {cleanup_stats['jobs']} jobs, {cleanup_stats['assets']} assets")
        else:
            print("   No existing demo data found")
            
        print("✅ Cleanup completed successfully")
        
    except Exception as e:
        print(f"⚠️  Cleanup warning: {e}")
        if not force:
            print("   Continuing anyway...")

def load_inline_data():
    """Load data with better error handling"""
    json_path = "/app/reports/demo_package/inline_result.json"
    
    if not os.path.exists(json_path):
        print(f"❌ Data file not found: {json_path}")
        return None
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if 'rows' not in data or 'columns' not in data:
            print("❌ Invalid data format - missing 'rows' or 'columns'")
            return None
            
        print(f"✅ Data loaded: {len(data['rows'])} rows, {len(data['columns'])} columns")
        return data
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON parse error: {e}")
        return None
    except Exception as e:
        print(f"❌ Data loading error: {e}")
        return None

def ensure_user():
    """Ensure admin user exists with robust error handling"""
    try:
        # Try to get existing user by email first
        try:
            user = User.objects.get(email='admin')
            print(f"✅ User exists: {user.email}")
            return user
        except User.DoesNotExist:
            pass
        
        # Try to get by username
        try:
            user = User.objects.get(username='admin')
            print(f"✅ User exists: {user.username}")
            return user
        except User.DoesNotExist:
            pass
        
        # Create new user
        user = User.objects.create_user(
            username='admin',
            email='admin',
            password='Admin123test'
        )
        user.is_staff = True
        user.is_superuser = True
        user.save()
        
        print(f"✅ User created: {user.email}")
        return user
        
    except Exception as e:
        print(f"❌ User creation failed: {e}")
        raise

def create_stable_template(template_id):
    """Create template with robust error handling"""
    try:
        template_blocks = [
            {
                'type': 'text',
                'id': 'sec-executive-summary',
                'title': 'Executive Summary',
                'content': '''# Marketing Campaign Performance Report

## Report Overview
Time Period: January 1, 2024 - January 31, 2024
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
''',
                'order': 1
            },
            {
                'type': 'data',
                'id': 'sec-performance-analysis',  
                'title': 'Campaign Performance Analysis',
                'content': '''## Complete Data Table
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
                'id': 'sec-complete-data',
                'title': 'Complete Data Table',
                'content': '''## Raw Campaign Data

This section contains the complete dataset used for analysis:

{{ html_tables.raw_data }}

**Data Period**: {{ date_range }}
**Total Records**: {{ active_campaigns }} campaigns
**Last Updated**: Generated on {{ "now"|date:"Y-m-d H:i" }}
''',
                'order': 3
            }
        ]

        template_variables = {
            'date_range': 'Data Period',
            'total_cost': 9723.31,
            'total_revenue': 491.84,
            'net_profit': -9231.47,
            'roi_percentage': -97.47,
            'avg_cpc': 2.9,
            'avg_cac': 2430.83,
            'active_campaigns': 145
        }

        # Generate unique name with timestamp
        unique_name = f'Marketing Campaign Performance Template (English) - {int(time.time())}'
        
        template = ReportTemplate.objects.create(
            id=template_id,
            name=unique_name,
            version=1,
            is_default=True,
            blocks=template_blocks,
            variables=template_variables
        )

        print(f"✅ Template created: {template.name} v{template.version} (ID: {template.id})")
        return template

    except Exception as e:
        print(f"❌ Template creation failed: {e}")
        raise

def create_stable_report(template, user, inline_data, report_id):
    """Create report with comprehensive error handling"""
    try:
        # Calculate statistics from data
        rows = inline_data['rows']
        columns = inline_data['columns']
        
        # Store inline_data in correct format
        slice_config_with_data = {
            'dataset': 'marketing_campaigns',
            'data_source': 'inline_result.json',
            'rows_count': len(rows)-1,
            'slices': {
                'default': {
                    'data_root': inline_data,
                    'dimensions': ['Name', 'Status'],
                    'metrics': ['Clicks', 'Cost', 'Revenue', 'ROI']
                }
            }
        }

        # Create report
        report_data = {
            'id': report_id,
            'title': 'Marketing Campaign Performance Report - Real Data Analysis (English)',
            'owner_id': str(user.id),
            'status': 'draft',
            'report_template': template,
            'slice_config': slice_config_with_data
        }

        report = Report.objects.create(**report_data)

        # Create sections with charts
        sections_data = [
            {
                'title': 'Executive Summary',
                'content_md': template.blocks[0]['content'],
                'order': 1,
                'charts': [
                    {'type': 'bar', 'title': 'Campaign Performance Overview', 'x': 'Name', 'y': 'Cost', 'data_source': 'default'},
                    {'type': 'bar', 'title': 'ROI Analysis', 'x': 'Name', 'y': 'ROI', 'data_source': 'default'}
                ],
                'source_slice_ids': ['default']
            },
            {
                'title': 'Campaign Performance Analysis',
                'content_md': template.blocks[1]['content'],
                'order': 2,
                'charts': [
                    {'type': 'scatter', 'title': 'Cost vs Revenue Scatter', 'x': 'Cost', 'y': 'Revenue', 'data_source': 'default'},
                    {'type': 'bar', 'title': 'Campaign Status Distribution', 'x': 'Status', 'y': 'Clicks', 'data_source': 'default'}
                ],
                'source_slice_ids': ['default']
            },
            {
                'title': 'Complete Data Table',
                'content_md': template.blocks[2]['content'],
                'order': 3,
                'charts': [
                    {'type': 'bar', 'title': 'Revenue Analysis', 'x': 'Status', 'y': 'Revenue', 'data_source': 'default'}
                ],
                'source_slice_ids': ['default']
            }
        ]

        for i, section_data in enumerate(sections_data):
            section_id = f"{report_id}-section-{i+1}-{str(uuid.uuid4())[:8]}"
            ReportSection.objects.create(
                id=section_id,
                report=report,
                title=section_data['title'],
                content_md=section_data['content_md'],
                order_index=section_data['order'],
                charts=section_data['charts'],
                source_slice_ids=section_data['source_slice_ids']
            )

        print(f"✅ Report created: {report.title} (ID: {report.id})")
        print(f"✅ Created {len(sections_data)} report sections with complete data")
        
        return report

    except Exception as e:
        print(f"❌ Report creation failed: {e}")
        raise

def main():
    parser = argparse.ArgumentParser(description='Stable demo data creation for MediaJira Reports')
    parser.add_argument('--clean', action='store_true', help='Clean existing demo data before creating new')
    parser.add_argument('--force-clean', action='store_true', help='Force cleanup even on errors')
    args = parser.parse_args()

    print("🌱 MediaJira Reports - Stable Demo Data Script")
    print("=" * 60)

    try:
        # Generate unique IDs first
        ids = generate_unique_ids()
        print(f"🔧 Generated unique IDs:")
        print(f"   Template ID: {ids['template_id']}")
        print(f"   Report ID: {ids['report_id']}")

        # Cleanup if requested
        if args.clean or args.force_clean:
            cleanup_existing_data(force=args.force_clean)

        # Load data
        print("\n📊 Loading data...")
        inline_data = load_inline_data()
        if not inline_data:
            print("❌ Failed to load data")
            return 1

        # Ensure user exists
        print("\n👤 Setting up user...")
        user = ensure_user()

        # Create template
        print("\n📋 Creating template...")
        template = create_stable_template(ids['template_id'])

        # Create report
        print("\n📄 Creating report...")
        report = create_stable_report(template, user, inline_data, ids['report_id'])

        # Success summary
        print("\n" + "=" * 60)
        print("🎉 STABLE DEMO DATA CREATION COMPLETED!")
        print(f"📋 Template ID: {template.id}")
        print(f"📄 Report ID: {report.id}")
        print(f"👤 User: {user.email}")
        print(f"📈 Data rows: {len(inline_data['rows'])-1}")

        print(f"\n🚀 Next steps:")
        print(f"1. View report: curl -u {user.email}:Admin123test http://localhost:8000/api/reports/{report.id}/")
        print(f"2. Submit for approval: curl -u {user.email}:Admin123test -X POST http://localhost:8000/api/reports/{report.id}/submit/")
        print(f"3. Run complete demo: ./demo_package/demo_api_celery.sh {report.id}")

        return 0

    except Exception as e:
        print(f"\n❌ DEMO CREATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
