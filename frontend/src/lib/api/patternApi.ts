import api from '../api';
import {
  CreatePatternPayload,
  ListPatternsResponse,
  ApplyPatternResponse,
  PatternJobResponse,
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

  deletePattern: async (patternId: string): Promise<void> => {
    await api.delete(`/api/spreadsheet/patterns/${patternId}/`);
  },

  applyPattern: async (
    patternId: string,
    payload: { spreadsheet_id: number; sheet_id: number }
  ): Promise<ApplyPatternResponse> => {
    const response = await api.post<ApplyPatternResponse>(`/api/spreadsheet/patterns/${patternId}/apply/`, payload);
    return response.data;
  },

  getPatternJob: async (jobId: string): Promise<PatternJobResponse> => {
    const response = await api.get<PatternJobResponse>(`/api/spreadsheet/pattern-jobs/${jobId}/`);
    return response.data;
  },
};

