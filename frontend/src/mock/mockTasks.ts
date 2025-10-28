import { TaskData } from '@/types/task';
import { mockReports } from '@/mock/mockReports';

export const mockTasks: TaskData[] = [
  {
    id: 1,
    summary: 'Draft Performance Report',
    description: 'Create a comprehensive performance report for Q4 campaign analysis.',
    status: 'SUBMITTED',
    type: 'report',
    content_type: 'report',
    object_id: '1',
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
    object_id: '2',
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
  {
    id: 3,
    summary: 'Budget Request for Q4 Campaign',
    description: 'Request additional budget for Q4 marketing campaign.',
    status: 'UNDER_REVIEW',
    type: 'budget',
    content_type: 'budgetrequest',
    object_id: '101',
    due_date: '2025-01-15',
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
  },
  {
    id: 4,
    summary: 'Asset Creation for Social Media',
    description: 'Create visual assets for social media campaign.',
    status: 'DRAFT',
    type: 'asset',
    content_type: 'asset',
    object_id: '201',
    due_date: '2025-02-01',
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
    project_id: 102,
    project: {
      id: 102,
      name: 'Social Media Campaign',
    },
  },
];
