import { TaskData } from '@/types/task';
import { mockReports } from '@/mock/mockReports';

export const mockTasks: TaskData[] = [
  {
    id: 1,
    summary: 'Draft Performance Report',
    description: 'Draft Performance Report.',
    status: 'SUBMITTED',
    type: 'report',
    content_type: 'report',
    object_id: '123', // links to Report #123
    due_date: '2025-10-01',
    owner: {
      id: 1,
      username: 'Ariel',
      email: 'ariel@example.com',
    },
    current_approver: {
      id: 2,
      username: 'Ray',
      email: 'ray@example.com',
    },
    project_id: 101,
    project: {
      id: 101,
      name: 'Q4 Campaign',
    },
    linked_object: mockReports[0],
  },
  {
    id: 2,
    summary: 'Finalize Report Export',
    description: 'Verify export format and schedule before sending to client.',
    status: 'APPROVED',
    type: 'report',
    content_type: 'report',
    object_id: '123', // same Report #123
    due_date: '2024-12-15',
    owner: {
      id: 3,
      username: 'Ariel',
      email: 'ariel@example.com',
    },
    current_approver: {
      id: 4,
      username: 'Ray',
      email: 'ray@example.com',
    },
    project_id: 99,
    project: {
      id: 99,
      name: 'Annual Report Export',
    },
    linked_object: mockReports[1],
  },
];
