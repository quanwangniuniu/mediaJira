import api from '../api';

// Retrospective task type definitions
export interface RetrospectiveTaskData {
  id: string; // UUID
  campaign: string; // Project ID (UUID)
  campaign_name: string;
  campaign_description?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'reported' | 'cancelled';
  status_display: string;
  scheduled_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  duration_formatted?: string | null;
  duration?: number | null; // Duration in seconds
  report_url?: string | null;
  report_generated_at?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  kpi_count: number;
  insight_count: number;
}


export interface CreateRetrospectiveData {
  campaign: string; // Project ID (UUID)
  scheduled_at?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'reported' | 'cancelled';
}

export interface ReportApprovalData {
  approved?: boolean;
  comments?: string;
}

export const RetrospectiveAPI = {
  // Create a new retrospective task
  createRetrospective: (data: CreateRetrospectiveData) =>
    api.post('/api/retrospective/retrospectives/', data),

  // Get all retrospectives with optional filters
  getRetrospectives: (params?: {
    status?: string;
    campaign?: string;
    created_by?: number;
  }) => api.get('/api/retrospective/retrospectives/', { params }),

  // Get a specific retrospective task
  getRetrospective: (id: string) =>
    api.get(`/api/retrospective/retrospectives/${id}/`),

  // Start retrospective analysis
  startAnalysis: (id: string) =>
    api.post(`/api/retrospective/retrospectives/${id}/start_analysis/`),

  // Generate report for retrospective
  generateReport: (id: string, format: 'pdf' | 'pptx' = 'pdf') =>
    api.post(`/api/retrospective/retrospectives/${id}/generate_report/`, {
      retrospective_id: id,
      format,
    }),

  // Approve retrospective report
  approveReport: (id: string, data: ReportApprovalData) =>
    api.post(`/api/retrospective/retrospectives/${id}/approve_report/`, {
      retrospective_id: id,
      ...data,
    }),
};

