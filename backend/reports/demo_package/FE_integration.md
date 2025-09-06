# MediaJira Reports - Frontend Integration Guide

## Overview

This document provides frontend developers with an integration guide for the MediaJira Reports system, covering key integration points including Markdown editor integration, chart display, cache reuse, and more.

## 1. Markdown Editor Integration

### 1.1 Backend Field Storage

**Template Sections**
```json
{
  "id": "sec-example",
  "title": "Example Section",
  "content": "# Title\n\nParagraph content\n\n{{ charts.example }}\n\n{{ html_tables.data }}",
  "filters": {"status": "active"},
  "order": 1
}
```

**Report Sections**
```json
{
  "id": "report-sec-001",
  "template_section_id": "sec-example", 
  "slice_result": {
    "inline": {"columns": [...], "rows": [...]}
  },
  "vars": {"date_range": "2024-01"},
  "order": 1
}
```

### 1.2 Frontend Editor Configuration

**Recommended Editor**: @uiw/react-md-editor or react-markdown-editor-lite

```jsx
import MDEditor from '@uiw/react-md-editor';

function SectionEditor({ section, onChange }) {
  const [content, setContent] = useState(section.content);
  
  const handleChange = (val) => {
    setContent(val);
    onChange({
      ...section,
      content: val
    });
  };

  return (
    <MDEditor
      value={content}
      onChange={handleChange}
      preview="edit"
      hideToolbar={false}
      data-color-mode="light"
    />
  );
}
```

### 1.3 Template Variable Hints

To help users insert correct variables, the frontend should provide auto-completion:

```jsx
const TEMPLATE_VARIABLES = [
  // Chart variables
  { label: '{{ charts.overview }}', desc: 'Overview chart' },
  { label: '{{ charts.performance }}', desc: 'Performance trends' },
  { label: '{{ charts.roi_analysis }}', desc: 'ROI analysis' },
  
  // Table variables
  { label: '{{ html_tables.summary }}', desc: 'Summary data table' },
  { label: '{{ html_tables.details }}', desc: 'Detailed data table' },
  
  // Numeric variables
  { label: '{{ total_cost | round(2) }}', desc: 'Total cost (2 decimal places)' },
  { label: '{{ roi_percentage }}', desc: 'ROI percentage' },
  { label: '{{ date_range }}', desc: 'Date range' }
];
```

## 2. Chart Image Generation and Display

### 2.1 Backend Chart Generation

The backend uses Matplotlib to generate static PNG charts, provided through the following methods:

**Method 1: Base64 Data URI (recommended for exports)**
```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." />
```

**Method 2: S3/MinIO URL (recommended for frontend preview)**
```html
<img src="https://minio.local:9000/reports/charts/chart_123.png" />
```

### 2.2 Frontend Chart Preview

```jsx
// Get report preview
async function getReportPreview(reportId) {
  const response = await fetch(`/api/reports/${reportId}/preview/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const preview = await response.json();
  return preview; // Contains rendered HTML and chart URLs
}

// Chart component
function ChartPreview({ chartUrl, alt }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  return (
    <div className="chart-container">
      {loading && <ChartSkeleton />}
      <img 
        src={chartUrl}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {error && <div className="error">Chart loading failed</div>}
    </div>
  );
}
```

### 2.3 Chart Type Descriptions

The backend supports the following chart types:

| Chart Type | Variable Name | Description |
|---------|--------|---------|
| Bar Chart | `charts.bar_chart` | Categorical data comparison |
| Line Chart | `charts.line_chart` | Trend analysis |
| Pie Chart | `charts.pie_chart` | Proportion analysis |
| Scatter Plot | `charts.scatter_plot` | Correlation analysis |
| Heatmap | `charts.heatmap` | Matrix data visualization |

## 3. API Interface Documentation

### 3.1 Core CRUD Interfaces

**Templates**
```
GET    /api/templates/              # Get template list
POST   /api/templates/              # Create template
GET    /api/templates/{id}/         # Get template details
PUT    /api/templates/{id}/         # Update template
DELETE /api/templates/{id}/         # Delete template
```

**Reports**
```
GET    /api/reports/                # Get report list
POST   /api/reports/                # Create report
GET    /api/reports/{id}/           # Get report details
PUT    /api/reports/{id}/           # Update report
DELETE /api/reports/{id}/           # Delete report
```

### 3.2 Workflow Interfaces

**Submit and Approval**
```
POST   /api/reports/{id}/submit/    # Submit for approval
POST   /api/reports/{id}/approve/   # Approve report
POST   /api/reports/{id}/reject/    # Reject report
```

**Export and Publish**
```
POST   /api/reports/{id}/export/pdf/        # Export PDF
POST   /api/reports/{id}/export/pptx/       # Export PPTX
POST   /api/reports/{id}/publish/confluence/ # Publish to Confluence
```

**Preview and Assets**
```
GET    /api/reports/{id}/preview/    # Get report preview
GET    /api/reports/{id}/assets/     # Get report assets
GET    /api/assets/{id}/signed-url/  # Get asset signed URL
```

### 3.3 Task Status Query

All asynchronous operations return a Job ID for status querying:

```javascript
// Export report
const exportResponse = await fetch('/api/reports/123/export/pdf/', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
const { id: jobId } = await exportResponse.json();

// Poll task status
async function pollJobStatus(jobId) {
  const response = await fetch(`/api/jobs/${jobId}/`);
  const job = await response.json();
  
  switch(job.status) {
    case 'succeeded':
      return job.file_url; // Download link
    case 'failed':
      throw new Error(job.message);
    case 'running':
    case 'queued':
      await new Promise(resolve => setTimeout(resolve, 2000));
      return pollJobStatus(jobId); // Recursive polling
  }
}
```

## 4. Cache Layer and Metrics Reuse

### 4.1 Existing Dashboard Metrics

Assuming existing dashboard has the following metrics endpoints:

```
GET /api/dashboard/metrics/campaigns/     # Campaign data
GET /api/dashboard/metrics/channels/      # Channel data  
GET /api/dashboard/metrics/conversion/    # Conversion data
```

### 4.2 Reuse in Reports

**Method 1: Direct Reference (recommended)**
```json
{
  "slice_result": {
    "api_endpoint": "/api/dashboard/metrics/campaigns/",
    "params": {
      "date_range": "2024-01-01,2024-01-31",
      "status": "active"
    }
  }
}
```

**Method 2: Cache Key Reference**
```json
{
  "slice_result": {
    "cache_key": "dashboard:campaigns:2024-01:active"
  }
}
```

### 4.3 Caching Strategy

```python
# backend/reports/services/data_loader.py
from django.core.cache import cache
import hashlib

def load_slice_data(slice_config):
    """Load slice data, prioritize cache"""
    
    if 'inline' in slice_config:
        return slice_config['inline']
    
    if 'api_endpoint' in slice_config:
        # Generate cache key
        cache_key = generate_cache_key(
            slice_config['api_endpoint'], 
            slice_config.get('params', {})
        )
        
        # Try to get from cache
        data = cache.get(cache_key)
        if data:
            return data
        
        # Cache miss, call API
        data = call_dashboard_api(slice_config)
        cache.set(cache_key, data, timeout=3600)  # Cache 1 hour
        return data
    
    if 'cache_key' in slice_config:
        return cache.get(slice_config['cache_key'])
```

## 5. Frontend Component Examples

### 5.1 Report Editor Component

```jsx
import React, { useState, useEffect } from 'react';
import MDEditor from '@uiw/react-md-editor';

function ReportEditor({ reportId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      const response = await fetch(`/api/reports/${reportId}/`);
      const data = await response.json();
      setReport(data);
    } finally {
      setLoading(false);
    }
  };

  const updateSection = async (sectionId, updates) => {
    setSaving(true);
    try {
      await fetch(`/api/reports/${reportId}/sections/${sectionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      // Update local state
      setReport(prev => ({
        ...prev,
        sections: prev.sections.map(s => 
          s.id === sectionId ? { ...s, ...updates } : s
        )
      }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="report-editor">
      <header>
        <h1>{report.title}</h1>
        <div className="actions">
          <button disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => submitReport(reportId)}>
            Submit for Approval
          </button>
        </div>
      </header>

      {report.sections.map(section => (
        <SectionEditor
          key={section.id}
          section={section}
          onChange={updates => updateSection(section.id, updates)}
        />
      ))}
    </div>
  );
}
```

### 5.2 Export Status Component

```jsx
function ExportButton({ reportId, format }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    
    try {
      // Start export
      const response = await fetch(`/api/reports/${reportId}/export/${format}/`, {
        method: 'POST'
      });
      const { id: jobId } = await response.json();
      
      // Poll status
      const fileUrl = await pollJobStatus(jobId, setProgress);
      
      // Download file
      window.open(fileUrl, '_blank');
      
    } catch (error) {
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  return (
    <button 
      onClick={handleExport} 
      disabled={exporting}
      className="export-button"
    >
      {exporting ? (
        <span>
          Exporting... {progress && `${progress}%`}
        </span>
      ) : (
        `Export ${format.toUpperCase()}`
      )}
    </button>
  );
}
```

## 6. Error Handling

### 6.1 API Error Handling

```javascript
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new APIError(error.message, response.status, error);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) throw error;
    throw new APIError('Network error', 0, error);
  }
}

class APIError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
```

### 6.2 Form Validation

```jsx
function SectionForm({ section, onSubmit }) {
  const [errors, setErrors] = useState({});

  const validate = (data) => {
    const errors = {};
    
    if (!data.title?.trim()) {
      errors.title = 'Section title cannot be empty';
    }
    
    if (!data.content?.trim()) {
      errors.content = 'Section content cannot be empty';
    }
    
    // Check template variable syntax
    const invalidVars = validateTemplateVars(data.content);
    if (invalidVars.length > 0) {
      errors.content = `Invalid template variables: ${invalidVars.join(', ')}`;
    }
    
    return errors;
  };

  const handleSubmit = (data) => {
    const validationErrors = validate(data);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors({});
    onSubmit(data);
  };

  // ... form rendering
}
```

## 7. Performance Optimization

### 7.1 Component Optimization

```jsx
import { memo, useMemo, useCallback } from 'react';

const SectionEditor = memo(({ section, onChange }) => {
  const memoizedContent = useMemo(() => 
    section.content, [section.content]
  );
  
  const handleChange = useCallback((content) => {
    onChange({ ...section, content });
  }, [section.id, onChange]);

  return (
    <MDEditor 
      value={memoizedContent}
      onChange={handleChange}
    />
  );
});
```

### 7.2 Data Caching

```jsx
import { useQuery, useMutation, useQueryClient } from 'react-query';

function useReport(reportId) {
  return useQuery(['report', reportId], () => 
    apiCall(`/api/reports/${reportId}/`)
  );
}

function useUpdateSection() {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ reportId, sectionId, updates }) =>
      apiCall(`/api/reports/${reportId}/sections/${sectionId}/`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      }),
    {
      onSuccess: (_, { reportId }) => {
        queryClient.invalidateQueries(['report', reportId]);
      }
    }
  );
}
```

## 8. Deployment Considerations

### 8.1 Environment Configuration

```javascript
// config/api.js
const API_CONFIG = {
  development: {
    baseURL: 'http://localhost:8000/api',
    timeout: 10000
  },
  production: {
    baseURL: '/api',
    timeout: 30000
  }
};

export const api = axios.create(
  API_CONFIG[process.env.NODE_ENV]
);
```

### 8.2 Permission Control

```jsx
function usePermissions() {
  const { user } = useAuth();
  
  return {
    canEdit: user?.permissions?.includes('reports.change_report'),
    canApprove: user?.permissions?.includes('reports.approve_report'),
    canExport: user?.permissions?.includes('reports.export_report'),
    canPublish: user?.permissions?.includes('reports.publish_report')
  };
}
```

---

## Summary

This document covers the main frontend integration points for the MediaJira Reports system:

1. **Markdown Editor**: Uses standard field storage, supports template variables
2. **Chart System**: Backend generates static images, frontend displays via URL or Base64  
3. **API Interfaces**: RESTful design, supports asynchronous task querying
4. **Cache Reuse**: Shares cache layer with existing dashboard metrics
5. **Error Handling**: Unified error handling and user feedback
6. **Performance Optimization**: React best practices and query caching

Following this guide, you can implement complete report editing, preview, export, and publishing functionality.