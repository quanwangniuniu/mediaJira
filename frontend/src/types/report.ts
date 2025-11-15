// src/types/report.ts

export interface ReportApprovalData {
  id?: string;
  status?: 'pending' | 'approved' | 'rejected';
  approver_id?: string;
  approver_name?: string;
  comment?: string;
  decided_at?: string;
}

export interface ReportExportConfig {
  format?: 'pdf' | 'html';
  path?: string; // e.g. absolute path or file_url
}

export interface ReportData {
  id: string | number;
  title: string;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  owner_id?: string;
  time_range_start?: string;
  time_range_end?: string;
  slice_config?: Record<string, any>;
  export_config?: ReportExportConfig;
  approvals?: ReportApprovalData[]; // multiple approvals from backend
}
