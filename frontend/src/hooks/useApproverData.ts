import { useState, useEffect, useCallback } from 'react';
import { approverApi } from '@/lib/api/approverApi';
import { ApproverUser } from '@/types/approver';

export const useApproverData = (permissionId: string | number) => {
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
        approverApi.getApprovers(permissionId)
      ]);
      setUsers(allUsers);
      setApprovers(currentApprovers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [permissionId]);

  const setApproversForPermission = useCallback(async (userIds: number[]) => {
    setLoading(true);
    setError(null);
    try {
      await approverApi.setApprovers(permissionId, userIds);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set approvers');
    } finally {
      setLoading(false);
    }
  }, [permissionId, loadData]);

  const removeApprover = useCallback(async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      await approverApi.removeApprover(permissionId, userId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove approver');
    } finally {
      setLoading(false);
    }
  }, [permissionId, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    users,
    approvers,
    loading,
    error,
    setApprovers: setApproversForPermission,
    removeApprover,
    refetch: loadData
  };
};