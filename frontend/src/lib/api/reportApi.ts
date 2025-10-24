import api from '../api';

export const ReportAPI = {
  createReport: (data: any) => api.post('/api/reports/', data),

  getReportById: (id: string | number) => api.get(`/api/reports/${id}/`),

  submitReport: (id: string | number) => api.post(`/api/reports/${id}/submit/`),

  approveReport: (
    id: string | number,
    action: 'approve' | 'reject',
    comment: string = ''
  ) =>
    api.post(`/api/reports/${id}/approve/`, {
      action,
      comment,
    }),

  exportReport: (
    id: string | number,
    format: 'pdf' | 'html' = 'pdf',
    includeRawCsv: boolean = true
  ) =>
    api.post(`/api/reports/${id}/export/`, {
      format,
      include_raw_csv: includeRawCsv,
    }),
};

export default ReportAPI;
