import { ReportData } from "./report";

// Type for getting an existing task
export interface TaskData {
  id?: number;
  owner?: UserSummary;
  project_id: number; // Required for creation
  type: "budget" | "asset" | "retrospective" | "report" | "scaling" | "alert"; // Valid task types
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
  is_subtask?: boolean; // Indicates if this task is a subtask
  parent_relationship?: any; // Parent relationship if this is a subtask
  order_in_project?: number; // Order of task within its project
}

// Type for creating a new task (current_approver_id is user ID)
export interface CreateTaskData {
  project_id: number;
  type: "budget" | "asset" | "retrospective" | "report" | "scaling" | "alert";
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

// Represents a single task-level comment returned by the backend
export interface TaskComment {
  id: number;
  task: number;
  user: UserSummary;
  body: string;
  created_at: string;
}

// Task relation types
export interface TaskRelationItem {
  relation_id: number;
  task: TaskData;
}

export interface TaskRelationsResponse {
  causes: TaskRelationItem[];
  is_caused_by: TaskRelationItem[];
  blocks: TaskRelationItem[];
  is_blocked_by: TaskRelationItem[];
  clones: TaskRelationItem[];
  is_cloned_by: TaskRelationItem[];
  relates_to: TaskRelationItem[];
}

export interface TaskRelationAddRequest {
  target_task_id: number;
  relationship_type: 'causes' | 'blocks' | 'clones' | 'relates_to';
}

// Represents a single task-level attachment returned by the backend
export interface TaskAttachment {
  id: number;
  task: number;
  file: string; // URL to the file
  original_filename: string;
  file_size: number;
  content_type: string;
  checksum: string;
  scan_status: 'pending' | 'scanning' | 'clean' | 'infected' | 'error_scanning';
  uploaded_by: UserSummary;
  created_at: string;
}
