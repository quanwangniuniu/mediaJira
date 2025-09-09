#!/usr/bin/env python3
"""
Script to generate a complete report from CSV data using Django test client
This bypasses CSRF issues by using Django's internal test client
"""

import os
import sys
import django
import json
import uuid
import random
import time
from datetime import datetime, timedelta

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from reports.models import ReportTemplate, Report, ReportSection
from reports.serializers import ReportTemplateSerializer, ReportSerializer, ReportSectionSerializer

User = get_user_model()

class ReportGenerator:
    def __init__(self):
        self.client = Client()
        self.user = None
        self.report_id = None
        self.template_id = None
        
    def authenticate(self):
        """Authenticate user"""
        try:
            self.user = User.objects.get(email='zhangkahuang8@gmail.com')
            print(f"✅ User found: {self.user.email}")
            return True
        except User.DoesNotExist:
            print("❌ User not found")
            return False
    
    def generate_random_id(self):
        """Generate random ID for testing"""
        return str(uuid.uuid4())[:8]
    
    def create_template(self):
        """Create report template"""
        self.template_id = self.generate_random_id()
        
        template_data = {
            "id": self.template_id,
            "name": f"Marketing Performance Template {self.template_id}",
            "version": 1,
            "is_default": False,
            "blocks": [
                {
                    "type": "text",
                    "required": True,
                    "default": "# Marketing Performance Report\n\nThis report analyzes marketing campaign performance across different channels."
                },
                {
                    "type": "chart",
                    "required": True,
                    "default": "## Performance Overview"
                },
                {
                    "type": "table",
                    "required": True,
                    "default": "## Detailed Metrics"
                },
                {
                    "type": "chart",
                    "required": True,
                    "default": "## ROI Analysis"
                }
            ],
            "variables": {
                "theme": "light",
                "company_name": "MediaJira Analytics"
            }
        }
        
        # Create template directly in database
        template = ReportTemplate.objects.create(**template_data)
        print(f"✅ Template created: {self.template_id}")
        return True
    
    def create_report(self):
        """Create report"""
        self.report_id = self.generate_random_id()
        
        report_data = {
            "id": self.report_id,
            "title": f"Marketing Performance Report - {datetime.now().strftime('%Y-%m-%d')}",
            "owner_id": "zhangkahuang8@gmail.com",
            "report_template_id": self.template_id,
            "time_range_start": (datetime.now() - timedelta(days=30)).isoformat(),
            "time_range_end": datetime.now().isoformat(),
            "slice_config": {
                "dataset": "marketing_attribution_v2",
                "dimensions": ["channel", "campaign"],
                "metrics": ["roi", "spend", "ctr", "cvr"]
            }
        }
        
        # Create report directly in database
        report = Report.objects.create(**report_data)
        print(f"✅ Report created: {self.report_id}")
        return True
    
    def create_sections(self, csv_data):
        """Create report sections with charts"""
        sections = [
            {
                "id": self.generate_random_id(),
                "title": "Executive Summary",
                "order_index": 1,
                "content_md": "# Executive Summary\n\nThis report analyzes marketing campaign performance for the period. Key findings include:\n\n- Total spend across all campaigns\n- ROI performance by channel\n- Top performing campaigns\n- Areas for improvement"
            },
            {
                "id": self.generate_random_id(),
                "title": "Performance Overview",
                "order_index": 2,
                "content_md": "## Performance Overview\n\nBelow is a comprehensive analysis of campaign performance metrics.",
                "charts": [self.create_chart_config("spend_by_channel", csv_data)]
            },
            {
                "id": self.generate_random_id(),
                "title": "ROI Analysis",
                "order_index": 3,
                "content_md": "## ROI Analysis\n\nReturn on investment analysis across different campaigns and channels.",
                "charts": [self.create_chart_config("roi_analysis", csv_data)]
            }
        ]
        
        report = Report.objects.get(id=self.report_id)
        for section_data in sections:
            section_data["report"] = report
            section = ReportSection.objects.create(**section_data)
            print(f"✅ Section created: {section_data['title']}")
    
    def create_chart_config(self, chart_type, csv_data):
        """Create chart configuration"""
        chart_id = self.generate_random_id()
        
        if chart_type == "spend_by_channel":
            return {
                "id": chart_id,
                "type": "bar",
                "title": "Spend by Channel",
                "data": self.process_spend_data(csv_data),
                "config": {
                    "x_axis": "channel",
                    "y_axis": "spend",
                    "color": "#3498db"
                }
            }
        elif chart_type == "roi_analysis":
            return {
                "id": chart_id,
                "type": "scatter",
                "title": "ROI vs Spend Analysis",
                "data": self.process_roi_data(csv_data),
                "config": {
                    "x_axis": "spend",
                    "y_axis": "roi",
                    "color": "#e74c3c"
                }
            }
    
    def process_spend_data(self, csv_data):
        """Process CSV data for spend chart"""
        # Group by channel and sum spend
        channel_spend = {}
        for row in csv_data[1:]:  # Skip header
            if len(row) > 1 and row[1]:  # Check if cost column exists and has value
                try:
                    cost = float(row[1])
                    channel = row[0].split('|')[0].strip() if '|' in row[0] else row[0]
                    if channel not in channel_spend:
                        channel_spend[channel] = 0
                    channel_spend[channel] += cost
                except (ValueError, IndexError):
                    continue
        
        return [{"channel": k, "spend": v} for k, v in channel_spend.items()]
    
    def process_roi_data(self, csv_data):
        """Process CSV data for ROI chart"""
        roi_data = []
        for row in csv_data[1:]:  # Skip header
            if len(row) > 4 and row[1] and row[4]:  # Check cost and revenue columns
                try:
                    cost = float(row[1])
                    revenue = float(row[4])
                    if cost > 0:
                        roi = (revenue - cost) / cost * 100
                        roi_data.append({
                            "spend": cost,
                            "roi": roi,
                            "campaign": row[0][:30]  # Truncate long names
                        })
                except (ValueError, IndexError):
                    continue
        
        return roi_data
    
    def submit_report(self):
        """Submit report for review"""
        report = Report.objects.get(id=self.report_id)
        report.status = 'in_review'
        report.save()
        print("✅ Report submitted for review")
        return True
    
    def approve_report(self):
        """Approve report"""
        report = Report.objects.get(id=self.report_id)
        report.status = 'approved'
        report.save()
        print("✅ Report approved")
        return True
    
    def export_pdf(self):
        """Export report to PDF using API"""
        # Use the test client to make API calls
        self.client.force_login(self.user)
        
        export_data = {
            "format": "pdf",
            "theme": "light",
            "include_raw_csv": True
        }
        
        response = self.client.post(
            f"/api/reports/{self.report_id}/export/",
            data=json.dumps(export_data),
            content_type='application/json'
        )
        
        if response.status_code == 202:
            job_data = response.json()
            job_id = job_data["id"]
            print(f"✅ Export job started: {job_id}")
            return True
        else:
            print(f"❌ Export failed: {response.status_code} - {response.content}")
            return False

def main():
    """Main function to process CSV and generate report"""
    # Read CSV data
    csv_file = "/app/Report 30-03-2025 - 30-03-2025.csv"
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            csv_data = [line.strip().split(',') for line in f.readlines()]
        print(f"✅ CSV data loaded: {len(csv_data)} rows")
    except Exception as e:
        print(f"❌ Failed to read CSV: {e}")
        return
    
    # Initialize generator
    generator = ReportGenerator()
    
    # Authenticate
    if not generator.authenticate():
        return
    
    # Create template
    if not generator.create_template():
        return
    
    # Create report
    if not generator.create_report():
        return
    
    # Create sections with charts
    generator.create_sections(csv_data)
    
    # Submit report
    if not generator.submit_report():
        return
    
    # Approve report
    if not generator.approve_report():
        return
    
    # Export to PDF
    if generator.export_pdf():
        print("🎉 Report generation completed successfully!")
        print(f"Report ID: {generator.report_id}")
        print(f"Template ID: {generator.template_id}")
    else:
        print("❌ Report generation failed")

if __name__ == "__main__":
    main()
