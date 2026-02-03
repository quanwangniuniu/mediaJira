import api from '../api';
import {
  CreatePatternPayload,
  ListPatternsResponse,
  WorkflowPatternDetail,
  WorkflowPatternSummary,
} from '@/types/patterns';

export const PatternAPI = {
  createPattern: async (payload: CreatePatternPayload): Promise<WorkflowPatternSummary> => {
    const response = await api.post<WorkflowPatternSummary>('/api/spreadsheet/patterns/', payload);
    return response.data;
  },

  listPatterns: async (): Promise<ListPatternsResponse> => {
    const response = await api.get<ListPatternsResponse>('/api/spreadsheet/patterns/');
    return response.data;
  },

  getPattern: async (patternId: string): Promise<WorkflowPatternDetail> => {
    const response = await api.get<WorkflowPatternDetail>(`/api/spreadsheet/patterns/${patternId}/`);
    return response.data;
  },
};

