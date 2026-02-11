// Report Task types matching backend /api/report/reports/

export type ReportAudienceType =
  | "client"
  | "manager"
  | "internal_team"
  | "self"
  | "other";

export interface PromptTemplateDefinition {
  version: string;
  tone: string;
  section_prompts: {
    context: string;
    key_actions: string;
    outcome_summary: string;
    narrative_explanation: string;
  };
  suggested_key_actions?: string[];
}

export interface ReportTaskKeyAction {
  id: number;
  report_task: number;
  order_index: number;
  action_text: string;
  created_at: string;
  updated_at: string;
}

export interface ReportContext {
  reporting_period?: {
    type: "last_week" | "this_month" | "custom" | null;
    text: string;
    start_date?: string;
    end_date?: string;
  } | null;
  situation: string;
  what_changed: string;
}

export interface ReportTask {
  id: number;
  task: number;
  audience_type: ReportAudienceType;
  audience_details: string;
  audience_prompt_version?: string;
  prompt_template?: PromptTemplateDefinition;
  context: ReportContext;
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
  context: ReportContext;
  outcome_summary: string;
  narrative_explanation?: string;
}

export interface ReportTaskUpdateRequest {
  audience_type?: ReportAudienceType;
  audience_details?: string;
  context?: ReportContext;
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
