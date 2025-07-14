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

// 
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

// 
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

// Hook return
interface UsePermissionDataReturn extends PermissionDataState, PermissionDataActions {
  selectedRole: Role | undefined;
  filteredTeams: Team[];
  isDataReady: boolean;
  changedPermissions: { permissionId: string; granted: boolean }[];
}

// Hook
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

  // usestate
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

  // original permission matrix
  const [originalMatrix, setOriginalMatrix] = useState<PermissionMatrix>({});

  // load original data
  const loadInitialData = useCallback(async () => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, loading: true, error: null }));

      const orgsData = await PermissionAPI.getOrganizations();
      const rolesData = await PermissionAPI.getRoles();
      const permissionsData = await PermissionAPI.getPermissions();

      // load permissions matrix
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

      // choose the first organization
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

  // loading teams data
  const loadTeams = useCallback(async (organizationId: string) => {
    try {
      const teamsData = await PermissionAPI.getTeams(organizationId);
      setState((prev: PermissionDataState) => ({
        ...prev,
        teams: teamsData,
      }));

      // choose the first team
      if (autoSelectFirst && teamsData.length > 0) {
        setState((prev: PermissionDataState) => ({
          ...prev,
          filters: {
            ...prev.filters,
            teamId: teamsData[0].id,
            roleId: '', 
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

  // update select filter
  const setFilters = useCallback((newFilters: Partial<PermissionFilters>) => {
    setState((prev: PermissionDataState) => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  }, []);

  // update permissions
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

  // save permissions
  const savePermissions = useCallback(async () => {
    if (!state.filters.roleId || !state.hasUnsavedChanges) return;

    try {
      setState((prev: PermissionDataState) => ({ ...prev, saving: true, error: null }));

      const permissionsToSave = PermissionAPI.extractRolePermissions(
        state.permissionMatrix,
        state.filters.roleId
      );

      await PermissionAPI.updateRolePermissions(state.filters.roleId, permissionsToSave);

      // update matrix
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

  // reset changes
  const resetChanges = useCallback(() => {
    setState((prev: PermissionDataState) => ({
      ...prev,
      permissionMatrix: originalMatrix,
      hasUnsavedChanges: false,
    }));
  }, [originalMatrix]);

  // refresh data
  const refreshData = useCallback(async () => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, loading: true, error: null }));

      const [orgsData, rolesData, permissionsData] = await Promise.all([
        PermissionAPI.getOrganizations(),
        PermissionAPI.getRoles(),
        PermissionAPI.getPermissions(),
      ]);

      // loading permission matrix
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

      // reloading teams data
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

  // copy role permissions
  const copyRolePermissions = useCallback(async (fromRoleId: string, toRoleId: string) => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, saving: true, error: null }));

      await PermissionAPI.copyRolePermissions(fromRoleId, toRoleId);
      
      // refresh data
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

  // update permissions
  const batchUpdatePermissions = useCallback(async (
    updates: { roleId: string; permissions: { permissionId: string; granted: boolean }[] }[]
  ) => {
    try {
      setState((prev: PermissionDataState) => ({ ...prev, saving: true, error: null }));

      for (const update of updates) {
        await PermissionAPI.updateRolePermissions(update.roleId, update.permissions);
      }
      
      // refresh data
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

  // loading teams
  useEffect(() => {
    if (autoLoadTeams && state.filters.organizationId) {
      loadTeams(state.filters.organizationId);
    }
  }, [autoLoadTeams, state.filters.organizationId, loadTeams]);

  // choose the first role
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

  // automaticly saving
  useEffect(() => {
    if (!enableAutoSave || !state.hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      savePermissions();
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [enableAutoSave, state.hasUnsavedChanges, autoSaveDelay, savePermissions]);

  // loading initial data
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
    ...state,
    
    selectedRole,
    filteredTeams,
    isDataReady,
    changedPermissions,
    
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

// export component
export type { UsePermissionDataReturn, UsePermissionDataOptions };