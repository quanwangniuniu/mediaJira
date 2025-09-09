#!/usr/bin/env python3
"""
Script to generate a complete report from CSV data
- Creates report template
- Creates report with sections
- Generates charts
- Exports to PDF
"""

import json
import requests
import uuid
import random
import time
from datetime import datetime, timedelta
import base64
import io

# Configuration
BASE_URL = "http://nginx/api"
USERNAME = "zhangkahuang8@gmail.com"
PASSWORD = "Admin123test"

class ReportGenerator:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.report_id = None
        self.template_id = None
        
    def authenticate(self):
        """Authenticate and get token"""
        auth_url = f"http://nginx/auth/login/"
        auth_data = {
            "email": USERNAME,
            "password": PASSWORD
        }
        
        response = self.session.post(auth_url, json=auth_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("token")
            self.session.headers.update({
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            })
            print("✅ Authentication successful")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code} - {response.text}")
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
        
        response = self.session.post(f"{BASE_URL}/report-templates/", json=template_data)
        if response.status_code == 201:
            print(f"✅ Template created: {self.template_id}")
            return True
        else:
            print(f"❌ Template creation failed: {response.status_code} - {response.text}")
            return False
    
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
        
        response = self.session.post(f"{BASE_URL}/reports/", json=report_data)
        if response.status_code == 201:
            print(f"✅ Report created: {self.report_id}")
            return True
        else:
            print(f"❌ Report creation failed: {response.status_code} - {response.text}")
            return False
    
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
        
        for section in sections:
            response = self.session.post(
                f"{BASE_URL}/reports/{self.report_id}/sections/",
                json=section
            )
            if response.status_code == 201:
                print(f"✅ Section created: {section['title']}")
            else:
                print(f"❌ Section creation failed: {response.status_code} - {response.text}")
    
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
        response = self.session.post(f"{BASE_URL}/reports/{self.report_id}/submit/")
        if response.status_code == 200:
            print("✅ Report submitted for review")
            return True
        else:
            print(f"❌ Report submission failed: {response.status_code} - {response.text}")
            return False
    
    def approve_report(self):
        """Approve report"""
        approval_data = {
            "action": "approve",
            "comment": "Report approved for publication"
        }
        
        response = self.session.post(
            f"{BASE_URL}/reports/{self.report_id}/approve/",
            json=approval_data
        )
        if response.status_code == 200:
            print("✅ Report approved")
            return True
        else:
            print(f"❌ Report approval failed: {response.status_code} - {response.text}")
            return False
    
    def export_pdf(self):
        """Export report to PDF"""
        export_data = {
            "format": "pdf",
            "theme": "light",
            "include_raw_csv": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/reports/{self.report_id}/export/",
            json=export_data
        )
        if response.status_code == 202:
            job_data = response.json()
            job_id = job_data["id"]
            print(f"✅ Export job started: {job_id}")
            
            # Wait for job completion
            return self.wait_for_job_completion(job_id)
        else:
            print(f"❌ Export failed: {response.status_code} - {response.text}")
            return False
    
    def wait_for_job_completion(self, job_id, max_wait=60):
        """Wait for job to complete"""
        start_time = time.time()
        while time.time() - start_time < max_wait:
            response = self.session.get(f"{BASE_URL}/jobs/{job_id}/")
            if response.status_code == 200:
                job_data = response.json()
                status = job_data["status"]
                print(f"Job status: {status}")
                
                if status == "succeeded":
                    print("✅ Export job completed successfully")
                    return True
                elif status == "failed":
                    print(f"❌ Export job failed: {job_data.get('message', 'Unknown error')}")
                    return False
            
            time.sleep(2)
        
        print("❌ Export job timed out")
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
