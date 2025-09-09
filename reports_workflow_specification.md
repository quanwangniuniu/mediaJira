# Reports 模块完整工作流程和状态机规范

## 📊 状态机定义

### 主要状态
- **draft**: 草稿状态 - 可编辑
- **in_review**: 审查中 - 审批流程
- **approved**: 已批准 - 锁定状态  
- **published**: 已发布 - 最终状态

### 状态转换规则

| 当前状态 | 触发动作 | 目标状态 | 条件 | API端点 |
|----------|----------|----------|------|---------|
| `draft` | `submit()` | `in_review` | 报告内容完整 | `POST /reports/{id}/submit/` |
| `in_review` | `approve()` | `approved` | 审批通过 | `POST /reports/{id}/approve/` |
| `in_review` | `reject()` | `draft` | 审批拒绝 | `POST /reports/{id}/approve/` |
| `approved` | `publish()` | `published` | 发布完成 | `POST /reports/{id}/publish/confluence/` |
| `approved` | `fork()` | `draft` (新版本) | 创建副本 | `POST /reports/{id}/fork/` |
| `published` | `fork()` | `draft` (新版本) | 创建副本 | `POST /reports/{id}/fork/` |

## 🔄 完整工作流程

### 阶段1: 创建和编辑 (draft)

#### 1.1 模板管理
```http
# 创建报告模板
POST /api/reports/report-templates/
{
  "id": "marketing_template_v1",
  "name": "营销报告标准模板",
  "version": 1,
  "blocks": ["summary", "analysis", "recommendations"],
  "variables": {
    "company_name": "默认公司",
    "currency": "CNY"
  }
}
```

#### 1.2 报告创建
```http
# 基于模板创建报告
POST /api/reports/reports/
{
  "id": "q1_marketing_report_2024",
  "title": "2024年Q1营销活动报告",
  "report_template_id": "marketing_template_v1",
  "owner_id": "user_123",
  "slice_config": {
    "inline_data": {
      "columns": ["Campaign", "Cost", "Revenue", "ROI"],
      "rows": [
        ["Facebook Ads", "50000", "125000", "150%"],
        ["Google Ads", "40000", "100000", "150%"]
      ]
    }
  }
}
```

#### 1.3 章节管理
```http
# 添加执行摘要章节
POST /api/reports/reports/q1_marketing_report_2024/sections/
{
  "id": "section_executive_summary",
  "title": "执行摘要",
  "content_md": "# 执行摘要\n\n本季度营销活动总投资{{total_cost}}元，实现收入{{total_revenue}}元，ROI达到{{roi_percentage}}%。\n\n## 关键成果\n- Facebook广告表现优异，ROI达到150%\n- Google广告稳定增长，转化率提升\n\n## 数据概览\n{{ html_tables.default }}",
  "order_index": 1,
  "charts": [
    {
      "title": "ROI趋势分析",
      "type": "line",
      "data_source": "default",
      "x": "Campaign",
      "y": "ROI"
    }
  ]
}

# 添加数据分析章节
POST /api/reports/reports/q1_marketing_report_2024/sections/
{
  "id": "section_data_analysis", 
  "title": "数据分析",
  "content_md": "# 数据分析\n\n## 渠道表现对比\n{% if has_chart('channel_comparison') %}\n{{ charts.channel_comparison|safe }}\n{% endif %}\n\n## 详细数据\n{{ html_tables.default }}\n\n## 关键发现\n1. Facebook广告的点击率提升25%\n2. Google广告的转化成本下降15%\n3. 整体ROI超过预期目标20%",
  "order_index": 2
}
```

#### 1.4 协作注释
```http
# 团队成员添加协作意见
POST /api/reports/reports/q1_marketing_report_2024/annotations/
{
  "id": "annotation_data_suggestion",
  "section_id": "section_data_analysis",
  "author_id": "data_analyst_wang",
  "body_md": "## 数据建议\n\n建议在数据分析部分添加：\n1. 同比增长数据对比\n2. 各渠道的转化漏斗分析\n3. 用户获取成本(CAC)趋势\n\n这些数据能够提供更全面的分析视角。",
  "anchor": {
    "section": "data_analysis", 
    "element": "performance_table"
  },
  "status": "open"
}
```

### 阶段2: 审查和批准 (in_review)

#### 2.1 提交审批
```http
# 报告完成后提交审批
POST /api/reports/reports/q1_marketing_report_2024/submit/
{
  "comment": "Q1营销报告已完成，包含完整的数据分析和业务建议，请审批"
}

# 触发webhook: report.submitted
# 报告状态: draft → in_review
```

#### 2.2 审查过程
```http
# 审查者添加反馈注释
POST /api/reports/reports/q1_marketing_report_2024/annotations/
{
  "id": "annotation_finance_review",
  "section_id": "section_executive_summary",
  "author_id": "finance_director_li",
  "body_md": "## 财务数据审查\n\n请核实以下数据：\n\n1. **ROI计算**: 当前计算是否包含所有成本？\n2. **收入确认**: 是否按照会计准则确认收入？\n3. **成本归集**: 人工成本和间接费用是否已包含？\n\n**要求**: 请提供详细的计算公式和数据来源说明。\n\n**优先级**: 🔴 高优先级",
  "anchor": {
    "section": "executive_summary",
    "metric": "roi_calculation"
  },
  "status": "open"
}

# 审查者发现数据问题
POST /api/reports/reports/q1_marketing_report_2024/annotations/
{
  "id": "annotation_data_error",
  "section_id": "section_data_analysis", 
  "author_id": "marketing_director_zhao",
  "body_md": "## 数据准确性问题\n\n发现Facebook广告的ROI数据可能有误：\n- 报告显示150%，但我们内部记录是135%\n- 建议重新核实广告平台的原始数据\n- 可能是计算周期或归因模型的差异\n\n**建议**: 暂缓批准，先核实数据准确性",
  "status": "open"
}
```

#### 2.3 问题修复
```http
# 报告作者修复问题
PUT /api/reports/reports/q1_marketing_report_2024/sections/section_executive_summary/
{
  "content_md": "# 执行摘要\n\n本季度营销活动总投资{{total_cost}}元，实现收入{{total_revenue}}元，ROI达到{{roi_percentage}}%。\n\n## ROI计算说明\n- 计算公式: (总收入 - 总成本) / 总成本 × 100%\n- 成本包含: 广告投入 + 人工成本 + 平台服务费\n- 收入确认: 按照权责发生制，确认实际到账收入\n\n## 关键成果\n- Facebook广告ROI修正为135% (已核实原始数据)\n- Google广告稳定增长，转化率提升\n\n## 数据概览\n{{ html_tables.default }}"
}

# 标记注释为已解决
PATCH /api/reports/reports/q1_marketing_report_2024/annotations/annotation_finance_review/
{
  "status": "resolved",
  "resolved_by": "report_author_zhang"
}

PATCH /api/reports/reports/q1_marketing_report_2024/annotations/annotation_data_error/
{
  "status": "resolved", 
  "resolved_by": "report_author_zhang"
}
```

#### 2.4 最终批准
```http
# 审查完成，批准报告
POST /api/reports/reports/q1_marketing_report_2024/approve/
{
  "action": "approve",
  "comment": "数据已核实，分析完整，建议准确，批准发布。感谢团队的辛苦工作。"
}

# 触发webhook: report.approved  
# 报告状态: in_review → approved
```

### 阶段3: 导出和发布 (approved)

#### 3.1 PDF导出
```http
# 导出PDF版本
POST /api/reports/reports/q1_marketing_report_2024/export/
{
  "format": "pdf"
}

# 响应: 异步任务Job ID
{
  "id": "exp_q1_marketing_report_2024_abc123",
  "type": "export",
  "status": "queued",
  "created_at": "2024-01-15T10:00:00Z"
}

# 监控任务状态
GET /api/reports/jobs/exp_q1_marketing_report_2024_abc123/
{
  "id": "exp_q1_marketing_report_2024_abc123",
  "type": "export", 
  "status": "succeeded",
  "result_asset_id": "asset_pdf_q1_report",
  "updated_at": "2024-01-15T10:02:30Z"
}

# 触发webhook: export.completed
```

#### 3.2 PPTX导出
```http
# 导出PPTX版本
POST /api/reports/reports/q1_marketing_report_2024/export/
{
  "format": "pptx",
  "include_csv": true
}

# 类似的异步处理流程...
```

#### 3.3 Confluence发布
```http
# 发布到Confluence
POST /api/reports/reports/q1_marketing_report_2024/publish/confluence/
{
  "space_key": "MARKETING",
  "title": "2024年Q1营销活动报告",
  "parent_page_id": "123456789"
}

# 响应: 异步发布任务
{
  "id": "pub_q1_marketing_report_2024_def456",
  "type": "publish",
  "status": "queued"
}

# 发布完成后触发webhook: report.published
# 报告状态: approved → published (可选)
```

#### 3.4 资产管理
```http
# 查看生成的所有资产
GET /api/reports/reports/q1_marketing_report_2024/assets/
{
  "count": 3,
  "results": [
    {
      "id": "asset_pdf_q1_report",
      "file_type": "pdf",
      "file_url": "/media/reports/q1_marketing_report_2024/report.pdf",
      "created_at": "2024-01-15T10:02:30Z"
    },
    {
      "id": "asset_pptx_q1_report", 
      "file_type": "pptx",
      "file_url": "/media/reports/q1_marketing_report_2024/report.pptx",
      "created_at": "2024-01-15T10:05:15Z"
    },
    {
      "id": "asset_confluence_q1_report",
      "file_type": "confluence", 
      "file_url": "https://company.atlassian.net/x/page123",
      "created_at": "2024-01-15T10:08:45Z"
    }
  ]
}

# 获取安全下载链接
POST /api/reports/reports/q1_marketing_report_2024/assets/asset_pdf_q1_report/signed_url/
{
  "expires_in": 3600
}
```

### 阶段4: 版本管理和维护

#### 4.1 创建新版本
```http
# 需要修改已批准的报告时，创建新版本
POST /api/reports/reports/q1_marketing_report_2024/fork/

# 响应: 新版本报告
{
  "id": "q1_marketing_report_2024_v2",
  "title": "2024年Q1营销活动报告 v2",
  "status": "draft",
  "forked_from": "q1_marketing_report_2024",
  "created_at": "2024-01-20T09:00:00Z"
}
```

#### 4.2 定时导出
```http
# 配置定时导出任务 (通过Celery Beat)
# 系统会自动扫描需要定期导出的报告
```

## 🔐 权限矩阵

### 角色定义
- **Viewer**: 只读用户，可查看已发布报告
- **Editor**: 编辑者，可创建和编辑报告
- **Approver**: 审批者，可审批报告
- **Admin**: 管理员，拥有所有权限

### 权限详细表

| 操作 | Viewer | Editor | Approver | Admin |
|------|--------|--------|----------|-------|
| **查看报告** | ✅ | ✅ | ✅ | ✅ |
| **创建报告** | ❌ | ✅ | ✅ | ✅ |
| **编辑报告(draft)** | ❌ | ✅(自己的) | ✅ | ✅ |
| **删除报告** | ❌ | ✅(自己的) | ❌ | ✅ |
| **提交审批** | ❌ | ✅(自己的) | ✅ | ✅ |
| **审批报告** | ❌ | ❌ | ✅ | ✅ |
| **添加注释(draft/review)** | ❌ | ✅ | ✅ | ✅ |
| **解决注释** | ❌ | ✅(自己的) | ✅ | ✅ |
| **导出文件** | ❌ | ✅ | ✅ | ✅ |
| **发布报告** | ❌ | ❌ | ✅ | ✅ |
| **Fork报告** | ❌ | ✅ | ✅ | ✅ |
| **管理模板** | ❌ | ✅ | ✅ | ✅ |

## 🔔 Webhook事件

### 事件类型和触发时机

| 事件名称 | 触发时机 | 载荷内容 |
|----------|----------|----------|
| `report.submitted` | 报告提交审批时 | report, triggered_by |
| `report.approved` | 报告审批通过时 | report, approver_id |
| `export.completed` | 导出任务完成时 | job, asset |
| `report.published` | 发布任务完成时 | job, page_id, page_url |

### Webhook配置
```bash
# 环境变量配置
WEBHOOK_ENDPOINT=https://your-system.com/webhooks
WEBHOOK_SECRET=your-secret-key
WEBHOOK_TIMEOUT=5
WEBHOOK_RETRIES=2
```

## ⚙️ 异步任务

### Celery任务类型

| 任务名称 | 功能 | 重试次数 | 超时时间 |
|----------|------|----------|----------|
| `export_report_task` | PDF/PPTX导出 | 3次 | 300秒 |
| `publish_confluence_task` | Confluence发布 | 3次 | 180秒 |
| `scan_and_schedule_exports` | 定时导出扫描 | 1次 | 60秒 |
| `cleanup_old_files` | 清理旧文件 | 2次 | 120秒 |

### 任务监控
```http
# 查看任务状态
GET /api/reports/jobs/{job_id}/

# 任务状态: queued → running → succeeded/failed
```

## 🚀 性能优化

### ETag缓存
- 所有GET请求支持ETag缓存
- 条件请求减少带宽使用
- 乐观锁防止并发冲突

### 分页和搜索
- 列表API支持分页
- 全文搜索功能
- 多维度过滤

### 异步处理
- 导出和发布异步执行
- 避免阻塞用户界面
- 支持大文件处理

## 📋 最佳实践

### 1. 报告设计
- 使用标准化模板
- 合理设置变量和配置
- 保持章节结构清晰

### 2. 协作流程
- 及时处理注释反馈
- 保持沟通记录完整
- 遵循审批流程规范

### 3. 版本管理
- 使用语义化版本号
- 保留重要版本历史
- 规范Fork命名规则

### 4. 安全合规
- 定期备份重要报告
- 遵循访问权限控制
- 保护敏感数据

这就是Reports模块的完整工作流程和状态机规范！涵盖了从创建到发布的全生命周期。
