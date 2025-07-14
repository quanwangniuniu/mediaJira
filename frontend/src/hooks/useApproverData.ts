import { useState, useEffect, useCallback } from 'react';
import { approverApi } from '@/lib/api/approverApi';
import { Module, User, ApproverFilter } from '@/types/approver';

export const useApproverData = (filter: ApproverFilter = {}) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [approvers, setApprovers] = useState<Record<string, User[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch original data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [modulesData, usersData] = await Promise.all([
        approverApi.getModules(),
        approverApi.getUsers(filter)
      ]);

      setModules(modulesData);
      setUsers(usersData);

      // loading approvers for modules
      const approversData: Record<string, User[]> = {};
      await Promise.all(
        modulesData.map(async (module) => {
          const moduleApprovers = await approverApi.getModuleApprovers(module.id);
          approversData[module.id] = moduleApprovers;
        })
      );

      setApprovers(approversData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // update approvers of modules
  const updateModuleApprovers = useCallback(async (moduleId: string, selectedUsers: User[]) => {
    try {
      const userIds = selectedUsers.map(user => user.id);
      await approverApi.updateModuleApprovers(moduleId, userIds);
      
      setApprovers(prev => ({
        ...prev,
        [moduleId]: selectedUsers
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update approvers');
      throw err;
    }
  }, []);

  // saved by group
  const saveAll = useCallback(async () => {
    try {
      const updates: Record<string, number[]> = {};
      Object.entries(approvers).forEach(([moduleId, users]) => {
        updates[moduleId] = users.map(user => user.id);
      });
      
      await approverApi.bulkUpdateApprovers(updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      throw err;
    }
  }, [approvers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    modules,
    users,
    approvers,
    loading,
    error,
    updateModuleApprovers,
    saveAll,
    refetch: loadData
  };
};