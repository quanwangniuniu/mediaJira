import { ReportData } from '@/types/report';

export const mockReports: ReportData[] = [
  {
    id: 1,
    title: 'Q4 Campaign Report',
    status: 'draft',
    approvals: [{ id: 'a1', status: 'pending', approver_name: 'Ray' }],
    export_config: { format: 'pdf', path: '/mock/report.pdf' },
  },
  {
    id: 2,
    title: 'Annual Performance Report',
    status: 'approved',
    approvals: [{ id: 'a2', status: 'approved', approver_name: 'Cindy' }],
    export_config: { format: 'pdf', path: '/mock/annual.pdf' },
  },
  {
    id: 3,
    title: 'Marketing Analytics Report',
    status: 'in_review',
    approvals: [{ id: 'a3', status: 'pending', approver_name: 'Sarah' }],
    export_config: { format: 'pdf', path: '/mock/marketing.pdf' },
  },
];
