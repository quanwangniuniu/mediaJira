#!/usr/bin/env python3
"""
Script to generate HTML from test data
"""
import os
import sys
import django
from django.conf import settings

# Add the project root to Python path
sys.path.insert(0, '/app')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from reports.models import Report, ReportTemplate, ReportSection
from core.models import CustomUser
from reports.services.assembler import assemble
import random
import string

def generate_random_id(length=8):
    """Generate a random ID"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def create_test_data():
    """Create test data similar to the e2e test"""
    # Create user
    user_id = f"test_user_{generate_random_id()}"
    user = CustomUser.objects.create(
        email=f"{user_id}@example.com",
        username=user_id,
        first_name="Test",
        last_name="User"
    )
    
    # Create template
    template_id = f"tpl_{generate_random_id()}"
    template = ReportTemplate.objects.create(
        id=template_id,
        name=f"Test Template {template_id}",
        version=1
    )
    
    # Create report
    report_id = f"e2e_{generate_random_id()}"
    report = Report.objects.create(
        id=report_id,
        title=f"E2E Test Report {report_id}",
        owner_id=user.id,
        report_template=template,
        status="approved",
        slice_config={
            "dataset": "test_data",
            "dimensions": ["channel", "campaign"],
            "metrics": ["cost", "revenue", "leads"],
            "tables": {
                "default": {
                    "columns": ["channel", "campaign", "cost", "revenue", "leads"],
                    "rows": [
                        {"channel": "Google Ads", "campaign": "Campaign A", "cost": 1000, "revenue": 2500, "leads": 50},
                        {"channel": "Facebook Ads", "campaign": "Campaign B", "cost": 800, "revenue": 2000, "leads": 40},
                        {"channel": "Twitter Ads", "campaign": "Campaign C", "cost": 600, "revenue": 1500, "leads": 30},
                        {"channel": "YouTube Ads", "campaign": "Campaign A", "cost": 1200, "revenue": 3000, "leads": 60},
                        {"channel": "Instagram Ads", "campaign": "Campaign B", "cost": 900, "revenue": 2200, "leads": 45}
                    ]
                }
            }
        }
    )
    
    # Create section
    section_id = f"sec_{generate_random_id()}"
    section = ReportSection.objects.create(
        id=section_id,
        report=report,
        title="Executive Summary",
        order_index=0,
        content_md="""# {{ title }}

## Key Metrics
- Total Records: {{ total_records }}
- Total Cost: ${{ total_cost | round(2) }}
- Total Revenue: ${{ total_revenue | round(2) }}

## Data Table
{% if html_tables.default %}
{{ html_tables.default }}
{% endif %}
""",
        charts=[
            {"type": "line", "title": "Performance Chart"},
            {"type": "bar", "title": "Revenue Chart"}
        ]
    )
    
    return report

def main():
    """Main function"""
    print("Creating test data...")
    
    # Clean up any existing test data
    CustomUser.objects.filter(email__contains="test_user_").delete()
    ReportTemplate.objects.filter(name__contains="Test Template").delete()
    Report.objects.filter(title__contains="E2E Test Report").delete()
    
    # Create test data
    report = create_test_data()
    print(f"Created report: {report.id}")
    
    # Generate HTML
    print("Generating HTML...")
    data = report.slice_config
    result = assemble(report.id, data)
    
    if result and 'html' in result:
        html_content = result['html']
        print(f"✅ HTML生成成功: {len(html_content)}字符")
        
        # Save HTML to file
        with open('/app/test_e2e_output.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        print('✅ HTML已保存到 /app/test_e2e_output.html')
        
        # Show preview
        print("\n=== HTML内容预览 ===")
        print(html_content[:1000])
        print("\n... (更多内容)")
        
    else:
        print('❌ HTML生成失败')
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
