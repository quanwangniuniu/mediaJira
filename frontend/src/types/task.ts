import { ReportData } from "./report";
// Task-related type definitions

// Type for getting an existing task
export interface TaskData {
  id?: number;
  owner?: UserSummary;
  project_id: number; // Required for creation
  type: "budget" | "asset" | "retrospective" | "report"; // Valid task types
  summary: string;
  description?: string;
  current_approver?: UserSummary; // For display (from API response)
  current_approver_id?: number;
  start_date?: string | null; // Date field
  due_date?: string; // Date field
  content_type?: string;
  object_id?: string;
  project?: ProjectSummary;
  status?:
    | "DRAFT"
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "LOCKED"
    | "CANCELLED";
  linked_object?: ReportData | any;
}

// Type for creating a new task (current_approver_id is user ID)
export interface CreateTaskData {
  project_id: number;
  type: "budget" | "asset" | "retrospective";
  summary: string;
  description?: string;
  current_approver_id?: number; // User ID for creation
  start_date?: string | null; // Date field
  due_date?: string;
}

export interface UserSummary {
  id: number;
  username: string;
  email: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
}

export interface TaskApprovalData {
  action: "approve" | "reject";
  comment?: string;
}

export interface TaskForwardData {
  next_approver_id: number;
  comment?: string;
}

export interface TaskLinkData {
  content_type: string;
  object_id: string;
}
