// SMP-472: Project Workspace Dashboard API client
import api from '../api';

// ── Type definitions ────────────────────────────────────────────────────────

export interface WorkspaceDecision {
  id: number;
  title: string | null;
  status: string;
  risk_level: string | null;
  updated_at: string;
}

export interface WorkspaceTask {
  id: number;
  summary: string;
  status: string;
  priority: string;
  type: string;
  due_date: string | null;
  updated_at: string;
}

export interface WorkspaceSpreadsheet {
  id: number;
  name: string;
  updated_at: string;
}

export interface WorkspaceDashboardData {
  decisions: WorkspaceDecision[];
  tasks: WorkspaceTask[];
  spreadsheets: WorkspaceSpreadsheet[];
}

// ── API call ────────────────────────────────────────────────────────────────

export const WorkspaceAPI = {
  /**
   * Fetch the project workspace dashboard summary.
   * Returns decisions, tasks, and spreadsheets scoped to the given project.
   */
  getWorkspaceDashboard: (projectId: number): Promise<WorkspaceDashboardData> => {
    return api
      .get<WorkspaceDashboardData>('/api/dashboard/workspace/', {
        params: { project_id: projectId },
      })
      .then((response) => response.data);
  },
};