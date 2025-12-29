import api from "../api";

export type WorkflowStatus = "draft" | "published" | "archived";

export interface WorkflowSummary {
  id: number;
  name: string;
  description?: string | null;
  project_id?: number | null;
  organization_id?: number | null;
  created_by_id?: number | null;
  status: WorkflowStatus;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowListParams {
  search?: string;
  status?: WorkflowStatus;
  ordering?: string;
  project_id?: number;
  creator?: number;
  page?: number;
  page_size?: number;
}

export interface WorkflowListResponse {
  results: WorkflowSummary[];
  count: number;
}

const normalizeWorkflowList = (data: any): WorkflowListResponse => {
  if (Array.isArray(data)) {
    return { results: data, count: data.length };
  }
  if (data && Array.isArray(data.results)) {
    return { results: data.results, count: data.count ?? data.results.length };
  }
  return { results: [], count: 0 };
};

export const WorkflowAPI = {
  list: async (params?: WorkflowListParams): Promise<WorkflowListResponse> => {
    const response = await api.get("/api/workflows/", { params });
    return normalizeWorkflowList(response.data);
  },

  retrieve: async (id: number): Promise<WorkflowSummary> => {
    const response = await api.get(`/api/workflows/${id}/`);
    return response.data as WorkflowSummary;
  },

  create: async (payload: Partial<WorkflowSummary> & { name?: string }): Promise<WorkflowSummary> => {
    const body: any = {
      name: payload.name ?? "New Workflow",
      description: payload.description ?? "",
      project_id: payload.project_id ?? null,
      status: payload.status ?? "draft",
    };
    const response = await api.post("/api/workflows/", body);
    return response.data as WorkflowSummary;
  },

  update: async (id: number, payload: Partial<WorkflowSummary>): Promise<WorkflowSummary> => {
    const response = await api.patch(`/api/workflows/${id}/`, payload);
    return response.data as WorkflowSummary;
  },

  duplicate: async (id: number): Promise<WorkflowSummary> => {
    const original = await WorkflowAPI.retrieve(id);
    const response = await api.post("/api/workflows/", {
      name: `${original.name} (copy)`,
      description: original.description ?? "",
      project_id: original.project_id ?? null,
      status: original.status ?? "draft",
    });
    return response.data as WorkflowSummary;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/workflows/${id}/`);
  },
};

