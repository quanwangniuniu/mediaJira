# 从Template到Report的完整数据流程

## 🎯 核心流程概览

```
Template创建 → Report创建 → Section创建 → 数据处理 → 组装导出
```

## 📋 步骤1: 创建ReportTemplate

### 1.1 定义模板结构
```http
POST /api/reports/report-templates/
{
  "id": "marketing_template_v1",
  "name": "营销报告标准模板", 
  "version": 1,
  "is_default": true,
  "blocks": [
    "executive_summary",    // 执行摘要块
    "data_analysis",       // 数据分析块  
    "recommendations",     // 建议块
    "appendix"            // 附录块
  ],
  "variables": {
    "company_name": "默认公司名称",
    "report_period": "Q1 2024",
    "currency": "CNY",
    "date_range": "2024-01-01 to 2024-03-31"
  }
}
```

### 1.2 Template数据结构
```python
# backend/reports/models.py - ReportTemplate
class ReportTemplate(Timestamped):
    id = models.CharField(primary_key=True, max_length=64)
    name = models.CharField(max_length=128)
    version = models.IntegerField() 
    blocks = models.JSONField(default=list)     # ["summary", "analysis", ...]
    variables = models.JSONField(default=dict)  # {"company": "...", "period": "..."}
```

## 📊 步骤2: 创建Report并配置数据源

### 2.1 基于Template创建Report
```http
POST /api/reports/reports/
{
  "id": "q1_marketing_report_2024",
  "title": "2024年Q1营销活动报告",
  "report_template_id": "marketing_template_v1",
  "owner_id": "user_123",
  "time_range_start": "2024-01-01T00:00:00Z",
  "time_range_end": "2024-03-31T23:59:59Z",
  
  // 关键部分：slice_config 数据配置
  "slice_config": {
    // 方式1: 直接内联数据 (最简单)
    "inline_data": {
      "columns": ["Campaign", "Cost", "Revenue", "ROI"],
      "rows": [
        ["Facebook Ads", 50000, 125000, "150%"],
        ["Google Ads", 40000, 100000, "150%"],
        ["TikTok Ads", 30000, 90000, "200%"]
      ]
    }
  }
}
```

### 2.2 slice_config的各种数据格式

#### 格式1: inline_data (直接表格)
```json
{
  "slice_config": {
    "inline_data": {
      "columns": ["Campaign", "Cost", "Revenue", "ROI"],
      "rows": [
        ["Facebook Ads", 50000, 125000, "150%"],
        ["Google Ads", 40000, 100000, "150%"]
      ]
    }
  }
}
```

#### 格式2: inline_result (API返回格式)
```json
{
  "slice_config": {
    "inline_result": {
      "default": {
        "columns": ["Campaign", "Cost", "Revenue"],
        "rows": [
          ["Facebook Ads", 50000, 125000],
          ["Google Ads", 40000, 100000]
        ]
      },
      "trend_data": {
        "columns": ["Date", "Clicks", "Conversions"],
        "rows": [
          ["2024-01-01", 1200, 45],
          ["2024-01-02", 1350, 52]
        ]
      }
    }
  }
}
```

#### 格式3: rows_long (长格式数据)
```json
{
  "slice_config": {
    "rows_long": [
      {"date": "2024-03-26", "campaign_id": 123, "channel": "facebook", "metric_type": "Clicks", "value": 73},
      {"date": "2024-03-26", "campaign_id": 123, "channel": "facebook", "metric_type": "Spend", "value": 234.89},
      {"date": "2024-03-26", "campaign_id": 456, "channel": "google", "metric_type": "Clicks", "value": 120}
    ],
    "dimensions": ["date", "campaign_id", "channel"],
    "metrics": ["Clicks", "Spend", "Revenue"]
  }
}
```

#### 格式4: 外部数据源配置
```json
{
  "slice_config": {
    "dataset": "marketing_campaigns",
    "dimensions": ["campaign_name", "channel"],
    "metrics": ["cost", "revenue", "conversions"],
    "filters": {
      "date_range": ["2024-01-01", "2024-03-31"],
      "campaign_status": "active"
    },
    "time_range": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-03-31T23:59:59Z"
    }
  }
}
```

### 2.3 Report数据结构
```python
# backend/reports/models.py - Report  
class Report(Timestamped):
    id = models.CharField(primary_key=True, max_length=64)
    title = models.CharField(max_length=200)
    report_template = models.ForeignKey(ReportTemplate, ...)
    slice_config = models.JSONField(default=dict)  # 数据配置！
    query_hash = models.CharField(max_length=64)   # 查询指纹
    time_range_start = models.DateTimeField()
    time_range_end = models.DateTimeField()
```

## 📄 步骤3: 创建ReportSection并引用数据

### 3.1 创建Section引用数据
```http
POST /api/reports/reports/q1_marketing_report_2024/sections/
{
  "id": "section_executive_summary",
  "title": "执行摘要",
  "order_index": 1,
  
  // Markdown内容，包含数据变量引用
  "content_md": "# 执行摘要\n\n本季度营销活动总投资 **{{total_cost}}** 元，实现收入 **{{total_revenue}}** 元，ROI达到 **{{roi_percentage}}%**。\n\n## 关键成果\n- Facebook广告表现优异，ROI达到150%\n- Google广告稳定增长，转化率提升\n\n## 数据概览\n{{ html_tables.default }}\n\n## 趋势分析\n{% if has_chart('roi_trend') %}\n{{ charts.roi_trend|safe }}\n{% endif %}",
  
  // 图表配置
  "charts": [
    {
      "title": "ROI趋势分析",
      "type": "line", 
      "data_source": "default",  // 引用哪个slice
      "x": "Campaign",
      "y": "ROI"
    },
    {
      "title": "成本收入对比",
      "type": "bar",
      "data_source": "default",
      "x": "Campaign", 
      "y": ["Cost", "Revenue"]
    }
  ],
  
  // 明确标记这个section使用哪些slice的数据
  "source_slice_ids": ["default"]
}
```

### 3.2 Section数据结构
```python
# backend/reports/models.py - ReportSection
class ReportSection(Timestamped):
    id = models.CharField(primary_key=True, max_length=64)
    report = models.ForeignKey(Report, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content_md = models.TextField()                    # Markdown内容
    charts = models.JSONField(default=list)            # 图表配置
    source_slice_ids = models.JSONField(default=list)  # 数据来源slice IDs
    order_index = models.IntegerField()
```

## ⚙️ 步骤4: 数据处理Pipeline (slices.py)

### 4.1 标准化处理流程
```python
# backend/reports/services/slices.py

def canonicalize_slice_config(sc: Dict[str, Any]) -> Dict[str, Any]:
    """
    将各种slice_config格式标准化为统一的结构：
    {"slices": { <slice_id>: <slice_dict> }}
    """
    
    # 情况1: 已经是标准格式
    if "slices" in sc:
        return sc
    
    # 情况2: inline_data 格式
    if "inline_data" in sc:
        return {
            "slices": {
                "default": {
                    "data_root": sc["inline_data"]
                }
            }
        }
    
    # 情况3: inline_result 格式  
    if "inline_result" in sc:
        slices = {}
        ir = sc["inline_result"]
        
        # 处理每个slice
        for slice_id, slice_data in ir.items():
            if isinstance(slice_data, dict) and "columns" in slice_data:
                # columns/rows 格式
                slices[slice_id] = {"data_root": slice_data}
            elif isinstance(slice_data, list):
                # 记录列表格式
                slices[slice_id] = {"inline_rows": slice_data}
        
        return {"slices": slices}
    
    # 情况4: rows_long 格式
    if "rows_long" in sc:
        return {
            "slices": {
                "default": {
                    "rows_long": sc["rows_long"],
                    "dimensions": sc.get("dimensions", []),
                    "metrics": sc.get("metrics", [])
                }
            }
        }
    
    # 情况5: 外部数据源格式
    return {
        "slices": {
            "default": sc  # 保持原样，等待外部数据获取
        }
    }
```

### 4.2 数据物化处理
```python
def materialize_report_slices(report: Report) -> Dict[str, Any]:
    """
    将Report的slice_config处理成实际的表格数据
    """
    canonical_config = canonicalize_slice_config(report.slice_config)
    slices_data = {}
    
    for slice_id, slice_config in canonical_config["slices"].items():
        slice_result = _materialize_one_slice(slice_config)
        slices_data[slice_id] = slice_result
    
    return slices_data

def _materialize_one_slice(slice_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理单个slice，返回标准化的表格数据
    """
    
    # 处理 data_root (columns/rows) 格式
    if "data_root" in slice_config:
        data = slice_config["data_root"]
        return {
            "table": _convert_columns_rows_to_table(
                data["columns"], 
                data["rows"]
            ),
            "metadata": {"source": "inline_data"}
        }
    
    # 处理 rows_long 格式
    elif "rows_long" in slice_config:
        return {
            "table": _pivot_long_to_wide(
                slice_config["rows_long"],
                slice_config.get("dimensions", []),
                slice_config.get("metrics", [])
            ),
            "metadata": {"source": "rows_long"}
        }
    
    # 处理外部数据源
    elif "dataset" in slice_config:
        # 这里会调用外部API或数据库查询
        return _fetch_external_data(slice_config)
    
    # 默认返回空表格
    return {"table": [], "metadata": {"source": "empty"}}
```

## 🏗️ 步骤5: 组装和导出 (assembler.py)

### 5.1 数据组装流程
```python
# backend/reports/services/assembler.py

def assemble_report_html(report: Report) -> str:
    """
    将Report和所有Section组装成最终HTML
    """
    
    # 1. 获取所有slice数据
    slices_data = materialize_report_slices(report)
    
    # 2. 为每个section生成HTML
    sections_html = []
    for section in report.sections.all():
        section_html = _assemble_section_html(section, slices_data)
        sections_html.append(section_html)
    
    # 3. 生成完整HTML文档
    full_html = _combine_sections_html(sections_html, report)
    
    return full_html

def _assemble_section_html(section: ReportSection, slices_data: Dict) -> str:
    """
    组装单个section的HTML
    """
    
    # 1. 生成图表HTML
    charts_html = {}
    for chart_config in section.charts:
        chart_name = chart_config.get("title", "chart")
        data_source = chart_config.get("data_source", "default")
        
        if data_source in slices_data:
            chart_html = _generate_chart_html(chart_config, slices_data[data_source])
            charts_html[chart_name] = chart_html
    
    # 2. 生成数据表格HTML
    tables_html = {}
    for slice_id in section.source_slice_ids:
        if slice_id in slices_data:
            table_html = _generate_table_html(slices_data[slice_id]["table"])
            tables_html[slice_id] = table_html
    
    # 3. 准备Jinja2模板上下文
    context = {
        "charts": charts_html,           # charts.roi_trend
        "html_tables": tables_html,      # html_tables.default
        "chart": lambda name: charts_html.get(name, ""),      # chart('roi_trend')
        "has_chart": lambda name: name in charts_html,        # has_chart('roi_trend')
        # 从report.slice_config计算的变量
        "total_cost": _calculate_total_cost(slices_data),
        "total_revenue": _calculate_total_revenue(slices_data),
        "roi_percentage": _calculate_roi(slices_data),
    }
    
    # 4. 渲染Jinja2模板
    from jinja2 import Environment, BaseLoader
    env = Environment(loader=BaseLoader())
    template = env.from_string(section.content_md)
    rendered_html = template.render(context)
    
    return rendered_html
```

## 🔄 完整数据流示例

### 示例：创建一个营销报告

#### 1. 创建Template
```json
{
  "id": "marketing_template_v1",
  "name": "营销报告模板",
  "version": 1,
  "blocks": ["summary", "analysis", "charts"],
  "variables": {
    "company_name": "默认公司",
    "currency": "CNY"
  }
}
```

#### 2. 创建Report（带数据）
```json
{
  "id": "q1_report_2024",
  "title": "2024年Q1营销报告",
  "report_template_id": "marketing_template_v1",
  "slice_config": {
    "inline_result": {
      "campaign_performance": {
        "columns": ["Campaign", "Cost", "Revenue", "ROI"],
        "rows": [
          ["Facebook Ads", 50000, 125000, 150],
          ["Google Ads", 40000, 100000, 150],
          ["TikTok Ads", 30000, 90000, 200]
        ]
      },
      "monthly_trend": {
        "columns": ["Month", "Total_Cost", "Total_Revenue"],
        "rows": [
          ["January", 40000, 95000],
          ["February", 45000, 110000], 
          ["March", 35000, 110000]
        ]
      }
    }
  }
}
```

#### 3. 创建Section（引用数据）
```json
{
  "id": "section_summary",
  "title": "执行摘要", 
  "content_md": "# 2024年Q1营销活动报告\n\n## 总体表现\n总投资: **{{total_cost}}** 元\n总收入: **{{total_revenue}}** 元\nROI: **{{roi_percentage}}%**\n\n## 渠道表现\n{{ html_tables.campaign_performance }}\n\n## 月度趋势\n{% if has_chart('monthly_trend') %}\n{{ charts.monthly_trend|safe }}\n{% endif %}",
  "charts": [
    {
      "title": "monthly_trend",
      "type": "line",
      "data_source": "monthly_trend",
      "x": "Month",
      "y": "Total_Revenue"
    }
  ],
  "source_slice_ids": ["campaign_performance", "monthly_trend"]
}
```

#### 4. 数据处理流程
```python
# 输入: Report.slice_config
{
  "inline_result": {
    "campaign_performance": {"columns": [...], "rows": [...]},
    "monthly_trend": {"columns": [...], "rows": [...]}
  }
}

# 经过 canonicalize_slice_config() 标准化
{
  "slices": {
    "campaign_performance": {"data_root": {"columns": [...], "rows": [...]}},
    "monthly_trend": {"data_root": {"columns": [...], "rows": [...]}}
  }
}

# 经过 materialize_report_slices() 物化
{
  "campaign_performance": {
    "table": [
      {"Campaign": "Facebook Ads", "Cost": 50000, "Revenue": 125000, "ROI": 150},
      {"Campaign": "Google Ads", "Cost": 40000, "Revenue": 100000, "ROI": 150},
      {"Campaign": "TikTok Ads", "Cost": 30000, "Revenue": 90000, "ROI": 200}
    ],
    "metadata": {"source": "inline_data"}
  },
  "monthly_trend": {
    "table": [
      {"Month": "January", "Total_Cost": 40000, "Total_Revenue": 95000},
      {"Month": "February", "Total_Cost": 45000, "Total_Revenue": 110000},
      {"Month": "March", "Total_Cost": 35000, "Total_Revenue": 110000}
    ],
    "metadata": {"source": "inline_data"}
  }
}
```

#### 5. 最终HTML输出
```html
<div class="section" id="section_summary">
  <h1>2024年Q1营销活动报告</h1>
  
  <h2>总体表现</h2>
  <p>总投资: <strong>120000</strong> 元</p>
  <p>总收入: <strong>315000</strong> 元</p>
  <p>ROI: <strong>162.5%</strong></p>
  
  <h2>渠道表现</h2>
  <table class="data-table">
    <thead>
      <tr><th>Campaign</th><th>Cost</th><th>Revenue</th><th>ROI</th></tr>
    </thead>
    <tbody>
      <tr><td>Facebook Ads</td><td>50000</td><td>125000</td><td>150</td></tr>
      <tr><td>Google Ads</td><td>40000</td><td>100000</td><td>150</td></tr>
      <tr><td>TikTok Ads</td><td>30000</td><td>90000</td><td>200</td></tr>
    </tbody>
  </table>
  
  <h2>月度趋势</h2>
  <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." alt="monthly_trend" />
</div>
```

## 🔗 关键连接点

### 数据流转的关键环节：

1. **Template → Report**: Template提供结构框架，Report提供具体数据配置
2. **Report.slice_config → slices.py**: 数据标准化和物化处理  
3. **Section.source_slice_ids → assembler.py**: Section明确声明使用哪些数据
4. **Section.content_md**: 通过Jinja2模板语法引用处理后的数据
5. **Section.charts**: 图表配置指定如何可视化数据

### slice_config是核心：
- 它定义了Report的所有数据来源
- 支持多种格式（inline_data, inline_result, rows_long, 外部数据源）
- 通过slices.py统一处理成标准表格格式
- Section通过source_slice_ids明确引用需要的数据

这样就完成了从Template创建到数据最终在Section中展示的完整流程！


