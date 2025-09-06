#!/usr/bin/env python3
"""
MediaJira Reports - Demo数据种子脚本
Purpose: 创建模板、报告和示例数据，使用真实的inline_result.json数据
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Django setup
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from reports.models import ReportTemplate, Report, ReportSection, Job
from django.utils import timezone

User = get_user_model()

def load_inline_data():
    """加载inline_result.json数据"""
    inline_path = Path('/app/inline_result.json')
    if not inline_path.exists():
        print(f"❌ 数据文件不存在: {inline_path}")
        return None
    
    with open(inline_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"✅ 加载数据: {len(data['rows'])}行, {len(data['columns'])}列")
    return data

def create_marketing_template():
    """创建营销报告模板"""
    template_blocks = [
        {
            'type': 'text',
            'id': 'sec-executive-summary',
            'title': '执行摘要',
            'content': '''# 营销活动效果报告

## 报告概览
时间周期: {{ date_range }}
数据源: 真实广告投放数据

## 核心指标
- **总投放成本**: ${{ total_cost | round(2) }}
- **总收入**: ${{ total_revenue | round(2) }}
- **净利润**: ${{ net_profit | round(2) }}
- **整体ROI**: {{ roi_percentage }}%
- **活跃广告组**: {{ active_campaigns }}个

{{ charts.overview_metrics }}

## 关键洞察
1. **投放效率**: 当前整体ROI为{{ roi_percentage }}%，需要优化成本控制
2. **渠道表现**: META平台占主导地位，YouTube和Google表现稳定
3. **转化质量**: 平均每次点击成本${{ avg_cpc | round(2) }}，单客户获取成本${{ avg_cac | round(2) }}

## 数据明细
{{ html_tables.summary_stats }}
''',
            'order': 1
        },
        {
            'type': 'text',
            'id': 'sec-campaign-performance',
            'title': '广告组表现分析',
            'content': '''# 广告组表现分析

## 完整数据表格
以下是所有广告组的详细表现数据：

{{ html_tables.full_campaign_data }}

## 表现分布图表
{{ charts.performance_distribution }}

## ROI分析
{{ charts.roi_analysis }}

### 高表现广告组
{{ html_tables.top_performers }}

### 待优化广告组  
{{ html_tables.underperformers }}

## 成本效率分析
- **平均CPC**: ${{ avg_cpc | round(2) }}
- **最佳CPC**: ${{ best_cpc | round(2) }}
- **最差CPC**: ${{ worst_cpc | round(2) }}

{{ charts.cost_efficiency }}
''',
            'order': 2
        },
        {
            'type': 'table',
            'id': 'sec-data-table',
            'title': '完整数据表格',
            'content': '''# 完整营销数据表格

{{ html_tables.raw_data }}

这个表格展示了所有{{ active_campaigns }}个广告组的完整数据，包含所有58个数据字段。
''',
            'order': 3
        }
    ]
    
    template_variables = {
        'date_range': '2024年1月1日 - 1月31日',
        'total_cost': 9477.39,
        'total_revenue': 245.92,
        'net_profit': -9231.47,
        'roi_percentage': -97.47,
        'active_campaigns': 145,
        'avg_cpc': 2.90,
        'avg_cac': 2430.83
    }
    
    template, created = ReportTemplate.objects.update_or_create(
        id='marketing-performance-template',
        defaults={
            'name': '营销活动效果分析模板',
            'version': 1,
            'is_default': True,
            'blocks': template_blocks,
            'variables': template_variables
        }
    )
    
    action = "创建" if created else "更新"
    print(f"✅ {action}模板: {template.name} v{template.version} (ID: {template.id})")
    return template

def create_demo_report(template, inline_data, user):
    """创建演示报告"""
    
    # 从数据中计算统计值
    rows = inline_data['rows']
    columns = inline_data['columns']
    
    # 将inline_data存储到report的slice_config中，供assembler使用
    # 按照slices.py期望的格式存储数据
    slice_config_with_data = {
        'dataset': 'marketing_campaigns',
        'data_source': 'inline_result.json',
        'rows_count': len(rows)-1,
        'slices': {
            'default': {
                'data_root': inline_data,  # 使用正确的data_root格式
                'dimensions': ['Name', 'Status'],  # 示例维度
                'metrics': ['Clicks', 'Cost', 'Revenue', 'ROI']  # 示例指标
            }
        }
    }
    
    # 找到列索引
    col_indices = {col: idx for idx, col in enumerate(columns)}
    
    def safe_float(value, default=0.0):
        try:
            return float(str(value).replace(',', '')) if value and str(value) != '-' else default
        except:
            return default
    
    def safe_int(value, default=0):
        try:
            return int(str(value).replace(',', '')) if value and str(value) != '-' else default
        except:
            return default
    
    # 计算统计数据
    total_clicks = 0
    total_cost = 0.0
    total_revenue = 0.0
    total_profit = 0.0
    active_campaigns = 0
    
    for row in rows[:-1]:  # 最后一行是汇总，排除
        if len(row) > max(col_indices.values()):
            clicks = safe_int(row[col_indices.get('Clicks', 1)])
            cost = safe_float(row[col_indices.get('Cost', 2)])
            revenue = safe_float(row[col_indices.get('Revenue', 5)])
            profit = safe_float(row[col_indices.get('Net Profit', 8)])
            status = str(row[col_indices.get('Status', 15)]).upper()
            
            total_clicks += clicks
            total_cost += cost
            total_revenue += revenue
            total_profit += profit
            
            if status in ['ACTIVE', 'PAUSED']:
                active_campaigns += 1
    
    roi_percentage = ((total_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0
    avg_cpc = total_cost / total_clicks if total_clicks > 0 else 0
    avg_cac = total_cost / 4 if total_cost > 0 else 0  # 假设4个转化
    
    report_data = {
        'id': f'demo-marketing-report-{int(timezone.now().timestamp())}',
        'title': '营销活动效果报告 - 真实数据分析',
        'owner_id': str(user.id),
        'status': 'draft',
        'report_template': template,
        'slice_config': slice_config_with_data,
        'export_config_id': 'demo_full_export'
    }
    
    report = Report.objects.create(**report_data)
    print(f"✅ 创建报告: {report.title} (ID: {report.id})")
    
    # 创建报告sections，基于模板blocks
    sections_created = 0
    for i, block in enumerate(template.blocks):
        section_content = block.get('content', '')
        
        # 为table类型的block，添加特殊内容
        if block.get('type') == 'table':
            section_content = f"""# {block.get('title', '数据表格')}

以下是包含所有{len(rows)-1}个广告组和{len(columns)}个数据字段的完整表格：

数据要点:
- 总投放成本: ${total_cost:,.2f}
- 总收入: ${total_revenue:,.2f}
- 整体ROI: {roi_percentage:.2f}%
- 数据行数: {len(rows)-1}

{{{{ html_tables.raw_data }}}}

## 数据字段说明
- **Name**: 广告组名称
- **Clicks**: 点击次数
- **Cost**: 投放成本
- **Revenue**: 收入
- **ROI**: 投资回报率
- **Status**: 广告组状态 (ACTIVE/PAUSED/REMOVED)
"""
        
        # 为不同的section配置不同的图表，支持中文title匹配
        section_charts = []
        title = block.get('title', '').lower()
        
        if '执行摘要' in title or 'executive' in title or 'summary' in title:
            # 执行摘要section - 概览图表
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
        elif '表现分析' in title or '广告组' in title or 'performance' in title or 'analysis' in title:
            # 表现分析section - 详细图表
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
        elif '数据表格' in title or '完整数据' in title or 'data' in title or 'table' in title:
            # 数据表格section - 一个简单的概览图表
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
            charts=section_charts,  # 添加图表配置
            source_slice_ids=['default']  # 引用default slice
        )
        sections_created += 1
    
    print(f"✅ 创建了{sections_created}个报告sections，包含完整数据")
    return report

def create_user_if_needed():
    """创建或获取admin用户"""
    try:
        user = User.objects.get(username='admin')
        print(f"✅ 用户已存在: {user.username}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='Admin123test'
        )
        print(f"✅ 创建用户: {user.username}")
    
    return user

def main():
    parser = argparse.ArgumentParser(description='创建MediaJira Reports演示数据')
    parser.add_argument('--clean', action='store_true', help='清理现有数据')
    parser.add_argument('--template-only', action='store_true', help='只创建模板')
    parser.add_argument('--report-only', action='store_true', help='只创建报告')
    
    args = parser.parse_args()
    
    print("🌱 MediaJira Reports - Demo数据种子脚本")
    print("=" * 50)
    
    # 清理数据
    if args.clean:
        print("🧹 清理现有数据...")
        Report.objects.filter(id__startswith='demo-marketing-report-').delete()
        ReportTemplate.objects.filter(id='marketing-performance-template').delete()
        print("✅ 清理完成")
    
    # 加载数据
    inline_data = load_inline_data()
    if not inline_data:
        return 1
    
    # 创建用户
    user = create_user_if_needed()
    
    # 创建模板
    if not args.report_only:
        template = create_marketing_template()
    else:
        try:
            template = ReportTemplate.objects.get(id='marketing-performance-template')
        except ReportTemplate.DoesNotExist:
            print("❌ 模板不存在，请先创建模板")
            return 1
    
    # 创建报告
    if not args.template_only:
        report = create_demo_report(template, inline_data, user)
        
        print("\n📊 演示数据创建完成!")
        print(f"📋 模板ID: {template.id}")
        print(f"📄 报告ID: {report.id}")
        print(f"👤 用户: {user.username}")
        print(f"📈 数据行数: {len(inline_data['rows'])-1}")  # 减去汇总行
        
        print("\n🚀 接下来你可以:")
        print(f"1. 查看报告: curl -u admin:Admin123test http://localhost:8000/api/reports/{report.id}/")
        print(f"2. 提交审批: curl -u admin:Admin123test -X POST http://localhost:8000/api/reports/{report.id}/submit/")
        print(f"3. 运行完整演示: ./scripts/demo_api_celery.sh")
    
    return 0

if __name__ == '__main__':
    exit(main())
