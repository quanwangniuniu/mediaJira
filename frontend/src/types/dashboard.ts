// Dashboard data types

export interface DashboardUser {
  id: number;
  username: string;
  email: string;
}

export interface DashboardTask {
  id: number;
  key: string; // e.g., "SMP-376"
  summary: string;
  status: string;
  type: string;
  priority: string;
}

export interface ActivityEvent {
  id: string;
  event_type: 'task_created' | 'approved' | 'rejected' | 'commented' | 'task_updated';
  user: DashboardUser;
  task: DashboardTask;
  timestamp: string;
  human_readable: string;
  // Optional fields for specific event types
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  is_approved?: boolean;
  comment_body?: string;
}

export interface StatusBreakdown {
  status: string;
  display_name: string;
  count: number;
  color?: string;
}

export interface PriorityBreakdown {
  priority: string;
  count: number;
}

export interface TypeBreakdown {
  type: string;
  display_name: string;
  count: number;
  percentage: number;
}

export interface TimeMetrics {
  completed_last_7_days: number;
  updated_last_7_days: number;
  created_last_7_days: number;
  due_soon: number;
}

export interface StatusOverview {
  total_work_items: number;
  breakdown: StatusBreakdown[];
}

export interface DashboardSummary {
  time_metrics: TimeMetrics;
  status_overview: StatusOverview;
  priority_breakdown: PriorityBreakdown[];
  types_of_work: TypeBreakdown[];
  recent_activity: ActivityEvent[];
}
