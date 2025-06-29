"""
OpenAPI 3.0 Specification for Campaign Management API

This module provides comprehensive API documentation for the Campaign Management system,
including all endpoints, request/response schemas, and examples.
"""

OPENAPI_SPEC = {
    "openapi": "3.0.3",
    "info": {
        "title": "MediaJira Campaign Management API",
        "description": """
# Campaign Management API

A comprehensive API for managing advertising campaigns, team assignments, performance metrics, and campaign notes.

## Features

- **Campaign Management**: Create, update, and manage advertising campaigns
- **Team Collaboration**: Assign team members with different roles and permissions
- **Performance Tracking**: Monitor campaign metrics and analytics
- **Status Workflow**: Manage campaign lifecycle with proper status transitions
- **Notes & Comments**: Add notes and comments for better collaboration

## Authentication

All API endpoints require authentication. Use session authentication or basic authentication.

## Rate Limiting

API requests are limited to 1000 requests per hour per user.

## Error Handling

The API uses standard HTTP status codes and returns detailed error messages in JSON format.
        """,
        "version": "1.0.0",
        "contact": {
            "name": "MediaJira API Support",
            "email": "api-support@mediajira.com",
            "url": "https://mediajira.com/api-docs"
        },
        "license": {
            "name": "MIT",
            "url": "https://opensource.org/licenses/MIT"
        }
    },
    "servers": [
        {
            "url": "http://localhost:8000/api",
            "description": "Development server"
        },
        {
            "url": "https://api.mediajira.com/api",
            "description": "Production server"
        }
    ],
    "security": [
        {
            "SessionAuthentication": []
        },
        {
            "BasicAuthentication": []
        }
    ],
    "paths": {
        "/campaigns/": {
            "get": {
                "summary": "List campaigns",
                "description": "Retrieve a paginated list of campaigns. Users can only see campaigns they own or are assigned to.",
                "operationId": "listCampaigns",
                "tags": ["Campaigns"],
                "parameters": [
                    {
                        "name": "status",
                        "in": "query",
                        "description": "Filter campaigns by status",
                        "required": False,
                        "schema": {
                            "type": "string",
                            "enum": ["draft", "active", "paused", "completed", "cancelled"]
                        }
                    },
                    {
                        "name": "campaign_type",
                        "in": "query",
                        "description": "Filter campaigns by type",
                        "required": False,
                        "schema": {
                            "type": "string",
                            "enum": ["digital_display", "social_media", "search_engine", "video", "audio", "print", "outdoor", "influencer"]
                        }
                    },
                    {
                        "name": "owner",
                        "in": "query",
                        "description": "Filter campaigns by owner ID",
                        "required": False,
                        "schema": {"type": "integer"}
                    },
                    {
                        "name": "is_active",
                        "in": "query",
                        "description": "Filter by active status",
                        "required": False,
                        "schema": {"type": "boolean"}
                    },
                    {
                        "name": "search",
                        "in": "query",
                        "description": "Search campaigns by name or description",
                        "required": False,
                        "schema": {"type": "string"}
                    },
                    {
                        "name": "ordering",
                        "in": "query",
                        "description": "Order results by field",
                        "required": False,
                        "schema": {
                            "type": "string",
                            "enum": ["name", "-name", "created_at", "-created_at", "start_date", "-start_date", "end_date", "-end_date", "budget", "-budget"]
                        }
                    },
                    {
                        "name": "page",
                        "in": "query",
                        "description": "Page number",
                        "required": False,
                        "schema": {"type": "integer", "default": 1}
                    },
                    {
                        "name": "page_size",
                        "in": "query",
                        "description": "Number of results per page",
                        "required": False,
                        "schema": {"type": "integer", "default": 20, "maximum": 100}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Successful response",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "count": {"type": "integer", "description": "Total number of campaigns"},
                                        "next": {"type": "string", "nullable": True, "description": "URL to next page"},
                                        "previous": {"type": "string", "nullable": True, "description": "URL to previous page"},
                                        "results": {
                                            "type": "array",
                                            "items": {"$ref": "#/components/schemas/CampaignList"}
                                        }
                                    }
                                },
                                "example": {
                                    "count": 2,
                                    "next": None,
                                    "previous": None,
                                    "results": [
                                        {
                                            "id": "550e8400-e29b-41d4-a716-446655440000",
                                            "name": "Summer Sale Campaign",
                                            "description": "Promotional campaign for summer products",
                                            "campaign_type": "social_media",
                                            "campaign_type_display": "Social Media",
                                            "status": "active",
                                            "status_display": "Active",
                                            "budget": "15000.00",
                                            "spent_amount": "8750.00",
                                            "budget_utilization": 58.33,
                                            "start_date": "2024-06-01T00:00:00Z",
                                            "end_date": "2024-08-31T23:59:59Z",
                                            "duration_days": 92,
                                            "owner": {
                                                "id": 1,
                                                "username": "john_doe",
                                                "email": "john@example.com",
                                                "first_name": "John",
                                                "last_name": "Doe",
                                                "full_name": "John Doe"
                                            },
                                            "team_member_count": 3,
                                            "created_at": "2024-05-15T10:30:00Z",
                                            "updated_at": "2024-06-15T14:20:00Z",
                                            "is_active": True
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            },
            "post": {
                "summary": "Create campaign",
                "description": "Create a new campaign. The authenticated user will be automatically assigned as the owner.",
                "operationId": "createCampaign",
                "tags": ["Campaigns"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/CampaignCreate"},
                            "example": {
                                "name": "Holiday Promotion 2024",
                                "description": "End-of-year promotional campaign for holiday season",
                                "campaign_type": "digital_display",
                                "budget": "25000.00",
                                "start_date": "2024-11-01T00:00:00Z",
                                "end_date": "2024-12-31T23:59:59Z",
                                "tags": ["holiday", "promotion", "2024"]
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "Campaign created successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CampaignDetail"},
                                "example": {
                                    "id": "550e8400-e29b-41d4-a716-446655440001",
                                    "name": "Holiday Promotion 2024",
                                    "description": "End-of-year promotional campaign for holiday season",
                                    "campaign_type": "digital_display",
                                    "campaign_type_display": "Digital Display",
                                    "status": "draft",
                                    "status_display": "Draft",
                                    "budget": "25000.00",
                                    "spent_amount": "0.00",
                                    "budget_utilization": 0.0,
                                    "start_date": "2024-11-01T00:00:00Z",
                                    "end_date": "2024-12-31T23:59:59Z",
                                    "duration_days": 61,
                                    "owner": {
                                        "id": 1,
                                        "username": "john_doe",
                                        "email": "john@example.com",
                                        "first_name": "John",
                                        "last_name": "Doe",
                                        "full_name": "John Doe"
                                    },
                                    "is_running": False,
                                    "is_over_budget": False,
                                    "is_active": True,
                                    "tags": ["holiday", "promotion", "2024"],
                                    "created_at": "2024-10-15T09:00:00Z",
                                    "updated_at": "2024-10-15T09:00:00Z",
                                    "assignments": [],
                                    "metrics": [],
                                    "notes": [],
                                    "available_status_transitions": [
                                        {"value": "active", "label": "Active"},
                                        {"value": "cancelled", "label": "Cancelled"}
                                    ]
                                }
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            }
        },
        "/campaigns/{campaign_id}/": {
            "get": {
                "summary": "Retrieve campaign",
                "description": "Get detailed information about a specific campaign including assignments, metrics, and notes.",
                "operationId": "retrieveCampaign",
                "tags": ["Campaigns"],
                "parameters": [
                    {
                        "name": "campaign_id",
                        "in": "path",
                        "required": True,
                        "description": "Campaign UUID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Campaign details",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CampaignDetail"}
                            }
                        }
                    },
                    "404": {"$ref": "#/components/responses/NotFound"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            },
            "patch": {
                "summary": "Update campaign",
                "description": "Update campaign information. Status transitions are validated according to business rules.",
                "operationId": "updateCampaign",
                "tags": ["Campaigns"],
                "parameters": [
                    {
                        "name": "campaign_id",
                        "in": "path",
                        "required": True,
                        "description": "Campaign UUID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/CampaignUpdate"},
                            "example": {
                                "name": "Updated Holiday Promotion 2024",
                                "description": "Updated campaign description",
                                "budget": "30000.00",
                                "status": "active"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Campaign updated successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CampaignDetail"}
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "404": {"$ref": "#/components/responses/NotFound"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            },
            "delete": {
                "summary": "Delete campaign",
                "description": "Delete a campaign. This action cannot be undone.",
                "operationId": "deleteCampaign",
                "tags": ["Campaigns"],
                "parameters": [
                    {
                        "name": "campaign_id",
                        "in": "path",
                        "required": True,
                        "description": "Campaign UUID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "responses": {
                    "204": {"description": "Campaign deleted successfully"},
                    "404": {"$ref": "#/components/responses/NotFound"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            }
        },
        "/campaigns/{campaign_id}/update_status/": {
            "post": {
                "summary": "Update campaign status",
                "description": "Update campaign status with validation of allowed transitions. A note will be automatically created to track the status change.",
                "operationId": "updateCampaignStatus",
                "tags": ["Campaigns"],
                "parameters": [
                    {
                        "name": "campaign_id",
                        "in": "path",
                        "required": True,
                        "description": "Campaign UUID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/CampaignStatusUpdate"},
                            "example": {
                                "status": "active",
                                "reason": "Starting the campaign as scheduled"
                            }
                        }
                    }
                },
                "responses": {
                    "200": {
                        "description": "Status updated successfully",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "message": {"type": "string"},
                                        "status": {"type": "string"}
                                    }
                                },
                                "example": {
                                    "message": "Campaign status updated to active",
                                    "status": "active"
                                }
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "404": {"$ref": "#/components/responses/NotFound"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            }
        },
        "/campaigns/{campaign_id}/metrics_summary/": {
            "get": {
                "summary": "Get campaign metrics summary",
                "description": "Retrieve aggregated metrics for a campaign including totals, averages, and calculated rates.",
                "operationId": "getCampaignMetricsSummary",
                "tags": ["Campaigns"],
                "parameters": [
                    {
                        "name": "campaign_id",
                        "in": "path",
                        "required": True,
                        "description": "Campaign UUID",
                        "schema": {"type": "string", "format": "uuid"}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "Metrics summary",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CampaignMetricsSummary"},
                                "example": {
                                    "total_impressions": 15000,
                                    "total_clicks": 1500,
                                    "total_conversions": 150,
                                    "total_spent": "8750.00",
                                    "average_ctr": "0.1000",
                                    "average_cvr": "0.1000",
                                    "average_cpc": "5.83",
                                    "average_cpm": "58.33",
                                    "budget_utilization": 58.33,
                                    "days_remaining": 45
                                }
                            }
                        }
                    },
                    "404": {"$ref": "#/components/responses/NotFound"},
                    "401": {"$ref": "#/components/responses/Unauthorized"},
                    "403": {"$ref": "#/components/responses/Forbidden"}
                }
            }
        },
        "/campaigns/dashboard_stats/": {
            "get": {
                "summary": "Get dashboard statistics",
                "description": "Retrieve overview statistics for all user campaigns for dashboard display.",
                "operationId": "getDashboardStats",
                "tags": ["Campaigns"],
                "responses": {
                    "200": {
                        "description": "Dashboard statistics",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/DashboardStats"},
                                "example": {
                                    "total_campaigns": 5,
                                    "active_campaigns": 3,
                                    "draft_campaigns": 1,
                                    "completed_campaigns": 1,
                                    "total_budget": "75000.00",
                                    "total_spent": "42500.00",
                                    "budget_utilization": 56.67,
                                    "soon_ending": 2,
                                    "over_budget": 1
                                }
                            }
                        }
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            }
        },
        "/assignments/": {
            "get": {
                "summary": "List assignments",
                "description": "Retrieve team member assignments for campaigns.",
                "operationId": "listAssignments",
                "tags": ["Assignments"],
                "responses": {
                    "200": {
                        "description": "List of assignments",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "count": {"type": "integer"},
                                        "next": {"type": "string", "nullable": True},
                                        "previous": {"type": "string", "nullable": True},
                                        "results": {
                                            "type": "array",
                                            "items": {"$ref": "#/components/schemas/CampaignAssignment"}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            },
            "post": {
                "summary": "Create assignment",
                "description": "Assign a team member to a campaign with a specific role.",
                "operationId": "createAssignment",
                "tags": ["Assignments"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/CampaignAssignmentCreate"},
                            "example": {
                                "campaign": "550e8400-e29b-41d4-a716-446655440000",
                                "user_id": 2,
                                "role": "analyst"
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "Assignment created successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CampaignAssignment"}
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            }
        },
        "/metrics/": {
            "get": {
                "summary": "List metrics",
                "description": "Retrieve campaign performance metrics.",
                "operationId": "listMetrics",
                "tags": ["Metrics"],
                "parameters": [
                    {
                        "name": "date",
                        "in": "query",
                        "description": "Filter by date",
                        "required": False,
                        "schema": {"type": "string", "format": "date"}
                    },
                    {
                        "name": "ordering",
                        "in": "query",
                        "description": "Order results",
                        "required": False,
                        "schema": {
                            "type": "string",
                            "enum": ["date", "-date", "recorded_at", "-recorded_at", "impressions", "-impressions", "clicks", "-clicks"]
                        }
                    }
                ],
                "responses": {
                    "200": {
                        "description": "List of metrics",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "count": {"type": "integer"},
                                        "next": {"type": "string", "nullable": True},
                                        "previous": {"type": "string", "nullable": True},
                                        "results": {
                                            "type": "array",
                                            "items": {"$ref": "#/components/schemas/CampaignMetric"}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            },
            "post": {
                "summary": "Create metric",
                "description": "Add performance metrics for a campaign.",
                "operationId": "createMetric",
                "tags": ["Metrics"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/CampaignMetricCreate"},
                            "example": {
                                "campaign": "550e8400-e29b-41d4-a716-446655440000",
                                "impressions": 1000,
                                "clicks": 100,
                                "conversions": 10,
                                "cost_per_click": "2.50",
                                "cost_per_impression": "0.25",
                                "cost_per_conversion": "25.00"
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "Metric created successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CampaignMetric"}
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            }
        },
        "/notes/": {
            "get": {
                "summary": "List notes",
                "description": "Retrieve campaign notes and comments. Private notes are only visible to the author.",
                "operationId": "listNotes",
                "tags": ["Notes"],
                "parameters": [
                    {
                        "name": "is_private",
                        "in": "query",
                        "description": "Filter by privacy",
                        "required": False,
                        "schema": {"type": "boolean"}
                    },
                    {
                        "name": "author",
                        "in": "query",
                        "description": "Filter by author ID",
                        "required": False,
                        "schema": {"type": "integer"}
                    }
                ],
                "responses": {
                    "200": {
                        "description": "List of notes",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "count": {"type": "integer"},
                                        "next": {"type": "string", "nullable": True},
                                        "previous": {"type": "string", "nullable": True},
                                        "results": {
                                            "type": "array",
                                            "items": {"$ref": "#/components/schemas/CampaignNote"}
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            },
            "post": {
                "summary": "Create note",
                "description": "Add a note or comment to a campaign.",
                "operationId": "createNote",
                "tags": ["Notes"],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/CampaignNoteCreate"},
                            "example": {
                                "campaign": "550e8400-e29b-41d4-a716-446655440000",
                                "title": "Performance Update",
                                "content": "Campaign is performing above expectations with 15% higher CTR than projected.",
                                "is_private": False
                            }
                        }
                    }
                },
                "responses": {
                    "201": {
                        "description": "Note created successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/CampaignNote"}
                            }
                        }
                    },
                    "400": {"$ref": "#/components/responses/BadRequest"},
                    "401": {"$ref": "#/components/responses/Unauthorized"}
                }
            }
        }
    },
    "components": {
        "schemas": {
            "User": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer", "description": "User ID"},
                    "username": {"type": "string", "description": "Username"},
                    "email": {"type": "string", "format": "email", "description": "Email address"},
                    "first_name": {"type": "string", "description": "First name"},
                    "last_name": {"type": "string", "description": "Last name"},
                    "full_name": {"type": "string", "description": "Full name"}
                },
                "required": ["id", "username", "email", "full_name"]
            },
            "CampaignList": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "format": "uuid", "description": "Campaign UUID"},
                    "name": {"type": "string", "description": "Campaign name"},
                    "description": {"type": "string", "description": "Campaign description"},
                    "campaign_type": {"type": "string", "enum": ["digital_display", "social_media", "search_engine", "video", "audio", "print", "outdoor", "influencer"]},
                    "campaign_type_display": {"type": "string", "description": "Human-readable campaign type"},
                    "status": {"type": "string", "enum": ["draft", "active", "paused", "completed", "cancelled"]},
                    "status_display": {"type": "string", "description": "Human-readable status"},
                    "budget": {"type": "string", "description": "Campaign budget"},
                    "spent_amount": {"type": "string", "description": "Amount spent so far"},
                    "budget_utilization": {"type": "number", "format": "float", "description": "Budget utilization percentage"},
                    "start_date": {"type": "string", "format": "date-time", "description": "Campaign start date"},
                    "end_date": {"type": "string", "format": "date-time", "description": "Campaign end date"},
                    "duration_days": {"type": "integer", "description": "Campaign duration in days"},
                    "owner": {"$ref": "#/components/schemas/User"},
                    "team_member_count": {"type": "integer", "description": "Number of team members"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"},
                    "is_active": {"type": "boolean"}
                },
                "required": ["id", "name", "campaign_type", "status", "budget", "owner", "created_at"]
            },
            "CampaignDetail": {
                "allOf": [
                    {"$ref": "#/components/schemas/CampaignList"},
                    {
                        "type": "object",
                        "properties": {
                            "is_running": {"type": "boolean", "description": "Whether campaign is currently running"},
                            "is_over_budget": {"type": "boolean", "description": "Whether campaign is over budget"},
                            "tags": {"type": "array", "items": {"type": "string"}, "description": "Campaign tags"},
                            "assignments": {"type": "array", "items": {"$ref": "#/components/schemas/CampaignAssignment"}},
                            "metrics": {"type": "array", "items": {"$ref": "#/components/schemas/CampaignMetric"}},
                            "notes": {"type": "array", "items": {"$ref": "#/components/schemas/CampaignNote"}},
                            "available_status_transitions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "value": {"type": "string"},
                                        "label": {"type": "string"}
                                    }
                                },
                                "description": "Available status transitions"
                            }
                        }
                    }
                ]
            },
            "CampaignCreate": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "minLength": 1, "maxLength": 200},
                    "description": {"type": "string"},
                    "campaign_type": {"type": "string", "enum": ["digital_display", "social_media", "search_engine", "video", "audio", "print", "outdoor", "influencer"]},
                    "budget": {"type": "string", "pattern": "^\\d+\\.\\d{2}$", "description": "Budget amount with 2 decimal places"},
                    "start_date": {"type": "string", "format": "date-time"},
                    "end_date": {"type": "string", "format": "date-time"},
                    "tags": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["name", "campaign_type", "budget", "start_date", "end_date"]
            },
            "CampaignUpdate": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "minLength": 1, "maxLength": 200},
                    "description": {"type": "string"},
                    "campaign_type": {"type": "string", "enum": ["digital_display", "social_media", "search_engine", "video", "audio", "print", "outdoor", "influencer"]},
                    "status": {"type": "string", "enum": ["draft", "active", "paused", "completed", "cancelled"]},
                    "budget": {"type": "string", "pattern": "^\\d+\\.\\d{2}$"},
                    "spent_amount": {"type": "string", "pattern": "^\\d+\\.\\d{2}$"},
                    "start_date": {"type": "string", "format": "date-time"},
                    "end_date": {"type": "string", "format": "date-time"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "is_active": {"type": "boolean"}
                }
            },
            "CampaignStatusUpdate": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["draft", "active", "paused", "completed", "cancelled"]},
                    "reason": {"type": "string", "maxLength": 500, "description": "Optional reason for status change"}
                },
                "required": ["status"]
            },
            "CampaignMetricsSummary": {
                "type": "object",
                "properties": {
                    "total_impressions": {"type": "integer"},
                    "total_clicks": {"type": "integer"},
                    "total_conversions": {"type": "integer"},
                    "total_spent": {"type": "string", "description": "Total amount spent"},
                    "average_ctr": {"type": "string", "description": "Average click-through rate"},
                    "average_cvr": {"type": "string", "description": "Average conversion rate"},
                    "average_cpc": {"type": "string", "description": "Average cost per click"},
                    "average_cpm": {"type": "string", "description": "Average cost per thousand impressions"},
                    "budget_utilization": {"type": "number", "format": "float"},
                    "days_remaining": {"type": "integer"}
                }
            },
            "DashboardStats": {
                "type": "object",
                "properties": {
                    "total_campaigns": {"type": "integer"},
                    "active_campaigns": {"type": "integer"},
                    "draft_campaigns": {"type": "integer"},
                    "completed_campaigns": {"type": "integer"},
                    "total_budget": {"type": "string"},
                    "total_spent": {"type": "string"},
                    "budget_utilization": {"type": "number", "format": "float"},
                    "soon_ending": {"type": "integer", "description": "Campaigns ending within 7 days"},
                    "over_budget": {"type": "integer", "description": "Campaigns over budget"}
                }
            },
            "CampaignAssignment": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "user": {"$ref": "#/components/schemas/User"},
                    "user_id": {"type": "integer", "description": "User ID for creation/update"},
                    "role": {"type": "string", "enum": ["owner", "manager", "analyst", "viewer"]},
                    "role_display": {"type": "string", "description": "Human-readable role"},
                    "assigned_at": {"type": "string", "format": "date-time"},
                    "is_active": {"type": "boolean"}
                },
                "required": ["id", "user", "role", "assigned_at", "is_active"]
            },
            "CampaignAssignmentCreate": {
                "type": "object",
                "properties": {
                    "campaign": {"type": "string", "format": "uuid"},
                    "user_id": {"type": "integer"},
                    "role": {"type": "string", "enum": ["owner", "manager", "analyst", "viewer"]}
                },
                "required": ["campaign", "user_id", "role"]
            },
            "CampaignMetric": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "campaign": {"type": "string", "format": "uuid"},
                    "impressions": {"type": "integer"},
                    "clicks": {"type": "integer"},
                    "conversions": {"type": "integer"},
                    "cost_per_click": {"type": "string"},
                    "cost_per_impression": {"type": "string"},
                    "cost_per_conversion": {"type": "string"},
                    "click_through_rate": {"type": "string", "description": "Calculated CTR"},
                    "conversion_rate": {"type": "string", "description": "Calculated CVR"},
                    "recorded_at": {"type": "string", "format": "date-time"},
                    "date": {"type": "string", "format": "date"}
                },
                "required": ["id", "campaign", "impressions", "clicks", "conversions", "recorded_at", "date"]
            },
            "CampaignMetricCreate": {
                "type": "object",
                "properties": {
                    "campaign": {"type": "string", "format": "uuid"},
                    "impressions": {"type": "integer", "minimum": 0},
                    "clicks": {"type": "integer", "minimum": 0},
                    "conversions": {"type": "integer", "minimum": 0},
                    "cost_per_click": {"type": "string", "pattern": "^\\d+\\.\\d{2}$"},
                    "cost_per_impression": {"type": "string", "pattern": "^\\d+\\.\\d{4}$"},
                    "cost_per_conversion": {"type": "string", "pattern": "^\\d+\\.\\d{2}$"}
                },
                "required": ["campaign", "impressions", "clicks", "conversions"]
            },
            "CampaignNote": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "campaign": {"type": "string", "format": "uuid"},
                    "title": {"type": "string", "maxLength": 200},
                    "content": {"type": "string"},
                    "is_private": {"type": "boolean"},
                    "author": {"$ref": "#/components/schemas/User"},
                    "author_name": {"type": "string", "description": "Author's full name"},
                    "created_at": {"type": "string", "format": "date-time"},
                    "updated_at": {"type": "string", "format": "date-time"}
                },
                "required": ["id", "campaign", "title", "content", "author", "created_at"]
            },
            "CampaignNoteCreate": {
                "type": "object",
                "properties": {
                    "campaign": {"type": "string", "format": "uuid"},
                    "title": {"type": "string", "maxLength": 200},
                    "content": {"type": "string"},
                    "is_private": {"type": "boolean", "default": False}
                },
                "required": ["campaign", "title", "content"]
            }
        },
        "responses": {
            "BadRequest": {
                "description": "Bad request - validation error",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "field_name": {
                                    "type": "array",
                                    "items": {"type": "string"}
                                }
                            }
                        },
                        "example": {
                            "name": ["This field is required."],
                            "budget": ["A valid number is required."]
                        }
                    }
                }
            },
            "Unauthorized": {
                "description": "Authentication required",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "detail": {"type": "string"}
                            }
                        },
                        "example": {
                            "detail": "Authentication credentials were not provided."
                        }
                    }
                }
            },
            "Forbidden": {
                "description": "Permission denied",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "detail": {"type": "string"}
                            }
                        },
                        "example": {
                            "detail": "You do not have permission to perform this action."
                        }
                    }
                }
            },
            "NotFound": {
                "description": "Resource not found",
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "properties": {
                                "detail": {"type": "string"}
                            }
                        },
                        "example": {
                            "detail": "Not found."
                        }
                    }
                }
            }
        },
        "securitySchemes": {
            "SessionAuthentication": {
                "type": "apiKey",
                "in": "cookie",
                "name": "sessionid"
            },
            "BasicAuthentication": {
                "type": "http",
                "scheme": "basic"
            }
        }
    },
    "tags": [
        {
            "name": "Campaigns",
            "description": "Campaign management operations"
        },
        {
            "name": "Assignments",
            "description": "Team member assignment operations"
        },
        {
            "name": "Metrics",
            "description": "Performance metrics operations"
        },
        {
            "name": "Notes",
            "description": "Campaign notes and comments"
        }
    ]
} 