# 数据输入完整指南

## 🎯 **你是对的！数据输入这部分确实很关键**

目前的实现确实存在数据输入的关键缺失。让我详细说明现在有什么，缺少什么，以及如何完善。

## ✅ **现在已有的数据输入方式**

### 1. 通过API直接创建Report时输入数据
```http
POST /api/reports/reports/
{
  "id": "q1_report_2024",
  "title": "2024年Q1营销报告",
  "slice_config": {
    // 方式1: 直接内联数据
    "inline_data": {
      "columns": ["Campaign", "Cost", "Revenue"],
      "rows": [
        ["Facebook Ads", 50000, 125000],
        ["Google Ads", 40000, 100000]
      ]
    }
  }
}
```

### 2. 通过API更新Report的slice_config
```http
PUT /api/reports/reports/q1_report_2024/
{
  "slice_config": {
    "inline_result": {
      "campaign_performance": {
        "columns": ["Campaign", "Cost", "Revenue", "ROI"],
        "rows": [
          ["Facebook Ads", 50000, 125000, 150],
          ["Google Ads", 40000, 100000, 150],
          ["TikTok Ads", 30000, 90000, 200]
        ]
      }
    }
  }
}
```

## ❌ **目前缺少的关键数据输入功能**

### 1. 文件上传数据输入
**缺少**: CSV/Excel文件上传API
**需要**: 
- 文件上传接口
- CSV解析和验证
- 数据预览功能
- 错误处理和格式验证

### 2. 外部数据源集成
**缺少**: 连接外部数据库/API的机制
**需要**:
- 数据源配置管理
- API连接器
- 数据刷新机制
- 认证和权限管理

### 3. 数据编辑和管理界面
**缺少**: 在线数据编辑功能
**需要**:
- 表格编辑器
- 数据验证
- 实时预览
- 版本控制

### 4. 数据导入向导
**缺少**: 用户友好的数据导入流程
**需要**:
- 步骤式导入向导
- 字段映射功能
- 数据类型检测
- 导入预览和确认

## 🚀 **需要实现的数据输入功能**

### **功能1: CSV文件上传**

#### API设计
```http
# 1. 上传CSV文件
POST /api/reports/reports/{report_id}/upload_csv/
Content-Type: multipart/form-data

file: [CSV文件]
slice_id: "campaign_data"  # 可选，默认为"default"

# 响应
{
  "slice_id": "campaign_data",
  "preview": {
    "columns": ["Campaign", "Cost", "Revenue"],
    "rows": [
      ["Facebook Ads", "50000", "125000"],
      ["Google Ads", "40000", "100000"]
    ],
    "total_rows": 150,
    "preview_rows": 10
  },
  "validation": {
    "errors": [],
    "warnings": ["Row 5: Cost value seems unusually high"]
  }
}

# 2. 确认导入
POST /api/reports/reports/{report_id}/confirm_csv_import/
{
  "slice_id": "campaign_data",
  "column_mapping": {
    "Campaign": "campaign_name",
    "Cost": "cost_usd", 
    "Revenue": "revenue_usd"
  },
  "data_types": {
    "cost_usd": "float",
    "revenue_usd": "float"
  }
}
```

#### 实现代码
```python
# backend/reports/views.py
from rest_framework.decorators import action
from rest_framework.response import Response
import pandas as pd
import csv

class ReportUploadView(APIView):
    
    @action(detail=True, methods=['post'])
    def upload_csv(self, request, pk=None):
        """上传CSV文件并预览数据"""
        report = self.get_object()
        
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=400)
        
        csv_file = request.FILES['file']
        slice_id = request.data.get('slice_id', 'default')
        
        try:
            # 读取CSV文件
            content = csv_file.read().decode('utf-8')
            csv_reader = csv.reader(content.splitlines())
            rows = list(csv_reader)
            
            if not rows:
                return Response({'error': 'Empty file'}, status=400)
            
            columns = rows[0]
            data_rows = rows[1:]
            
            # 数据验证
            validation_result = self._validate_csv_data(columns, data_rows)
            
            # 生成预览
            preview_rows = data_rows[:10]  # 只显示前10行
            
            return Response({
                'slice_id': slice_id,
                'preview': {
                    'columns': columns,
                    'rows': preview_rows,
                    'total_rows': len(data_rows),
                    'preview_rows': len(preview_rows)
                },
                'validation': validation_result
            })
            
        except Exception as e:
            return Response({'error': str(e)}, status=400)
    
    @action(detail=True, methods=['post'])
    def confirm_csv_import(self, request, pk=None):
        """确认导入CSV数据"""
        report = self.get_object()
        slice_id = request.data.get('slice_id', 'default')
        column_mapping = request.data.get('column_mapping', {})
        
        # 重新读取和处理CSV数据
        # 应用列映射和数据类型转换
        # 更新报告的slice_config
        
        # 获取当前slice_config
        current_config = report.slice_config or {}
        
        # 添加新的slice数据
        if 'inline_result' not in current_config:
            current_config['inline_result'] = {}
        
        current_config['inline_result'][slice_id] = {
            'columns': mapped_columns,
            'rows': processed_rows
        }
        
        # 保存更新
        report.slice_config = current_config
        report.save()
        
        return Response({
            'message': 'CSV data imported successfully',
            'slice_id': slice_id,
            'rows_imported': len(processed_rows)
        })
    
    def _validate_csv_data(self, columns, rows):
        """验证CSV数据质量"""
        errors = []
        warnings = []
        
        # 检查列名
        if not columns:
            errors.append("No column headers found")
        
        # 检查数据一致性
        for i, row in enumerate(rows):
            if len(row) != len(columns):
                errors.append(f"Row {i+2}: Column count mismatch")
        
        # 检查数值字段
        numeric_columns = self._detect_numeric_columns(columns, rows)
        for col_idx, col_name in enumerate(columns):
            if col_name in numeric_columns:
                for row_idx, row in enumerate(rows):
                    if col_idx < len(row):
                        try:
                            float(row[col_idx])
                        except ValueError:
                            warnings.append(f"Row {row_idx+2}, Column '{col_name}': Non-numeric value")
        
        return {'errors': errors, 'warnings': warnings}
```

### **功能2: 数据源连接器**

#### 数据源配置API
```http
# 创建数据源配置
POST /api/reports/data-sources/
{
  "id": "marketing_db",
  "name": "营销数据库",
  "type": "postgresql",
  "connection": {
    "host": "db.company.com",
    "port": 5432,
    "database": "marketing",
    "username": "readonly_user",
    "password": "encrypted_password"
  },
  "tables": ["campaigns", "conversions", "costs"]
}

# 在Report中使用数据源
PUT /api/reports/reports/{report_id}/
{
  "slice_config": {
    "external_query": {
      "data_source_id": "marketing_db",
      "query": "SELECT campaign_name, SUM(cost) as total_cost, SUM(revenue) as total_revenue FROM campaigns WHERE date_range BETWEEN ? AND ? GROUP BY campaign_name",
      "parameters": ["2024-01-01", "2024-03-31"]
    }
  }
}
```

#### 实现代码
```python
# backend/reports/services/data_sources.py
class DataSourceConnector:
    
    def __init__(self, data_source_config):
        self.config = data_source_config
        self.connection = None
    
    def connect(self):
        """建立数据源连接"""
        if self.config['type'] == 'postgresql':
            import psycopg2
            self.connection = psycopg2.connect(**self.config['connection'])
        elif self.config['type'] == 'mysql':
            import mysql.connector
            self.connection = mysql.connector.connect(**self.config['connection'])
        elif self.config['type'] == 'api':
            # HTTP API连接器
            pass
    
    def execute_query(self, query, parameters=None):
        """执行查询并返回结果"""
        cursor = self.connection.cursor()
        cursor.execute(query, parameters or [])
        
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        return {
            'columns': columns,
            'rows': [list(row) for row in rows]
        }
    
    def close(self):
        """关闭连接"""
        if self.connection:
            self.connection.close()

# 在slices.py中集成数据源
def _load_external_data(slice_config):
    """加载外部数据源数据"""
    if 'external_query' not in slice_config:
        return []
    
    query_config = slice_config['external_query']
    data_source_id = query_config['data_source_id']
    
    # 获取数据源配置
    data_source = DataSource.objects.get(id=data_source_id)
    
    # 创建连接器并执行查询
    connector = DataSourceConnector(data_source.config)
    connector.connect()
    
    try:
        result = connector.execute_query(
            query_config['query'],
            query_config.get('parameters', [])
        )
        
        # 转换为标准格式
        rows = []
        for row_data in result['rows']:
            row_dict = {}
            for i, col_name in enumerate(result['columns']):
                row_dict[col_name] = row_data[i]
            rows.append(row_dict)
        
        return rows
        
    finally:
        connector.close()
```

### **功能3: 在线数据编辑器**

#### 数据编辑API
```http
# 获取可编辑的数据表格
GET /api/reports/reports/{report_id}/data_editor/{slice_id}/
{
  "columns": [
    {"name": "Campaign", "type": "text", "editable": true},
    {"name": "Cost", "type": "number", "editable": true},
    {"name": "Revenue", "type": "number", "editable": true},
    {"name": "ROI", "type": "number", "editable": false, "calculated": true}
  ],
  "rows": [
    {"id": 1, "Campaign": "Facebook Ads", "Cost": 50000, "Revenue": 125000, "ROI": 150},
    {"id": 2, "Campaign": "Google Ads", "Cost": 40000, "Revenue": 100000, "ROI": 150}
  ],
  "metadata": {
    "total_rows": 2,
    "editable": true,
    "last_modified": "2024-01-15T10:30:00Z"
  }
}

# 更新单个单元格
PATCH /api/reports/reports/{report_id}/data_editor/{slice_id}/rows/{row_id}/
{
  "field": "Cost",
  "value": 55000
}

# 批量更新
PATCH /api/reports/reports/{report_id}/data_editor/{slice_id}/bulk_update/
{
  "updates": [
    {"row_id": 1, "field": "Cost", "value": 55000},
    {"row_id": 2, "field": "Revenue", "value": 110000}
  ]
}

# 添加新行
POST /api/reports/reports/{report_id}/data_editor/{slice_id}/rows/
{
  "Campaign": "TikTok Ads",
  "Cost": 30000,
  "Revenue": 90000
}

# 删除行
DELETE /api/reports/reports/{report_id}/data_editor/{slice_id}/rows/{row_id}/
```

### **功能4: 数据导入向导**

#### 向导API流程
```http
# 1. 开始导入向导
POST /api/reports/reports/{report_id}/import_wizard/start/
{
  "import_type": "csv",  # csv, excel, api, database
  "file": [文件] 或 "data_source_id": "external_db"
}

# 2. 字段映射步骤
POST /api/reports/reports/{report_id}/import_wizard/mapping/
{
  "session_id": "wizard_session_123",
  "field_mapping": {
    "source_field_1": "target_field_campaign",
    "source_field_2": "target_field_cost"
  },
  "data_types": {
    "target_field_cost": "float",
    "target_field_revenue": "float"
  }
}

# 3. 数据预览和验证
GET /api/reports/reports/{report_id}/import_wizard/preview/{session_id}/

# 4. 完成导入
POST /api/reports/reports/{report_id}/import_wizard/complete/
{
  "session_id": "wizard_session_123",
  "slice_id": "campaign_data",
  "confirm": true
}
```

## 📊 **数据输入完整架构**

```
前端数据输入界面
       ↓
    API层验证
       ↓
   数据处理层 (slices.py)
       ↓
  标准化存储 (slice_config)
       ↓
   组装输出 (assembler.py)
```

## 🔧 **实现优先级建议**

### **高优先级 (立即实现)**
1. **CSV文件上传** - 最常用的数据输入方式
2. **在线数据编辑** - 小数据量快速修改
3. **API数据更新** - 程序化数据输入

### **中优先级 (后续实现)**
1. **Excel文件支持** - 企业用户常用
2. **数据导入向导** - 提升用户体验
3. **数据验证规则** - 数据质量保证

### **低优先级 (长期规划)**
1. **外部数据源连接** - 复杂集成需求
2. **实时数据同步** - 高级功能
3. **数据转换管道** - ETL功能

## 💡 **快速原型实现建议**

创建一个简单的CSV上传功能作为起点：

```python
# 在现有的ReportUploadView中添加
@action(detail=True, methods=['post'])
def upload_data(self, request, pk=None):
    """简单的数据上传接口"""
    report = self.get_object()
    
    # 支持JSON格式直接上传
    if 'json_data' in request.data:
        data = request.data['json_data']
        slice_id = request.data.get('slice_id', 'default')
        
        # 更新slice_config
        current_config = report.slice_config or {}
        if 'inline_result' not in current_config:
            current_config['inline_result'] = {}
        current_config['inline_result'][slice_id] = data
        
        report.slice_config = current_config
        report.save()
        
        return Response({'message': 'Data uploaded successfully'})
    
    return Response({'error': 'Invalid data format'}, status=400)
```

**总结**: 你完全说对了！数据输入确实是missing piece。现在的系统能处理数据，但缺少便捷的数据输入方式。建议优先实现CSV上传和在线编辑功能。


