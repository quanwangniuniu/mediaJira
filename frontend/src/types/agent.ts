// Type definitions for AI Agent feature

// ==================== Session Types ====================

export interface AgentSession {
  id: string;
  project_id: number;
  created_by: number;
  title?: string | null;
  status?: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface AgentSessionDetail extends AgentSession {
  messages: AgentMessage[];
}

export interface UpdateSessionRequest {
  title?: string;
}

export interface CreateSessionRequest {
  project_id?: number;
}

// ==================== Message Types ====================

export type AgentMessageRole = 'user' | 'assistant';

export interface AgentMessage {
  id: string;
  session_id: number;
  role: AgentMessageRole;
  content: string;
  message_type?: string;
  created_at: string;
  data?: AgentMessageData | null;
}

export interface AgentMessageData {
  anomalies?: AnomalyItem[];
  decision_id?: number;
  task_ids?: number[];
  suggested_decision?: SuggestedDecision;
  recommended_tasks?: RecommendedTask[];
  file_id?: string;
  workflow_run_id?: string;
  session_id?: string;
  filename?: string;
  original_filename?: string;
  row_count?: number;
  column_count?: number;
}

// ==================== SSE Stream Types ====================

export type SSEEventType =
  | 'text'
  | 'analysis'
  | 'confirmation_request'
  | 'decision_draft'
  | 'task_created'
  | 'file_uploaded'
  | 'done'
  | 'error';

export interface SSEEvent {
  type: SSEEventType;
  content?: string;
  data?: AgentMessageData;
}

// ==================== Chat Request ====================

export type AgentAction = 'analyze' | 'confirm_decision' | 'create_tasks';

export interface AgentChatRequest {
  message: string;
  spreadsheet_id?: number;
  csv_filename?: string;
  action?: AgentAction;
}

// ==================== Analysis Types ====================

export type AnomalySeverity = 'critical' | 'warning' | 'info';

export interface AnomalyItem {
  metric: string;
  movement: string;
  severity: AnomalySeverity;
  current_value: number | string;
  previous_value: number | string;
  change_percent: number;
  campaign?: string | null;
  ad_set?: string | null;
  description: string;
}

// ==================== Spreadsheet Selector ====================

export interface AgentSpreadsheet {
  id: number;
  name: string;
  project_id: number;
  created_at: string;
  updated_at: string;
}

// ==================== UI State Types ====================

// ==================== Imported CSV File ====================

export interface ImportedCSVFile {
  id: string;
  filename: string;
  original_filename: string;
  row_count: number;
  column_count: number;
  file_size: number;
  created_at: string;
}

// ==================== Analysis Result Types ====================

export interface AnalysisResult {
  anomalies: AnomalyItem[];
  suggested_decision?: SuggestedDecision;
  recommended_tasks?: RecommendedTask[];
}

export interface SuggestedDecision {
  title: string;
  context_summary: string;
  reasoning: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  options: DecisionOption[];
}

export interface DecisionOption {
  text: string;
  order: number;
}

export interface RecommendedTask {
  type: string;
  summary: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
