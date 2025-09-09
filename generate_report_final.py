#!/usr/bin/env python3
"""
Script to generate a complete report from CSV data using API calls with JWT token
This script gets a JWT token directly from Django and uses it for API calls
"""

import requests
import json
import uuid
import random
import time
from datetime import datetime, timedelta
import subprocess
import sys

# Configuration
BASE_URL = "http://nginx"
USERNAME = "zhangkahuang8@gmail.com"
PASSWORD = "Admin123test"

class ReportGenerator:
    def __init__(self, csv_data):
        self.session = requests.Session()
        self.auth_token = None
        self.report_id = None
        self.template_id = None
        self.csv_data = csv_data
        
    def get_jwt_token(self):
        """Get JWT token directly from Django"""
        try:
            # Use Django shell to get JWT token
            cmd = [
                "python", "manage.py", "shell", "-c",
                f"""
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
User = get_user_model()
user = User.objects.get(email='{USERNAME}')
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)
print(access_token)
"""
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, cwd="/app")
            if result.returncode == 0:
                self.auth_token = result.stdout.strip()
                print("✅ JWT token obtained")
                return True
            else:
                print(f"❌ Failed to get JWT token: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Failed to get JWT token: {e}")
            return False
    
    def refresh_token(self):
        """Refresh JWT token if needed"""
        return self.get_jwt_token()
    
    def authenticate(self):
        """Authenticate using JWT token"""
        if not self.get_jwt_token():
            return False
        
        self.session.headers.update({
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        })
        print("✅ Authentication successful")
        return True
    
    def generate_random_id(self):
        """Generate random ID for testing"""
        return str(uuid.uuid4())[:4]
    
    def convert_csv_to_json(self, csv_data):
        """Convert CSV data to JSON format for slice_config"""
        if not csv_data or len(csv_data) < 2:
            return []
        
        headers = csv_data[0]
        json_data = []
        
        for row in csv_data[1:]:
            if len(row) >= len(headers):
                row_dict = {}
                for i, header in enumerate(headers):
                    if i < len(row):
                        # Convert numeric values
                        value = row[i]
                        if value and value.replace('.', '').replace('-', '').isdigit():
                            try:
                                if '.' in value:
                                    value = float(value)
                                else:
                                    value = int(value)
                            except ValueError:
                                pass
                        row_dict[header] = value
                json_data.append(row_dict)
        
        return json_data
    
    def create_template(self):
        """Create report template"""
        self.refresh_token()
        self.session.headers.update({
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        })
        
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
        
        response = self.session.post(f"{BASE_URL}/api/reports/report-templates/", json=template_data)
        if response.status_code == 201:
            print(f"✅ Template created: {self.template_id}")
            return True
        else:
            print(f"❌ Template creation failed: {response.status_code} - {response.text}")
            return False
    
    def create_report(self):
        """Create report"""
        self.report_id = self.generate_random_id()
        
        # Convert CSV data to JSON format for slice_config
        json_data = self.convert_csv_to_json(self.csv_data)
        
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
                "metrics": ["roi", "spend", "ctr", "cvr"],
                "inline_data": json_data
            }
        }
        
        # Debug: print request data
        print(f"🔍 Request data size: {len(json.dumps(report_data))}")
        print(f"🔍 Inline data count: {len(report_data['slice_config'].get('inline_data', []))}")
        
        response = self.session.post(f"{BASE_URL}/api/reports/reports/", json=report_data)
        if response.status_code == 201:
            print(f"✅ Report created: {self.report_id}")
            # Debug: check response
            result = response.json()
            inline_data = result.get('slice_config', {}).get('inline_data', [])
            print(f"🔍 Response inline_data count: {len(inline_data)}")
            return True
        else:
            print(f"❌ Report creation failed: {response.status_code} - {response.text}")
            return False
    
    def create_sections(self, csv_data):
        """Create report sections with charts"""
        # Convert CSV data to JSON format for chart processing
        json_data = self.convert_csv_to_json(csv_data)
        
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
                "charts": [self.create_chart_config("spend_by_channel", json_data)]
            },
            {
                "id": self.generate_random_id(),
                "title": "ROI Analysis",
                "order_index": 3,
                "content_md": "## ROI Analysis\n\nReturn on investment analysis across different campaigns and channels.",
                "charts": [self.create_chart_config("roi_analysis", json_data)]
            }
        ]
        
        for section in sections:
            response = self.session.post(
                f"{BASE_URL}/api/reports/reports/{self.report_id}/sections/",
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
                "data": self.process_spend_data(json_data),
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
                "data": self.process_roi_data(json_data),
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
        for row in csv_data:
            if isinstance(row, dict) and 'Cost' in row and 'Name' in row:
                try:
                    cost = float(row['Cost']) if row['Cost'] != '-' else 0
                    channel = row['Name'].split('|')[0].strip() if '|' in row['Name'] else row['Name']
                    if channel not in channel_spend:
                        channel_spend[channel] = 0
                    channel_spend[channel] += cost
                except (ValueError, TypeError):
                    continue
        
        return [{"channel": k, "spend": v} for k, v in channel_spend.items()]
    
    def process_roi_data(self, csv_data):
        """Process CSV data for ROI chart"""
        roi_data = []
        for row in csv_data:
            if isinstance(row, dict) and 'Cost' in row and 'Revenue' in row:
                try:
                    cost = float(row['Cost']) if row['Cost'] != '-' else 0
                    revenue = float(row['Revenue']) if row['Revenue'] != '-' else 0
                    if cost > 0:
                        roi = (revenue - cost) / cost * 100
                        roi_data.append({
                            "spend": cost,
                            "roi": roi,
                            "campaign": row['Name'][:30] if 'Name' in row else 'Unknown'  # Truncate long names
                        })
                except (ValueError, TypeError):
                    continue
        
        return roi_data
    
    def submit_report(self):
        """Submit report for review"""
        response = self.session.post(f"{BASE_URL}/api/reports/reports/{self.report_id}/submit/")
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
            f"{BASE_URL}/api/reports/reports/{self.report_id}/approve/",
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
            f"{BASE_URL}/api/reports/reports/{self.report_id}/export/",
            json=export_data
        )
        if response.status_code == 202:
            job_data = response.json()
            job_id = job_data["id"]
            print(f"✅ PDF export job started: {job_id}")
            
            # Wait for job completion
            return self.wait_for_job_completion(job_id)
        else:
            print(f"❌ PDF export failed: {response.status_code} - {response.text}")
            return False
    
    def export_html(self):
        """Export report to HTML"""
        export_data = {
            "format": "html",
            "theme": "light",
            "include_raw_csv": True
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/reports/reports/{self.report_id}/export/",
            json=export_data
        )
        if response.status_code == 202:
            job_data = response.json()
            job_id = job_data["id"]
            print(f"✅ HTML export job started: {job_id}")
            
            # Wait for job completion
            return self.wait_for_job_completion(job_id)
        else:
            print(f"❌ HTML export failed: {response.status_code} - {response.text}")
            return False
    
    def wait_for_job_completion(self, job_id, max_wait=60):
        """Wait for job to complete"""
        start_time = time.time()
        while time.time() - start_time < max_wait:
            response = self.session.get(f"{BASE_URL}/api/reports/jobs/{job_id}/")
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
        import csv
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            csv_data = list(reader)
        print(f"✅ CSV data loaded: {len(csv_data)} rows")
    except Exception as e:
        print(f"❌ Failed to read CSV: {e}")
        return
    
    # Initialize generator with CSV data
    generator = ReportGenerator(csv_data)
    
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
    
    # Export to HTML first
    if generator.export_html():
        print("✅ HTML export completed")
    else:
        print("❌ HTML export failed")
    
    # Export to PDF
    if generator.export_pdf():
        print("🎉 Report generation completed successfully!")
        print(f"Report ID: {generator.report_id}")
        print(f"Template ID: {generator.template_id}")
    else:
        print("❌ PDF export failed")

if __name__ == "__main__":
    main()
