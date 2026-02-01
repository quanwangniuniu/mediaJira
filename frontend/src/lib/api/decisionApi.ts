import api from '../api';
import type {
  DecisionCommitResponse,
  DecisionCommittedResponse,
  DecisionDraftResponse,
  DecisionOptionDraft,
  DecisionListResponse,
  DecisionSignal,
  DecisionSignalListResponse,
  DecisionReviewPayload,
} from '@/types/decision';

export interface DecisionDraftPayload {
  title?: string | null;
  contextSummary?: string | null;
  reasoning?: string | null;
  riskLevel?: string | null;
  confidenceScore?: number | null;
  options?: DecisionOptionDraft[];
}

export interface DecisionSignalPayload {
  metric: DecisionSignal['metric'];
  movement: DecisionSignal['movement'];
  period: DecisionSignal['period'];
  comparison?: DecisionSignal['comparison'];
  scopeType?: DecisionSignal['scopeType'] | null;
  scopeValue?: DecisionSignal['scopeValue'] | null;
  deltaValue?: DecisionSignal['deltaValue'] | null;
  deltaUnit?: DecisionSignal['deltaUnit'] | null;
  displayTextOverride?: DecisionSignal['displayTextOverride'] | null;
}

const withProject = (projectId?: number | null) => {
  if (!projectId) return {};
  return {
    headers: { 'x-project-id': projectId },
    params: { project_id: projectId },
  };
};

export const DecisionAPI = {
  createDraft: async (projectId: number) => {
    const response = await api.post<DecisionDraftResponse>(
      '/api/decisions/drafts/',
      {},
      withProject(projectId)
    );
    return response.data;
  },
  getDraft: async (decisionId: number, projectId?: number | null) => {
    const response = await api.get<DecisionDraftResponse>(
      `/api/decisions/drafts/${decisionId}/`,
      withProject(projectId)
    );
    return response.data;
  },
  patchDraft: async (
    decisionId: number,
    payload: DecisionDraftPayload,
    projectId?: number | null
  ) => {
    const response = await api.patch<DecisionDraftResponse>(
      `/api/decisions/drafts/${decisionId}/`,
      payload,
      withProject(projectId)
    );
    return response.data;
  },
  getDecision: async (decisionId: number, projectId?: number | null) => {
    const response = await api.get<DecisionCommittedResponse>(
      `/api/decisions/${decisionId}/`,
      withProject(projectId)
    );
    return response.data;
  },
  commit: async (decisionId: number, projectId?: number | null) => {
    const response = await api.post<DecisionCommitResponse>(
      `/api/decisions/${decisionId}/commit/`,
      {},
      withProject(projectId)
    );
    return response.data;
  },
  createReview: async (
    decisionId: number,
    payload: DecisionReviewPayload,
    projectId?: number | null
  ) => {
    const response = await api.post<DecisionCommitResponse>(
      `/api/decisions/${decisionId}/reviews/`,
      payload,
      withProject(projectId)
    );
    return response.data;
  },
  approve: async (decisionId: number, projectId?: number | null) => {
    const response = await api.post<DecisionCommitResponse>(
      `/api/decisions/${decisionId}/approve/`,
      {},
      withProject(projectId)
    );
    return response.data;
  },
  listDecisions: async (
    projectId: number,
    params?: { status?: string }
  ): Promise<DecisionListResponse> => {
    const base = withProject(projectId);
    const response = await api.get<DecisionListResponse>('/api/decisions/', {
      ...base,
      params: { ...(base as any).params, ...params },
    });
    return response.data;
  },
  listSignals: async (decisionId: number, projectId?: number | null) => {
    const response = await api.get<DecisionSignalListResponse>(
      `/api/decisions/${decisionId}/signals/`,
      withProject(projectId)
    );
    return response.data;
  },
  createSignal: async (
    decisionId: number,
    payload: DecisionSignalPayload,
    projectId?: number | null
  ) => {
    const response = await api.post<DecisionSignal>(
      `/api/decisions/${decisionId}/signals/`,
      payload,
      withProject(projectId)
    );
    return response.data;
  },
  updateSignal: async (
    decisionId: number,
    signalId: number,
    payload: Partial<DecisionSignalPayload>,
    projectId?: number | null
  ) => {
    const response = await api.patch<DecisionSignal>(
      `/api/decisions/${decisionId}/signals/${signalId}/`,
      payload,
      withProject(projectId)
    );
    return response.data;
  },
  deleteSignal: async (
    decisionId: number,
    signalId: number,
    projectId?: number | null
  ) => {
    const response = await api.delete(
      `/api/decisions/${decisionId}/signals/${signalId}/`,
      withProject(projectId)
    );
    return response.data;
  },
};
