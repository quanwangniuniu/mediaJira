// Report Task types matching backend /api/report/reports/

export type ReportAudienceType =
  | "client"
  | "manager"
  | "internal_team"
  | "self"
  | "other";

export interface ReportTaskKeyAction {
  id: number;
  report_task: number;
  order_index: number;
  action_text: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTask {
  id: number;
  task: number;
  audience_type: ReportAudienceType;
  audience_details: string;
  audience_prompt_version?: string;
  prompt_template?: Record<string, unknown>;
  context: string;
  outcome_summary: string;
  narrative_explanation: string;
  key_actions: ReportTaskKeyAction[];
  is_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportTaskCreateRequest {
  task: number;
  audience_type: ReportAudienceType;
  audience_details?: string;
  context: string;
  outcome_summary: string;
  narrative_explanation?: string;
}

export interface ReportTaskUpdateRequest {
  audience_type?: ReportAudienceType;
  audience_details?: string;
  context?: string;
  outcome_summary?: string;
  narrative_explanation?: string;
}

export interface ReportKeyActionCreateRequest {
  order_index: number;
  action_text: string;
}

export interface ReportKeyActionUpdateRequest {
  order_index?: number;
  action_text?: string;
}
