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

import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowNodeCreate,
  WorkflowConnection,
  WorkflowConnectionCreate,
  BatchNodeOperation,
  BatchNodeResult,
  BatchConnectionOperation,
  BatchConnectionResult,
  ValidationResult,
  WorkflowRule,
  WorkflowRuleCreate,
  RuleTypesResponse,
  WorkflowDetail,
} from "@/types/workflow";

export type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowConnection,
};

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

  validate: async (id: number): Promise<ValidationResult> => {
    const response = await api.post(`/api/workflows/${id}/validate/`);
    return response.data as ValidationResult;
  },

  getGraph: async (workflowId: number): Promise<WorkflowGraph> => {
    const response = await api.get(`/api/workflows/${workflowId}/graph/`);
    return response.data as WorkflowGraph;
  },

  getNodes: async (workflowId: number): Promise<WorkflowNode[]> => {
    const response = await api.get(`/api/workflows/${workflowId}/nodes/`);
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  getNode: async (workflowId: number, nodeId: number): Promise<WorkflowNode> => {
    const response = await api.get(`/api/workflows/${workflowId}/nodes/${nodeId}/`);
    return response.data as WorkflowNode;
  },

  createNode: async (workflowId: number, payload: WorkflowNodeCreate): Promise<WorkflowNode> => {
    const response = await api.post(`/api/workflows/${workflowId}/nodes/`, payload);
    return response.data as WorkflowNode;
  },

  updateNode: async (
    workflowId: number,
    nodeId: number,
    payload: Partial<WorkflowNodeCreate>
  ): Promise<WorkflowNode> => {
    const response = await api.patch(`/api/workflows/${workflowId}/nodes/${nodeId}/`, payload);
    return response.data as WorkflowNode;
  },

  deleteNode: async (workflowId: number, nodeId: number): Promise<void> => {
    await api.delete(`/api/workflows/${workflowId}/nodes/${nodeId}/`);
  },

  getConnections: async (workflowId: number): Promise<WorkflowConnection[]> => {
    const response = await api.get(`/api/workflows/${workflowId}/connections/`);
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  getConnection: async (workflowId: number, connectionId: number): Promise<WorkflowConnection> => {
    const response = await api.get(`/api/workflows/${workflowId}/connections/${connectionId}/`);
    return response.data as WorkflowConnection;
  },

  createConnection: async (
    workflowId: number,
    payload: WorkflowConnectionCreate
  ): Promise<WorkflowConnection> => {
    const response = await api.post(`/api/workflows/${workflowId}/connections/`, payload);
    return response.data as WorkflowConnection;
  },

  updateConnection: async (
    workflowId: number,
    connectionId: number,
    payload: Partial<WorkflowConnectionCreate>
  ): Promise<WorkflowConnection> => {
    const response = await api.patch(
      `/api/workflows/${workflowId}/connections/${connectionId}/`,
      payload
    );
    return response.data as WorkflowConnection;
  },

  deleteConnection: async (workflowId: number, connectionId: number): Promise<void> => {
    await api.delete(`/api/workflows/${workflowId}/connections/${connectionId}/`);
  },

  batchNodes: async (workflowId: number, operations: BatchNodeOperation): Promise<BatchNodeResult> => {
    const response = await api.post(`/api/workflows/${workflowId}/nodes/batch/`, operations);
    return response.data as BatchNodeResult;
  },

  batchConnections: async (
    workflowId: number,
    operations: BatchConnectionOperation
  ): Promise<BatchConnectionResult> => {
    const response = await api.post(`/api/workflows/${workflowId}/connections/batch/`, operations);
    return response.data as BatchConnectionResult;
  },

  // ========================================
  // Workflow Rule API Methods
  // ========================================

  getRules: async (workflowId: number, connectionId: number): Promise<WorkflowRule[]> => {
    const response = await api.get(
      `/api/workflows/${workflowId}/connections/${connectionId}/rules/`
    );
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  },

  getRule: async (
    workflowId: number,
    connectionId: number,
    ruleId: number
  ): Promise<WorkflowRule> => {
    const response = await api.get(
      `/api/workflows/${workflowId}/connections/${connectionId}/rules/${ruleId}/`
    );
    return response.data as WorkflowRule;
  },

  getRuleTypes: async (workflowId: number, connectionId: number): Promise<RuleTypesResponse> => {
    const response = await api.get(
      `/api/workflows/${workflowId}/connections/${connectionId}/rules/types/`
    );
    return response.data as RuleTypesResponse;
  },

  createRule: async (
    workflowId: number,
    connectionId: number,
    payload: WorkflowRuleCreate
  ): Promise<WorkflowRule> => {
    const response = await api.post(
      `/api/workflows/${workflowId}/connections/${connectionId}/rules/`,
      payload
    );
    return response.data as WorkflowRule;
  },

  updateRule: async (
    workflowId: number,
    connectionId: number,
    ruleId: number,
    payload: Partial<WorkflowRuleCreate>
  ): Promise<WorkflowRule> => {
    const response = await api.patch(
      `/api/workflows/${workflowId}/connections/${connectionId}/rules/${ruleId}/`,
      payload
    );
    return response.data as WorkflowRule;
  },

  deleteRule: async (workflowId: number, connectionId: number, ruleId: number): Promise<void> => {
    await api.delete(`/api/workflows/${workflowId}/connections/${connectionId}/rules/${ruleId}/`);
  },

  // ========================================
  // Enhanced Workflow Detail Method
  // ========================================

  getWorkflowDetail: async (workflowId: number): Promise<WorkflowDetail> => {
    const [workflow, nodes, connections] = await Promise.all([
      WorkflowAPI.retrieve(workflowId),
      WorkflowAPI.getNodes(workflowId),
      WorkflowAPI.getConnections(workflowId),
    ]);

    return {
      ...workflow,
      nodes,
      connections,
    };
  },
};
