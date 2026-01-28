import api from '../api';
import type {
  DecisionCommitResponse,
  DecisionCommittedResponse,
  DecisionDraftResponse,
  DecisionOptionDraft,
} from '@/types/decision';

export interface DecisionDraftPayload {
  title?: string | null;
  contextSummary?: string | null;
  reasoning?: string | null;
  riskLevel?: string | null;
  confidenceScore?: number | null;
  options?: DecisionOptionDraft[];
}

const withProject = (projectId?: number | null) => {
  if (!projectId) return {};
  return {
    headers: { 'x-project-id': projectId },
    params: { project_id: projectId },
  };
};

export const DecisionAPI = {
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
};
