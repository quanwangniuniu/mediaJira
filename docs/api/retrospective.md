# Retrospective & KPI Analytics API Documentation

## Overview

The Retrospective & KPI Analytics API provides endpoints for managing campaign retrospectives, KPI data collection, and performance insights. This API supports real-time collaboration through WebSocket connections and integrates with the existing campaign workflow.

## Authentication

All endpoints require Bearer token authentication:

```bash
Authorization: Bearer <your-jwt-token>
```

## Core Workflows

### 1. Campaign Retrospective Workflow

#### Step 1: Schedule Retrospective
When a campaign completes, automatically schedule a retrospective:

```bash
POST /api/retrospectives/
Content-Type: application/json

{
  "task_id": 123,
  "created_by": 456,
  "scheduled_time": "2024-06-15T10:00:00Z",
  "status": "Scheduled",
  "team_id": 789
}
```

#### Step 2: Submit KPI Data
Data analysts submit KPI metrics for the campaign:

```bash
POST /api/kpis/campaigns/123
Content-Type: application/json

[
  {
    "campaign_id": 123,
    "metric": "ROI",
    "value": 2.45,
    "source": "Facebook",
    "channel": "Paid Social",
    "recorded_at": "2024-06-15T09:00:00Z"
  },
  {
    "campaign_id": 123,
    "metric": "CTR",
    "value": 0.023,
    "source": "Google",
    "channel": "Search",
    "recorded_at": "2024-06-15T09:00:00Z"
  }
]
```

#### Step 3: Generate Insights
AI or analysts generate performance insights:

```bash
POST /api/retrospectives/456/insights/
Content-Type: application/json

{
  "retrospective_task_id": 456,
  "type": "Underperforming Creative",
  "summary": "Creative A shows 15% lower CTR compared to Creative B",
  "severity": "Medium",
  "action_suggestion": "Consider pausing Creative A and scaling Creative B",
  "generated_by": "ai_rule_001"
}
```

#### Step 4: Approve Report
Manager approves the final retrospective report:

```bash
PATCH /api/retrospectives/456/report/approve
Content-Type: application/json

{
  "approved_by": 789,
  "approval_notes": "Insights validated, recommendations approved"
}
```

### 2. Real-time Collaboration via WebSocket

Connect to WebSocket for live updates:

```javascript
const ws = new WebSocket('ws://localhost:8000/api/ws/retrospectives/456');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  
  switch(data.event_type) {
    case 'kpiUpdated':
      console.log('KPI updated:', data.data);
      updateKPIDisplay(data.data);
      break;
      
    case 'insightGenerated':
      console.log('New insight:', data.data);
      addInsightToUI(data.data);
      break;
      
    case 'reportApproved':
      console.log('Report approved:', data.data);
      showApprovalNotification(data.data);
      break;
  }
};
```

## API Endpoints Reference

### KPI Management

#### Get Campaign KPIs
```bash
GET /api/kpis/campaigns/{campaign_id}
```

**Response:**
```json
[
  {
    "id": 1,
    "campaign_id": 123,
    "metric": "ROI",
    "value": 2.45,
    "recorded_at": "2024-06-15T09:00:00Z",
    "source": "Facebook",
    "channel": "Paid Social"
  }
]
```

#### Submit KPI Values
```bash
POST /api/kpis/campaigns/{campaign_id}
```

**Request Body:**
```json
[
  {
    "campaign_id": 123,
    "metric": "ROI",
    "value": 2.45,
    "source": "Facebook",
    "channel": "Paid Social"
  }
]
```

### Retrospective Management

#### List Retrospectives
```bash
GET /api/retrospectives/?team=789&status=In Progress
```

**Query Parameters:**
- `team` (optional): Filter by team ID
- `status` (optional): Filter by status (Scheduled, In Progress, Completed, Reported)

#### Schedule Retrospective
```bash
POST /api/retrospectives/
```

#### Update Retrospective
```bash
PUT /api/retrospectives/{id}
```

#### Generate Insights
```bash
POST /api/retrospectives/{id}/insights/
```

#### Approve Report
```bash
PATCH /api/retrospectives/{id}/report/approve
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": {
    "metric": ["This field is required"],
    "value": ["Must be a positive number"]
  }
}
```

#### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "message": "User does not have permission to approve reports"
}
```

#### 404 Not Found
```json
{
  "error": "Retrospective not found",
  "message": "Retrospective with ID 456 does not exist"
}
```

## Integration Patterns

### 1. Campaign Completion Trigger

```python
# When campaign completes
def on_campaign_complete(campaign_id):
    # Schedule retrospective
    retrospective_data = {
        "task_id": campaign_id,
        "created_by": get_current_user_id(),
        "scheduled_time": datetime.now() + timedelta(days=1),
        "status": "Scheduled",
        "team_id": get_campaign_team_id(campaign_id)
    }
    
    response = requests.post(
        f"{API_BASE}/retrospectives/",
        json=retrospective_data,
        headers={"Authorization": f"Bearer {token}"}
    )
```

### 2. KPI Data Collection

```python
# Collect KPIs from external sources
def collect_kpis(campaign_id):
    kpis = []
    
    # Facebook data
    fb_data = get_facebook_metrics(campaign_id)
    kpis.append({
        "campaign_id": campaign_id,
        "metric": "ROI",
        "value": fb_data["roi"],
        "source": "Facebook",
        "channel": "Paid Social"
    })
    
    # Submit to API
    response = requests.post(
        f"{API_BASE}/kpis/campaigns/{campaign_id}",
        json=kpis,
        headers={"Authorization": f"Bearer {token}"}
    )
```

### 3. Real-time Dashboard Updates

```javascript
// Connect to WebSocket for live updates
function initializeRetrospectiveDashboard(retrospectiveId) {
    const ws = new WebSocket(`ws://localhost:8000/api/ws/retrospectives/${retrospectiveId}`);
    
    ws.onmessage = function(event) {
        const update = JSON.parse(event.data);
        
        // Update UI based on event type
        switch(update.event_type) {
            case 'kpiUpdated':
                updateKPICards(update.data);
                break;
            case 'insightGenerated':
                addInsightCard(update.data);
                break;
            case 'reportApproved':
                showApprovalBanner(update.data);
                break;
        }
    };
    
    return ws;
}
```

## Best Practices

### 1. KPI Data Submission
- Submit KPI data in batches for better performance
- Include source and channel information for proper categorization
- Use consistent metric names across campaigns

### 2. Insight Generation
- Provide actionable suggestions in insights
- Use appropriate severity levels (Low, Medium, High, Critical)
- Include context and supporting data

### 3. Real-time Updates
- Implement reconnection logic for WebSocket connections
- Handle connection errors gracefully
- Use appropriate event types for different updates

### 4. Security Considerations
- Validate all input data
- Implement proper role-based access control
- Log all API interactions for audit purposes

## Rate Limits

- **KPI submissions**: 100 requests per minute per campaign
- **Insight generation**: 10 requests per minute per retrospective
- **WebSocket connections**: 5 concurrent connections per user

## Support

For API support and questions:
- Email: api-support@mediajira.com
- Documentation: https://docs.mediajira.com/api
- GitHub Issues: https://github.com/mediajira/api-issues 