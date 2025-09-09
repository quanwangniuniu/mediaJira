#!/usr/bin/env python3
"""
Report generation using real CSV data converted to JSON
"""

import requests
import json
import time
import random
import string
import subprocess

BASE_URL = "http://nginx"

class RealDataReportGenerator:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.template_id = None
        self.report_id = None
        
    def generate_random_id(self):
        """Generate random ID for resources"""
        return ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    
    def get_jwt_token(self):
        """Get JWT token for authentication"""
        try:
            cmd = [
                "python", "manage.py", "shell", "-c",
                """
from core.models import CustomUser
from rest_framework_simplejwt.tokens import RefreshToken

user = CustomUser.objects.get(email='zhangkahuang8@gmail.com')
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
        
        # Test authentication
        response = self.session.get(f"{BASE_URL}/api/reports/reports/")
        if response.status_code == 200:
            print("✅ Authentication successful")
            return True
        else:
            print(f"❌ Authentication failed: {response.status_code}")
            return False
    
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
                    "default": "## Data Analysis"
                }
            ],
            "variables": {
                "report_title": "Marketing Performance Report",
                "date_range": "2025-09-09",
                "total_campaigns": 58
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/reports/report-templates/", json=template_data)
        if response.status_code == 201:
            print(f"✅ Template created: {self.template_id}")
            return True
        else:
            print(f"❌ Template creation failed: {response.status_code} - {response.text}")
            return False
  

    def convert_csv_data_to_json(self):
        """Convert the real CSV data to JSON format"""
    # Real data from user - ALL 58 ROWS
        csv_data = {
            "columns": ["Name", "Clicks", "Cost", "Hard Costs", "Total Revenue", "Revenue", "Recurring Revenue", "Profit", "Net Profit", "ROI", "ROAS", "Sales", "Calls", "Refund", "Refund Count", "Status", "Budget", "Reported", "Reported VS Revenue", "Cost per Sale", "Cost per Call", "Cost per Qualified Call", "Reported Result", "Info", "Ad Source ID", "Leads", "New Leads", "Cost per Lead", "Cost per New Lead", "Unique Sales", "Cost per Unique Sale", "Average Order Value", "Unique Customers Revenue", "Qualified Calls", "Unqualified Calls", "Unique Customers", "Cost per Unique Customer", "Refunded Sales Percentage", "Refunded Revenue Percentage", "Time of Sale Attribution", "Time of Call Attribution", "Carts", "ATC Events", "Purchased Carts", "Cart Conversion Rate", "Cost per ATC", "ATC %", "Cost to Acquire Customer", "CTR", "CVR", "New Visits", "Cost per New Visit", "New Customers Percentage", "Net Profit Percentage", "Customers", "Recurring Customers", "Total Customers", "Hard Costs Percentage"],
            "rows": [
                ["META | FES | ABO | ADV+ | Soul Sucking", "0", "274.88", "0", "117.40", "117.40", "0", "-157.48", "117.40", "-57.29", "0.43", "1", "0", "0", "0", "ACTIVE", "-", "0", "117.40", "274.88", "0", "0", "7", "-", "120216401607200596", "17", "11", "16.17", "24.99", "1", "274.88", "117.40", "117.40", "0", "0", "1", "274.88", "0", "0", "29m", "-", "0", "0", "0", "0", "0", "0", "274.88", "0", "0", "0", "0", "100", "100", "1", "0", "1", "0"],
                ["META | FES | ABO - Scale | LAL 1% | Soul Sucking", "0", "134.95", "0", "42.84", "42.84", "0", "-92.11", "42.84", "-68.25", "0.32", "1", "0", "0", "0", "ACTIVE", "-", "0", "42.84", "134.95", "0", "0", "3", "-", "120217113077040596", "6", "6", "22.49", "22.49", "1", "134.95", "42.84", "42.84", "0", "0", "1", "134.95", "0", "0", "46m", "-", "0", "0", "0", "0", "0", "0", "134.95", "0", "0", "0", "0", "100", "100", "1", "0", "1", "0"],
                ["Organic Source", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "OTHER", "-", "0", "0", "0", "0", "0", "0", "-", "-", "22", "4", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | ADV | Soul Sucking", "0", "261.55", "0", "0", "0", "0", "-261.55", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120215632377300123", "5", "4", "52.31", "65.39", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL 1% | NORM-JOB", "0", "148.26", "0", "0", "0", "0", "-148.26", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120215844156040596", "5", "2", "29.65", "74.13", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | ADV | Norm Job", "0", "173.26", "0", "0", "0", "0", "-173.26", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "173.26", "173.26", "1", "-", "120216085963910123", "8", "6", "21.66", "28.88", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "45m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO - Scale | ADV+ | NORM-JOB", "0", "119.27", "0", "0", "0", "0", "-119.27", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "4", "-", "120216979968340596", "7", "5", "17.04", "23.85", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV+ | RegCon", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "1", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "120216761661070596", "0", "0", "0", "0", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "7d 6h", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL 1% | Soul Sucking", "0", "171.23", "0", "0", "0", "0", "-171.23", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120216401889640596", "6", "5", "28.54", "34.25", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["FES | META | ABO | ADV+ | PERF | Indirect | POVIntrovert", "0", "166.31", "0", "0", "0", "0", "-166.31", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120220924994840596", "6", "4", "27.72", "41.58", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | ADV | Introverts", "0", "219.60", "0", "0", "0", "0", "-219.60", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "219.60", "219.60", "1", "-", "120216191622580123", "16", "11", "13.73", "19.96", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "34m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL 2%PURCHASE | Wish I Knew", "0", "61.93", "0", "0", "0", "0", "-61.93", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "2", "-", "120217960119680596", "5", "2", "12.39", "30.97", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL 1% | Jade LF Norm Job | Var 1", "0", "76.75", "0", "0", "0", "0", "-76.75", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120221098138010596", "5", "3", "15.35", "25.58", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | LAL1% | Jade | LF Norm Job – VAR2", "0", "221.32", "0", "0", "0", "0", "-221.32", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "221.32", "221.32", "2", "-", "120218733374900123", "10", "6", "22.13", "36.89", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "31m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["FES | META | ABO | LAL1% | Indirect | POVWFH", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "120219194017120596", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO - Scale | ADV | Introverts", "0", "42.41", "0", "0", "0", "0", "-42.41", "0", "-100", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "2", "-", "120218339593620123", "1", "0", "42.41", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["LAA 1% US Big List - Change j copy", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "1", "0", "0", "OTHER", "-", "0", "0", "0", "0", "0", "0", "-", "23856727604610108", "0", "0", "0", "0", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "603d 2h", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["GG | FES | US | Generic | Tech Jobs", "0", "23.73", "0", "0", "0", "0", "-23.73", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "8", "-", "21796607424", "3", "3", "7.91", "7.91", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["FES | YT | COLD |  CI | GIT | SHORTS | 17/02", "0", "383.11", "0", "0", "0", "0", "-383.11", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "383.11", "383.11", "36.00", "-", "22263539036", "77", "68", "4.98", "5.63", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "25m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES |ABO | ADV+ | NORM-JOB", "0", "141.77", "0", "0", "0", "0", "-141.77", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "3", "-", "120215844156050596", "10", "7", "14.18", "20.25", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV+ | Jade | NormJob", "0", "66.85", "0", "0", "0", "0", "-66.85", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "3", "-", "120218261334460596", "8", "6", "8.36", "11.14", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV | Jade | Soul Sucking", "0", "122.66", "0", "0", "0", "0", "-122.66", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "4", "-", "120217648387980596", "8", "7", "15.33", "17.52", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["Adspend.com | COLD | CI | Front End Developer | US | 06/09 | Scale", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "REMOVED", "-", "0", "0", "0", "0", "0", "0", "-", "21668614953", "3", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["YT | AI | COLD | CI | AI Developer | US | 21/10", "0", "22.99", "0", "0", "0", "0", "-22.99", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "0", "-", "21831473009", "1", "1", "22.99", "22.99", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL 1% | RuinedMyLife", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "120217069591420596", "2", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["YT | FE | COLD | EMPLOYED | TOP 50%", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "21904481189", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["FES | META | ABO | LAL1% | Indirect | POVIntrovert", "0", "67.85", "0", "0", "0", "0", "-67.85", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "3", "-", "120220498672330596", "4", "4", "16.96", "16.96", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV+ | Soul Sucking | Remote AI Developer", "0", "38.72", "0", "0", "0", "0", "-38.72", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "0", "-", "120220001414280596", "2", "2", "19.36", "19.36", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL1% - Scale | Used to think", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "120218492949090596", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | LAL1% | Jade | LF Norm Job", "0", "606.83", "0", "0", "0", "0", "-606.83", "0", "-100", "0", "0", "4", "0", "0", "ACTIVE", "-", "0", "0", "0", "151.71", "151.71", "4", "-", "120218339554940123", "31", "24", "19.58", "25.28", "0", "0", "0", "0", "4", "0", "0", "0", "0", "0", "-", "41m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["FES - B | META | ABO | ADV+ | Direct - Image | Jack Study4Months", "0", "6.14", "0", "0", "0", "0", "-6.14", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "0", "-", "120218341509690123", "1", "0", "6.14", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV+ | Jade | Honestly", "0", "321.85", "0", "0", "0", "0", "-321.85", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "8", "-", "120217646570820596", "23", "21", "13.99", "15.33", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL1% | Jade | Soul Sucking", "0", "372.35", "0", "0", "0", "0", "-372.35", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "372.35", "372.35", "1", "-", "120217648602110596", "18", "16", "20.69", "23.27", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "46m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | ADV | Soul Sucking Variations", "0", "44.47", "0", "0", "0", "0", "-44.47", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120216085751410123", "1", "1", "44.47", "44.47", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | ADV | Jade Norm Job", "0", "143.29", "0", "0", "0", "0", "-143.29", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120217691278030123", "7", "6", "20.47", "23.88", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | LAL1% | Introverts", "0", "310.83", "0", "0", "0", "0", "-310.83", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "12515.09", "-12515.09", "0", "0", "0", "1", "-", "120216191853860123", "16", "11", "19.43", "28.26", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["YT | COLD | CI | Beginner Coding | US | 09/10", "0", "199.76", "0", "0", "0", "0", "-199.76", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "199.76", "199.76", "6.00", "-", "21795169658", "10", "7", "19.98", "28.54", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "31m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["YT | AI | COLD | CI | Front End Developer | US | 21/10", "0", "49.79", "0", "0", "0", "0", "-49.79", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "49.79", "49.79", "5.00", "-", "21824980491", "7", "6", "7.11", "8.30", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "28m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL 1% | Wish I Knew", "0", "257.71", "0", "0", "0", "0", "-257.71", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "2", "-", "120217237820100596", "5", "4", "51.54", "64.43", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES |ABO | ADV+ | House Prices", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "120219945574330596", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["Men commuters 25 - 40  – Reels only", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "OTHER", "-", "0", "0", "0", "0", "0", "0", "-", "120207061942290045", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO - Scale | ADV+ | Soul Sucking", "0", "240.32", "0", "0", "0", "0", "-240.32", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "240.32", "240.32", "1", "-", "120217023511860596", "14", "10", "17.17", "24.03", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "47m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV+ | Jade LF Norm Job | Var 1", "0", "79.15", "0", "0", "0", "0", "-79.15", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "0", "-", "120221098137970596", "3", "2", "26.38", "39.58", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL1% | Jade | Honestly", "0", "212.78", "0", "0", "0", "0", "-212.78", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "3", "-", "120217647387440596", "8", "7", "26.60", "30.40", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["FES | META | ABO | ADV+ | Indirect | POVIntrovert", "0", "398.28", "0", "0", "0", "0", "-398.28", "0", "-100", "0", "0", "3", "0", "0", "ACTIVE", "-", "0", "0", "0", "132.76", "132.76", "2", "-", "120219194415320596", "27", "16", "14.75", "24.89", "0", "0", "0", "0", "3", "0", "0", "0", "0", "0", "-", "35m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV+ | Jade | Honestly Camera Turn", "0", "172.68", "0", "0", "0", "0", "-172.68", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "172.68", "172.68", "1", "-", "120220288294580596", "6", "6", "28.78", "28.78", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "1d", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | ADV | Jade | LF Norm Job", "0", "209.95", "0", "0", "0", "0", "-209.95", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "9", "-", "120218339450710123", "11", "9", "19.09", "23.33", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | ADV | Jade | LF Norm Job – VAR1", "0", "331.79", "0", "0", "0", "0", "-331.79", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "8134.81", "-8134.81", "0", "331.79", "331.79", "2", "-", "120218584418510123", "13", "10", "25.52", "33.18", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "29m"],
                ["META | FES-B | ABO | LAL1% | Jade | LF Norm Job – VAR1", "0", "426.32", "0", "0", "0", "0", "-426.32", "0", "-100", "0", "0", "2", "0", "0", "ACTIVE", "-", "0", "0", "0", "213.16", "213.16", "10", "-", "120218584418500123", "28", "19", "15.23", "22.44", "0", "0", "0", "0", "2", "0", "0", "0", "0", "0", "-", "29m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["FES - B | META | ABO | ADV+ | Direct - Image | Fastest Way", "0", "6.59", "0", "0", "0", "0", "-6.59", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "0", "-", "120218036679680123", "1", "0", "6.59", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES-B | ABO | LAL1% | Soul Sucking Variations", "0", "34.65", "0", "0", "0", "0", "-34.65", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "0", "-", "120216264382920123", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO - Scale | ADV+ | Soul Sucking | Variations", "0", "269.25", "0", "0", "0", "0", "-269.25", "0", "-100", "0", "0", "2", "0", "0", "ACTIVE", "-", "0", "0", "0", "134.63", "134.63", "2", "-", "120217646060520596", "11", "10", "24.48", "26.93", "0", "0", "0", "0", "2", "0", "0", "0", "0", "0", "-", "22m", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["FES | YT | COLD | JC | SHORTS | 17/02", "0", "170.58", "0", "0", "0", "0", "-170.58", "0", "-100", "0", "0", "1", "0", "0", "ACTIVE", "-", "0", "0", "0", "170.58", "170.58", "18.00", "-", "22252209321", "30", "20", "5.69", "8.53", "0", "0", "0", "0", "1", "0", "0", "0", "0", "0", "-", "37d 6h", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | ADV+ | Soul Sucking | Variations", "0", "138.16", "0", "0", "0", "0", "-138.16", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "3", "-", "120217355060740596", "7", "5", "19.74", "27.63", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL 1% | POV$3k", "0", "231.65", "0", "0", "0", "0", "-231.65", "0", "-100", "0", "0", "0", "0", "0", "ACTIVE", "-", "0", "0", "0", "0", "0", "1", "-", "120216527976420596", "6", "5", "38.61", "46.33", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["META | FES | ABO | LAL1% | Jade | Being a nerd Comfy", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "120219945671240596", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["GG | FES | US | Generic | Jobs | Remote", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "PAUSED", "-", "0", "0", "0", "0", "0", "0", "-", "20858030140", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "-", "0", "0", "0", "0", "0", "0", "0", "0", "0", "-", "0", "0", "0", "0", "0", "0", "0"],
                ["Total", "0", "-", "0", "160.24", "160.24", "0", "-8014.33", "160.24", "-98.04", "0.02", "2", "24", "0", "0", "OTHER", "-", "20649.90", "-20489.66", "4087.29", "340.61", "340.61", "165.00", "-", "-", "528", "383", "15.48", "21.34", "2", "4087.29", "80.12", "160.24", "24", "0", "2", "4087.29", "0", "0", "38m", "27d 1h", "0", "0", "0", "0", "0", "0", "4087.29", "0", "0", "0", "0", "100", "100", "2", "0", "2", "0"]
            ]
        }
        # Convert to JSON format
        columns = csv_data["columns"]
        json_data = []
        
        for row in csv_data["rows"]:
            row_dict = {}
            for i, value in enumerate(row):
                if i < len(columns):
                    # Convert numeric values
                    if value and value != "-" and value.replace('.', '').replace('-', '').isdigit():
                        try:
                            if '.' in value:
                                row_dict[columns[i]] = float(value)
                            else:
                                row_dict[columns[i]] = int(value)
                        except ValueError:
                            row_dict[columns[i]] = value
                    else:
                        row_dict[columns[i]] = value
            json_data.append(row_dict)
        
        return json_data
    
    def create_report(self):
        """Create report with real JSON data"""
        self.refresh_token()
        self.session.headers.update({
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        })
        
        self.report_id = self.generate_random_id()
        
        # Get real JSON data
        json_data = self.convert_csv_data_to_json()
        
        report_data = {
            "id": self.report_id,
            "title": f"Marketing Performance Report - {time.strftime('%Y-%m-%d')}",
            "owner_id": "zhangkahuang8@gmail.com",
            "status": "draft",
            "report_template_id": self.template_id,
            "slice_config": {
                "dataset": "marketing_attribution_v2",
                "dimensions": ["channel", "campaign"],
                "metrics": ["roi", "spend", "ctr", "cvr"],
                "tables": {
                    "marketing_data": {
                        "columns": ["Name", "Clicks", "Cost", "Hard Costs", "Total Revenue", "Revenue", "Recurring Revenue", "Profit", "Net Profit", "ROI", "ROAS", "Sales", "Calls", "Refund", "Refund Count", "Status", "Budget", "Reported", "Reported VS Revenue", "Cost per Sale", "Cost per Call", "Cost per Qualified Call", "Reported Result", "Info", "Ad Source ID", "Leads", "New Leads", "Cost per Lead", "Cost per New Lead", "Unique Sales", "Cost per Unique Sale", "Average Order Value", "Unique Customers Revenue", "Qualified Calls", "Unqualified Calls", "Unique Customers", "Cost per Unique Customer", "Refunded Sales Percentage", "Refunded Revenue Percentage", "Time of Sale Attribution", "Time of Call Attribution", "Carts", "ATC Events", "Purchased Carts", "Cart Conversion Rate", "Cost per ATC", "ATC %", "Cost to Acquire Customer", "CTR", "CVR", "New Visits", "Cost per New Visit", "New Customers Percentage", "Net Profit Percentage", "Customers", "Recurring Customers", "Total Customers", "Hard Costs Percentage"],
                        "rows": json_data
                    }
                }
                # "inline_data": json_data  # Commented out to test only tables structure
            }
        }
        
        print(f"🔍 Request data size: {len(json.dumps(report_data))}")
        print(f"🔍 Inline data count: {len(json_data)}")
        
        response = self.session.post(f"{BASE_URL}/api/reports/reports/", json=report_data)
        if response.status_code == 201:
            print(f"✅ Report created: {self.report_id}")
            response_data = response.json()
            print(f"🔍 Response inline_data count: {len(response_data.get('slice_config', {}).get('inline_data', []))}")
            return True
        else:
            print(f"❌ Report creation failed: {response.status_code} - {response.text}")
            return False
    
    def create_sections(self):
        """Create report sections with charts using real data"""
        # Process real data for charts
        json_data = self.convert_csv_data_to_json()
        
        # Create spend by channel data
        channel_spend = {}
        for row in json_data:
            if 'Cost' in row and 'Name' in row:
                try:
                    cost = float(row['Cost']) if row['Cost'] != '-' else 0
                    channel = row['Name'].split('|')[0].strip() if '|' in row['Name'] else row['Name']
                    if channel not in channel_spend:
                        channel_spend[channel] = 0
                    channel_spend[channel] += cost
                except (ValueError, TypeError):
                    continue
        
        spend_data = [{"channel": k, "spend": v} for k, v in channel_spend.items()]
        
        # Create ROI data
        roi_data = []
        for row in json_data:
            if 'Cost' in row and 'Revenue' in row:
                try:
                    cost = float(row['Cost']) if row['Cost'] != '-' else 0
                    revenue = float(row['Revenue']) if row['Revenue'] != '-' else 0
                    if cost > 0:
                        roi = (revenue - cost) / cost * 100
                        roi_data.append({
                            "spend": cost,
                            "roi": roi,
                            "campaign": row['Name'][:30] if 'Name' in row else 'Unknown'
                        })
                except (ValueError, TypeError):
                    continue
        
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
                "charts": [{
                    "id": self.generate_random_id(),
                    "type": "bar",
                    "title": "Spend by Channel",
                    "data": spend_data,
                    "config": {
                        "x_axis": "channel",
                        "y_axis": "spend",
                        "color": "#3498db"
                    }
                }]
            },
            {
                "id": self.generate_random_id(),
                "title": "ROI Analysis",
                "order_index": 3,
                "content_md": "## ROI Analysis\n\nReturn on investment analysis across different campaigns and channels.",
                "charts": [{
                    "id": self.generate_random_id(),
                    "type": "scatter",
                    "title": "ROI vs Spend Analysis",
                    "data": roi_data,
                    "config": {
                        "x_axis": "spend",
                        "y_axis": "roi",
                        "color": "#e74c3c"
                    }
                }]
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
        response = self.session.post(f"{BASE_URL}/api/reports/reports/{self.report_id}/approve/", json={"action": "approve"})
        if response.status_code == 200:
            print("✅ Report approved")
            return True
        else:
            print(f"❌ Report approval failed: {response.status_code} - {response.text}")
            return False
    
    def export_html(self):
        """Export report to HTML"""
        response = self.session.post(
            f"{BASE_URL}/api/reports/reports/{self.report_id}/export/",
            json={"format": "html"}
        )
        if response.status_code == 202:
            print("✅ HTML export job started")
            job_data = response.json()
            job_id = job_data["id"]
            
            # Wait for job completion
            max_attempts = 30
            for attempt in range(max_attempts):
                time.sleep(2)
                job_response = self.session.get(f"{BASE_URL}/api/reports/jobs/{job_id}/")
                if job_response.status_code == 200:
                    job_status = job_response.json()
                    print(f"Job status: {job_status['status']}")
                    if job_status["status"] == "succeeded":
                        print("✅ HTML export job completed successfully")
                        return True
                    elif job_status["status"] == "failed":
                        print(f"❌ HTML export job failed: {job_status.get('message', 'Unknown error')}")
                        return False
                else:
                    print(f"❌ Failed to check job status: {job_response.status_code}")
                    return False
            
            print("❌ HTML export job timed out")
            return False
        else:
            print(f"❌ HTML export failed: {response.status_code} - {response.text}")
            return False

    def check_report_assets(self):
        """Check report assets after export"""
        try:
            # 直接使用Django ORM查询数据库中的ReportAsset
            import os
            import sys
            sys.path.append('/app')
            os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
            import django
            django.setup()
            
            from reports.models import Report, ReportAsset
            
            report = Report.objects.get(id=self.report_id)
            assets = ReportAsset.objects.filter(report=report)
            print(f"📊 Report assets found: {assets.count()}")
            
            for asset in assets:
                print(f"  - {asset.file_type}: {asset.id}")
                if asset.file_type == "pdf":
                    print("📄 PDF asset found!")
                    # 解码file_url并保存PDF内容到文件
                    try:
                        # file_url是二进制数据的字符串表示，需要用eval解码
                        pdf_data = eval(asset.file_url)
                        with open("/app/exported_report.pdf", "wb") as f:
                            f.write(pdf_data)
                        print("✅ PDF saved to /app/exported_report.pdf")
                        return "exported_report.pdf"
                    except Exception as e:
                        print(f"❌ Error saving PDF: {e}")
                        return None
            
            print("❌ No PDF asset found")
            return None
        except Exception as e:
            print(f"❌ Error checking report assets: {e}")
            return None

    def export_pdf(self):
        """Export report to PDF"""
        response = self.session.post(
            f"{BASE_URL}/api/reports/reports/{self.report_id}/export/",
            json={"format": "pdf"}
        )
        if response.status_code == 202:
            print("✅ PDF export job started")
            job_data = response.json()
            job_id = job_data["id"]
            
            # Wait for job completion
            max_attempts = 30
            for attempt in range(max_attempts):
                time.sleep(2)
                job_response = self.session.get(f"{BASE_URL}/api/reports/jobs/{job_id}/")
                if job_response.status_code == 200:
                    job_status = job_response.json()
                    print(f"Job status: {job_status['status']}")
                    if job_status["status"] == "succeeded":
                        print("✅ Export job completed successfully")
                        
                        # Check report assets after successful export
                        print("🔍 Checking report assets...")
                        pdf_file = self.check_report_assets()
                        
                        if pdf_file:
                            print(f"📄 PDF asset found and saved: {pdf_file}")
                            return True
                        else:
                            print("❌ No PDF asset found after successful export")
                            return False
                            
                    elif job_status["status"] == "failed":
                        print(f"❌ Export job failed: {job_status.get('message', 'Unknown error')}")
                        return False
                else:
                    print(f"❌ Failed to check job status: {job_response.status_code}")
                    return False
            
            print("❌ Export job timed out")
            return False
        else:
            print(f"❌ PDF export failed: {response.status_code} - {response.text}")
            return False

def main():
    """Main function to generate report with real data"""
    # Initialize generator
    generator = RealDataReportGenerator()
    
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
    generator.create_sections()
    
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
