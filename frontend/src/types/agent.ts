// Type definitions for AI Agent feature

// ==================== Session Types ====================

export interface AgentSession {
  id: number;
  project_id: number;
  created_by: number;
  title?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentSessionDetail extends AgentSession {
  messages: AgentMessage[];
}

export interface CreateSessionRequest {
  project_id: number;
}

// ==================== Message Types ====================

export type AgentMessageRole = 'user' | 'assistant';

export interface AgentMessage {
  id: number;
  session_id: number;
  role: AgentMessageRole;
  content: string;
  created_at: string;
  data?: AgentMessageData | null;
}

export interface AgentMessageData {
  anomalies?: AnomalyItem[];
  decision_id?: number;
  task_ids?: number[];
}

// ==================== SSE Stream Types ====================

export type SSEEventType =
  | 'text'
  | 'analysis'
  | 'decision_draft'
  | 'task_created'
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

export interface AgentChatState {
  sessions: AgentSession[];
  currentSessionId: number | null;
  messages: AgentMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingEvents: SSEEvent[];
  error: string | null;
}

export type DataPanelTab = 'spreadsheet' | 'decisions' | 'tasks';
