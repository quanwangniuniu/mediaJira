import api from '../api';
import { mockReports } from '@/mock/mockReports';

// 🎯 Toggle this to switch between mock and real backend
const USE_MOCK_FALLBACK = false; // false = no fallback, true = fallback to mock on error

export const ReportAPI = {
  createReport: async (data: any) => {
    try {
      console.log('🔄 Creating report via backend...');
      const response = await api.post('/api/reports/reports/', data);
      console.log('✅ Backend report created successfully');
      return response;
    } catch (err) {
      console.error('❌ Backend report creation failed:', err);
      
      // ✅ Fall back to mock creation if backend fails
      if (USE_MOCK_FALLBACK) {
        console.log('🧩 Falling back to mock report creation');
        const newReport = {
          id: Date.now(),
          title: data.title,
          status: 'draft',
          approvals: [{ id: 'mock1', status: 'pending' }],
          export_config: { format: 'pdf', path: '/mock/report.pdf' },
          ...data
        };
        return Promise.resolve({ data: newReport });
      } else {
        throw err;
      }
    }
  },

  getReportById: (id: string | number) => api.get(`/api/reports/reports/${id}/`),

  submitReport: (id: string | number) => api.post(`/api/reports/reports/${id}/submit/`),

  approveReport: (
    id: string | number,
    action: 'approve' | 'reject',
    comment: string = ''
  ) =>
    api.post(`/api/reports/reports/${id}/approve/`, {
      action,
      comment,
    }),

  exportReport: (
    id: string | number,
    format: 'pdf' | 'html' = 'pdf',
    includeRawCsv: boolean = true
  ) =>
    api.post(`/api/reports/reports/${id}/export/`, {
      format,
      include_raw_csv: includeRawCsv,
    }),

  // New endpoints for file handling
  uploadCSV: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/reports/upload-csv/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  downloadPDF: (id: string | number) => 
    api.get(`/api/reports/reports/${id}/download-pdf/`, {
      responseType: 'blob',
    }),

  // Update report slice_config
  updateReport: (id: string | number, data: any) => 
    api.patch(`/api/reports/reports/${id}/`, data),
};

export default ReportAPI;
