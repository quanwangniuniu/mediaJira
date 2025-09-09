#!/usr/bin/env python
"""
示例：如何切换报告的数据源
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
sys.path.append('/app')
django.setup()

from reports.models import Report

def switch_to_database_source():
    """切换到数据库数据源"""
    report = Report.objects.get(id='test_report_001')
    
    # 新的数据库查询配置
    new_slice_config = {
        "dataset": "marketing_campaigns",
        "dimensions": ["campaign_name", "platform", "status"],
        "metrics": ["impressions", "clicks", "cost", "revenue", "roi"],
        "filters": {
            "date_range": "last_30_days",
            "status": "ACTIVE"
        },
        "time_range": {
            "start": "2024-01-01",
            "end": "2024-01-31"
        }
    }
    
    report.slice_config = new_slice_config
    report.save()
    print(f"✅ 报告 {report.id} 已切换到数据库数据源")

def switch_to_api_source():
    """切换到API数据源"""
    report = Report.objects.get(id='test_report_001')
    
    # 新的API数据源配置
    new_slice_config = {
        "api_endpoint": "/api/campaigns/performance",
        "method": "GET",
        "params": {
            "period": "monthly",
            "format": "json",
            "include_metrics": ["impressions", "clicks", "cost", "revenue"]
        }
    }
    
    report.slice_config = new_slice_config
    report.save()
    print(f"✅ 报告 {report.id} 已切换到API数据源")

def switch_to_csv_source():
    """切换到CSV数据源"""
    report = Report.objects.get(id='test_report_001')
    
    # CSV数据源配置
    csv_data = """Campaign,Impressions,Clicks,Cost,Revenue,ROI
Meta Ads Q4,25000,1250,1500.00,3000.00,100%
Google Ads Q4,20000,1000,1200.00,2400.00,100%
TikTok Ads Q4,15000,750,800.00,1600.00,100%
LinkedIn Ads Q4,8000,400,600.00,1200.00,100%"""
    
    new_slice_config = {
        "inline_csv": csv_data
    }
    
    report.slice_config = new_slice_config
    report.save()
    print(f"✅ 报告 {report.id} 已切换到CSV数据源")

def switch_to_mixed_sources():
    """切换到混合数据源"""
    report = Report.objects.get(id='test_report_001')
    
    # 混合数据源配置
    new_slice_config = {
        "slices": {
            "campaigns": {
                "dataset": "marketing_campaigns",
                "dimensions": ["campaign_name", "platform"],
                "metrics": ["impressions", "clicks", "cost", "revenue"]
            },
            "summary": {
                "inline_data": {
                    "columns": ["Total_Campaigns", "Total_Budget", "Total_Revenue", "Overall_ROI"],
                    "rows": [["25", "8500.00", "15200.00", "79%"]]
                }
            },
            "trends": {
                "api_endpoint": "/api/campaigns/trends",
                "params": {
                    "period": "weekly",
                    "last_weeks": 12
                }
            }
        }
    }
    
    report.slice_config = new_slice_config
    report.save()
    print(f"✅ 报告 {report.id} 已切换到混合数据源")

if __name__ == '__main__':
    print("选择数据源切换方式:")
    print("1. 数据库查询")
    print("2. API数据源")
    print("3. CSV数据")
    print("4. 混合数据源")
    
    choice = input("请输入选择 (1-4): ")
    
    if choice == "1":
        switch_to_database_source()
    elif choice == "2":
        switch_to_api_source()
    elif choice == "3":
        switch_to_csv_source()
    elif choice == "4":
        switch_to_mixed_sources()
    else:
        print("无效选择")


