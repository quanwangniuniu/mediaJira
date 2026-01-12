import api from "../api";

export interface AlertTask {
  id: number;
  task: number;
  alert_type:
    | "spend_spike"
    | "policy_violation"
    | "performance_drop"
    | "delivery_issue"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  affected_entities?: Record<string, any>[];
  initial_metrics?: Record<string, any>;
  acknowledged_by?: number | null;
  acknowledged_at?: string | null;
  assigned_to?: number | null;
  status:
    | "open"
    | "acknowledged"
    | "in_progress"
    | "mitigated"
    | "resolved"
    | "closed";
  investigation_notes?: string;
  resolution_steps?: string;
  related_references?: string[];
  postmortem_root_cause?: string;
  postmortem_prevention?: string;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertTaskCreateRequest {
  task: number;
  alert_type:
    | "spend_spike"
    | "policy_violation"
    | "performance_drop"
    | "delivery_issue"
    | "other";
  severity: "low" | "medium" | "high" | "critical";
  affected_entities?: Record<string, any>[];
  initial_metrics?: Record<string, any>;
  acknowledged_by?: number | null;
  acknowledged_at?: string | null;
  assigned_to?: number | null;
  status?: AlertTask["status"];
  investigation_notes?: string;
  resolution_steps?: string;
  related_references?: string[];
  postmortem_root_cause?: string;
  postmortem_prevention?: string;
  resolved_at?: string | null;
}

export interface AlertTaskUpdateRequest
  extends Omit<Partial<AlertTaskCreateRequest>, "task"> {}

export const AlertingAPI = {
  listAlertTasks: (params?: { task_id?: number; status?: string }) =>
    api.get<AlertTask[]>("/api/alerting/alert-tasks/", { params }),

  createAlertTask: (data: AlertTaskCreateRequest) =>
    api.post<AlertTask>("/api/alerting/alert-tasks/", data),

  getAlertTask: (id: number) =>
    api.get<AlertTask>(`/api/alerting/alert-tasks/${id}/`),

  updateAlertTask: (id: number, data: AlertTaskUpdateRequest) =>
    api.patch<AlertTask>(`/api/alerting/alert-tasks/${id}/`, data),
};
