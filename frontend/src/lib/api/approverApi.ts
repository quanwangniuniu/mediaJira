import { ApproverUser } from '@/types/approver';

const BASE_URL = '/api/access_control/approvers';

export const approverApi = {
  getAllUsers: async (): Promise<ApproverUser[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return await res.json();
  },
  getApprovers: async (module: string): Promise<ApproverUser[]> => {
    const res = await fetch(`${BASE_URL}/${module}/`);
    if (!res.ok) throw new Error('Failed to fetch approvers');
    return await res.json();
  },
  setApprovers: async (module: string, userIds: number[]): Promise<void> => {
    const res = await fetch(`${BASE_URL}/${module}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_ids: userIds }),
    });
    if (!res.ok) throw new Error('Failed to set approvers');
  },
  removeApprover: async (module: string, userId: number): Promise<void> => {
    const res = await fetch(`${BASE_URL}/${module}/${userId}/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove approver');
  },
};