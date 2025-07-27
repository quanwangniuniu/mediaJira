import { useState, useEffect, useCallback } from 'react';
import { approverApi } from '@/lib/api/approverApi';
import { ApproverUser } from '@/types/approver';

export const useApproverData = (module: string) => {
  const [users, setUsers] = useState<ApproverUser[]>([]);
  const [approvers, setApprovers] = useState<ApproverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allUsers, currentApprovers] = await Promise.all([
        approverApi.getAllUsers(),
        approverApi.getApprovers(module),
      ]);
      setUsers(allUsers);
      setApprovers(currentApprovers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [module]);

  const setApproversForModule = useCallback(async (userIds: number[]) => {
    await approverApi.setApprovers(module, userIds);
    await loadData();
  }, [module, loadData]);

  const removeApprover = useCallback(async (userId: number) => {
    await approverApi.removeApprover(module, userId);
    await loadData();
  }, [module, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    users,
    approvers,
    loading,
    error,
    setApprovers: setApproversForModule,
    removeApprover,
    refetch: loadData,
  };
};