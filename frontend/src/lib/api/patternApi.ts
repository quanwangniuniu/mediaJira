import api from '../api';
import { CreatePatternPayload, ListPatternsResponse, WorkflowPatternSummary } from '@/types/patterns';

export const PatternAPI = {
  createPattern: async (payload: CreatePatternPayload): Promise<WorkflowPatternSummary> => {
    const response = await api.post<WorkflowPatternSummary>('/api/spreadsheet/patterns/', payload);
    return response.data;
  },

  listPatterns: async (): Promise<ListPatternsResponse> => {
    const response = await api.get<ListPatternsResponse>('/api/spreadsheet/patterns/');
    return response.data;
  },
};

