#!/usr/bin/env python
"""
Create test data for reports functionality testing
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append('/app')
django.setup()

from reports.models import ReportTemplate, Report, ReportSection
from core.models import CustomUser

def create_test_data():
    print("🔧 Creating test data...")
    
    # Create or get test user
    user, created = CustomUser.objects.get_or_create(
        email='test@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'User',
            'is_active': True
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    print(f"✅ User: {user.email}")
    
    # Create test template
    template, created = ReportTemplate.objects.get_or_create(
        id='test_template_001',
        defaults={
            'name': 'Marketing Report Template',
            'description': 'Template for marketing campaign reports',
            'is_default': True
        }
    )
    print(f"✅ Template: {template.name}")
    
    # Create test report with realistic data
    test_data = {
        'columns': ['Campaign', 'Impressions', 'Clicks', 'Cost', 'Revenue', 'ROI'],
        'rows': [
            ['Facebook Campaign A', '10000', '500', '250.00', '800.00', '220%'],
            ['Google Ads B', '8000', '400', '200.00', '600.00', '200%'],
            ['YouTube Campaign', '12000', '300', '150.00', '450.00', '200%'],
            ['Summary', '30000', '1200', '600.00', '1850.00', '208%']
        ]
    }
    
    report, created = Report.objects.get_or_create(
        id='test_report_001',
        defaults={
            'title': 'Q4 Marketing Campaign Performance Report',
            'owner': user,
            'report_template': template,
            'slice_config': {'inline_data': test_data},
            'status': 'draft'
        }
    )
    print(f"✅ Report: {report.title}")
    
    # Create test sections
    sections_data = [
        {
            'id': 'section_001',
            'title': 'Executive Summary',
            'content': '''# Executive Summary

## Key Performance Indicators
- **Total Impressions**: 30,000
- **Total Clicks**: 1,200
- **Total Cost**: $600.00
- **Total Revenue**: $1,850.00
- **Overall ROI**: 208%

## Top Performers
1. Facebook Campaign A - 220% ROI
2. Google Ads B - 200% ROI
3. YouTube Campaign - 200% ROI

## Recommendations
Continue investing in Facebook campaigns while optimizing Google Ads targeting.''',
            'order_index': 1
        },
        {
            'id': 'section_002',
            'title': 'Campaign Analysis',
            'content': '''# Campaign Analysis

## Performance Overview
Our Q4 marketing campaigns exceeded expectations with a 208% average ROI.

## Data Table
{{ html_tables.campaign_data }}

## Key Insights
- Facebook campaigns show highest engagement
- Google Ads provide consistent performance
- YouTube campaigns have good reach but lower conversion''',
            'order_index': 2
        }
    ]
    
    for section_data in sections_data:
        section, created = ReportSection.objects.get_or_create(
            id=section_data['id'],
            defaults={
                'report': report,
                'title': section_data['title'],
                'content': section_data['content'],
                'order_index': section_data['order_index']
            }
        )
        print(f"✅ Section: {section.title}")
    
    print("\n🎉 Test data created successfully!")
    print(f"📊 Report ID: {report.id}")
    print(f"👤 User: {user.email} / testpass123")
    
    return report, user

if __name__ == '__main__':
    create_test_data()


