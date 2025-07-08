// src/hooks/usePermissionData.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Organization, 
  Team, 
  Role, 
  Permission, 
  PermissionMatrix,
  PermissionFilters 
} from '@/types/permission';
import { PermissionAPI } from '@/lib/api/permissionApi';

// Hook 状态接口
interface PermissionDataState {
  organizations: Organization[];
  teams: Team[];
  roles: Role[];
  permissions: Permission[];
  permissionMatrix: PermissionMatrix;
  filters: PermissionFilters;
  loading: boolean;
  error: string | null;
  saving: boolean;
  hasUnsavedChanges: boolean;
}

// Hook 操作接口
interface PermissionDataActions {
  setFilters: (filters: Partial<PermissionFilters>) => void;
  updatePermission: (roleId: string, permissionId: string, granted: boolean) => void;
  savePermissions: () => Promise<void>;
  resetChanges: () => void;
  loadTeams: (organizationId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  copyRolePermissions: (fromRoleId: string, toRoleId: string) => Promise<void>;
  batchUpdatePermissions: (updates: { roleId: string; permissions: { permissionId: string; granted: boolean }[] }[]) => Promise<void>;
}

// Hook 返回值类型
interface UsePermissionDataReturn extends PermissionDataState, PermissionDataActions {
  // 计算属性
  selectedRole: Role | undefined;
  filteredTeams: Team[];
  isDataReady: boolean;
  changedPermissions: { permissionId: string; granted: boolean }[];
}

// 自定义 Hook 配置
interface UsePermissionDataOptions {
  autoLoadTeams?: boolean;
  autoSelectFirst?: boolean;
  enableAutoSave?: boolean;
  autoSaveDelay?: number;
}

export const usePermissionData = (options: UsePermissionDataOptions = {}): UsePermissionDataReturn => {
  const {
    autoLoadTeams = true,
    autoSelectFirst = true,
    enableAutoSave = false,
    autoSaveDelay = 2000
  } = options;

  // 状态管理
  const [state, setState] = useState<PermissionDataState>({
    organizations: [],
    teams: [],
    roles: [],
    permissions: [],
    permissionMatrix: {},
    filters: {
      organizationId: '',
      teamId: '',
      roleId: '',
    },
    loading: true,
    error: null,
    saving: false,
    hasUnsavedChanges: false,
  });

  // 原始权限矩阵 - 用于检测变更
  const [originalMatrix, setOriginalMatrix] = useState<PermissionMatrix>({});

  // 加载初始数据
  const loadInitialData = useCallback(async () => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, loading: true, error: null }));

        const orgsData = await PermissionAPI.getOrganizations();
        const rolesData = await PermissionAPI.getRoles();
        const permissionsData = await PermissionAPI.getPermissions();

      // 加载权限矩阵
      const rolePermissionsData = await PermissionAPI.getRolePermissions();
      const matrix = PermissionAPI.buildPermissionMatrix(rolePermissionsData);

      setState((prev: PermissionDataState) => ({
        ...prev,
        organizations: orgsData,
        roles: rolesData,
        permissions: permissionsData,
        permissionMatrix: matrix,
        loading: false,
      }));

      setOriginalMatrix(matrix);

      // 自动选择第一个组织
      if (autoSelectFirst && orgsData.length > 0) {
        setState((prev: PermissionDataState) => ({
          ...prev,
          filters: {
            ...prev.filters,
            organizationId: orgsData[0].id,
          },
        }));
      }

    } catch (error) {
      setState((prev: PermissionDataState) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
      }));
    }
  }, [autoSelectFirst]);

  // 加载团队数据
  const loadTeams = useCallback(async (organizationId: string) => {
    try {
      const teamsData = await PermissionAPI.getTeams(organizationId);
      setState((prev: PermissionDataState) => ({
        ...prev,
        teams: teamsData,
      }));

      // 自动选择第一个团队
      if (autoSelectFirst && teamsData.length > 0) {
        setState((prev: PermissionDataState) => ({
          ...prev,
          filters: {
            ...prev.filters,
            teamId: teamsData[0].id,
            roleId: '', // 重置角色选择
          },
        }));
      }

    } catch (error) {
      setState((prev: PermissionDataState) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load teams',
      }));
    }
  }, [autoSelectFirst]);

  // 筛选器更新
  const setFilters = useCallback((newFilters: Partial<PermissionFilters>) => {
    setState((prev: PermissionDataState) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  }, []);

  // 权限更新
  const updatePermission = useCallback((roleId: string, permissionId: string, granted: boolean) => {
    setState((prev: PermissionDataState) => {
      const newMatrix = {
        ...prev.permissionMatrix,
        [roleId]: {
          ...prev.permissionMatrix[roleId],
          [permissionId]: granted,
        },
      };

      const hasChanges = PermissionAPI.hasPermissionChanges(originalMatrix, newMatrix, roleId);

      return {
        ...prev,
        permissionMatrix: newMatrix,
        hasUnsavedChanges: hasChanges,
      };
    });
  }, [originalMatrix]);

  // 保存权限
  const savePermissions = useCallback(async () => {
    if (!state.filters.roleId || !state.hasUnsavedChanges) return;

    try {
      setState((prev: PermissionDataState) => ({ ...prev, saving: true, error: null }));

      const permissionsToSave = PermissionAPI.extractRolePermissions(
        state.permissionMatrix,
        state.filters.roleId
      );

      await PermissionAPI.updateRolePermissions(state.filters.roleId, permissionsToSave);

      // 更新原始矩阵
      setOriginalMatrix(state.permissionMatrix);

      setState((prev: PermissionDataState) => ({
        ...prev,
        saving: false,
        hasUnsavedChanges: false,
      }));

    } catch (error) {
      setState((prev: PermissionDataState) => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save permissions',
      }));
    }
  }, [state.filters.roleId, state.hasUnsavedChanges, state.permissionMatrix]);

  // 重置变更
  const resetChanges = useCallback(() => {
    setState((prev: PermissionDataState) => ({
      ...prev,
      permissionMatrix: originalMatrix,
      hasUnsavedChanges: false,
    }));
  }, [originalMatrix]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, loading: true, error: null }));

      const [orgsData, rolesData, permissionsData] = await Promise.all([
        PermissionAPI.getOrganizations(),
        PermissionAPI.getRoles(),
        PermissionAPI.getPermissions(),
      ]);

      // 加载权限矩阵
      const allRolePermissions = await PermissionAPI.getRolePermissions();
      const matrix = PermissionAPI.buildPermissionMatrix(allRolePermissions);

      setState((prev: PermissionDataState) => ({
        ...prev,
        organizations: orgsData,
        roles: rolesData,
        permissions: permissionsData,
        permissionMatrix: matrix,
        loading: false,
      }));

      setOriginalMatrix(matrix);

      // 重新加载团队数据
      if (state.filters.organizationId) {
        const teamsData = await PermissionAPI.getTeams(state.filters.organizationId);
        setState((prev: PermissionDataState) => ({
          ...prev,
          teams: teamsData,
        }));
      }

    } catch (error) {
      setState((prev: PermissionDataState) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh data',
      }));
    }
  }, [state.filters.organizationId]);

  // 复制角色权限
  const copyRolePermissions = useCallback(async (fromRoleId: string, toRoleId: string) => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, saving: true, error: null }));

      await PermissionAPI.copyRolePermissions(fromRoleId, toRoleId);
      
      // 刷新数据
      await refreshData();

      setState((prev: PermissionDataState) => ({ ...prev, saving: false }));

    } catch (error) {
      setState((prev: PermissionDataState) => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to copy permissions',
      }));
    }
  }, [refreshData]);

  // 批量更新权限
  const batchUpdatePermissions = useCallback(async (
    updates: { roleId: string; permissions: { permissionId: string; granted: boolean }[] }[]
  ) => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, saving: true, error: null }));

      await PermissionAPI.batchUpdateRolePermissions(updates);
      
      // 刷新数据
      await refreshData();

      setState((prev: PermissionDataState) => ({ ...prev, saving: false }));

    } catch (error) {
      setState((prev: PermissionDataState) => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to batch update permissions',
      }));
    }
  }, [refreshData]);

  // 计算属性
  const selectedRole = useMemo(() => {
    return state.roles.find(role => role.id === state.filters.roleId);
  }, [state.roles, state.filters.roleId]);

  const filteredTeams = useMemo(() => {
    return state.teams.filter(team => 
      !state.filters.organizationId || team.organizationId === state.filters.organizationId
    );
  }, [state.teams, state.filters.organizationId]);

  const isDataReady = useMemo(() => {
    return !state.loading && 
           state.organizations.length > 0 && 
           state.roles.length > 0 && 
           state.permissions.length > 0;
  }, [state.loading, state.organizations, state.roles, state.permissions]);

  const changedPermissions = useMemo(() => {
    if (!state.filters.roleId) return [];
    
    return PermissionAPI.extractRolePermissions(
      state.permissionMatrix,
      state.filters.roleId
    );
  }, [state.permissionMatrix, state.filters.roleId]);

  // 自动加载团队
  useEffect(() => {
    if (autoLoadTeams && state.filters.organizationId) {
      loadTeams(state.filters.organizationId);
    }
  }, [autoLoadTeams, state.filters.organizationId, loadTeams]);

  // 自动选择第一个角色
  useEffect(() => {
    if (autoSelectFirst && state.roles.length > 0 && !state.filters.roleId) {
      setState((prev: PermissionDataState) => ({
        ...prev,
        filters: {
          ...prev.filters,
          roleId: state.roles[0].id,
        },
      }));
    }
  }, [autoSelectFirst, state.roles, state.filters.roleId]);

  // 自动保存
  useEffect(() => {
    if (!enableAutoSave || !state.hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      savePermissions();
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [enableAutoSave, state.hasUnsavedChanges, autoSaveDelay, savePermissions]);

  // 初始化
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // 页面离开警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  return {
    // 状态
    ...state,
    
    // 计算属性
    selectedRole,
    filteredTeams,
    isDataReady,
    changedPermissions,
    
    // 操作方法
    setFilters,
    updatePermission,
    savePermissions,
    resetChanges,
    loadTeams,
    refreshData,
    copyRolePermissions,
    batchUpdatePermissions,
  };
};

// 导出类型供组件使用
export type { UsePermissionDataReturn, UsePermissionDataOptions };