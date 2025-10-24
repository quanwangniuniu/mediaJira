import { ReportData } from '@/types/report';

export const mockReports: ReportData[] = [
  {
    id: 123,
    title: 'Q4 Campaign Report',
    status: 'draft',
    approvals: [{ id: 'a1', status: 'pending', approver_name: 'Ray' }],
    export_config: { format: 'pdf', path: '/mock/report.pdf' },
  },
  {
    id: 456,
    title: 'Annual Performance Report',
    status: 'approved',
    approvals: [{ id: 'a2', status: 'approved', approver_name: 'Cindy' }],
    export_config: { format: 'pdf', path: '/mock/annual.pdf' },
  },
];
