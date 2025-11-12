// src/lib/api/permissionApi.ts - Connect to AUTH-06 backend API
import { 
  Organization, 
  Team, 
  Role, 
  Permission, 
  RolePermission, 
  PermissionMatrix,
  ApiResponse,
  PaginatedResponse
} from '@/types/permission';
import { 
  mockOrganizations, 
  mockTeams, 
  mockRoles, 
  mockPermissions, 
  mockRolePermissions,
  getTeamsByOrganization,
  getRolePermissions as getMockRolePermissions
} from '@/data/permissionMockData';

// API settings
const DEFAULT_API_BASE_URL = 'https://volar-probankruptcy-orval.ngrok-free.dev';

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) ||
  DEFAULT_API_BASE_URL;
const API_TIMEOUT = 10000;
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const simulateNetworkDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

// HTTP client
class ApiClient {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE_URL}${cleanEndpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', 
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      console.log(`🌐 API Request: ${url}`); // logs
      
      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status} - ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          const error = new Error(errorMessage);
          (error as any).response = { data: errorData, status: response.status };
          throw error;
        } catch (parseError) {
          const error = new Error(errorMessage);
          (error as any).response = { status: response.status };
          throw error;
        }
      }
      
      const data = await response.json();
      console.log(`✅ API Response for ${url}:`, data); // logs
      return data;
    } catch (error) {
      console.error(`❌ API request failed: ${url}`, error);
      throw error;
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// permission management API
export class PermissionAPI {
  // fetch organizations list
  static async getOrganizations(): Promise<Organization[]> {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(300);
      console.log('📦 Using mock organizations data');
      return mockOrganizations;
    }

    try {
      console.log('🔄 Fetching organizations from API...');
      const response = await ApiClient.get<any[]>('/organizations/');
      const organizations = response.map(org => ({
        id: org.id.toString(),
        name: org.name
      }));
      console.log('✅ Organizations loaded from API:', organizations);
      return organizations;
    } catch (error) {
      console.warn('⚠️ Failed to fetch organizations from API, falling back to mock data:', error);
      return mockOrganizations;
    }
  }

  // fetch teams list
  static async getTeams(organizationId?: string): Promise<Team[]> {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(250);
      console.log('📦 Using mock teams data');
      return organizationId ? getTeamsByOrganization(organizationId) : mockTeams;
    }

    try {
      console.log('🔄 Fetching teams from API...');
      const endpoint = organizationId 
        ? `/teams/?organization_id=${organizationId}`
        : '/teams/';
      
      const response = await ApiClient.get<any[]>(endpoint);
      const teams = response.map(team => ({
        id: team.id.toString(),
        name: team.name,
        organizationId: team.organizationId || team.organization_id?.toString() || organizationId || ''
      }));
      console.log('✅ Teams loaded from API:', teams);
      return teams;
    } catch (error) {
      console.warn('⚠️ Failed to fetch teams from API, falling back to mock data:', error);
      return organizationId ? getTeamsByOrganization(organizationId) : mockTeams;
    }
  }

  // fetch all roles list
  static async getRoles(): Promise<Role[]> {
    // if (USE_MOCK_DATA) {
    //   await simulateNetworkDelay(200);
    //   console.log('📦 Using mock roles data');
    //   return mockRoles;
    // }

    try {
      console.log('🔄 Fetching roles from API...');
      const response = await ApiClient.get<any[]>('/roles/');
      const roles = response.map(role => {
        // normalize organization id from various backend shapes
        const rawOrgId = role.organization_id ?? role.organization?.id ?? null;
        const normalizedOrgId = (rawOrgId == null || rawOrgId === '' || rawOrgId === 'null')
          ? null
          : rawOrgId.toString();
        const mappedRole = {
          id: role.id.toString(),
          name: role.name,
          description: role.description || `Role: ${role.name}`,
          rank: role.rank || role.level || 0,
          organizationId: normalizedOrgId,
          isReadOnly: role.isReadOnly || false
        };
        console.log(`📋 Mapped role "${role.name}":`, {
          original: { rank: role.rank, level: role.level },
          mapped: { rank: mappedRole.rank }
        });
        return mappedRole;
      });
      console.log('✅ Roles loaded from API:', roles);
      return roles;
    } catch (error) {
      console.warn('⚠️ Failed to fetch roles from API, falling back to mock data:', error);
      return mockRoles;
    }
  }

  // fetch roles by organization_id
  static async getRolesByOrganization(organizationId: string): Promise<Role[]> {
    try {
      console.log('🔄 Fetching roles from API for organization:', organizationId);
      const response = await ApiClient.get<any[]>(`/roles/?organization_id=${organizationId}`);
      const roles = response.map(role => ({
        id: role.id.toString(),
        name: role.name,
        description: role.description || `Role: ${role.name}`,
        rank: role.rank || role.level || 0,
        isReadOnly: role.isReadOnly || false
      }));
      console.log('✅ Roles loaded from API:', roles);
      return roles;
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch roles from API, falling back to mock data:', error);
      // Return filtered mock roles on error, not all roles
      return [];
    }
  }

  // create a new role
  static async createRole(data: { name: string; level: number; organization_id?: number }): Promise<Role> {
    try {
      console.log('🔄 Creating role via API...', data);
      const response = await ApiClient.post<any>('/roles/', data);
      const role = {
        id: response.id.toString(),
        name: response.name,
        description: response.description || `Role: ${response.name}`,
        rank: response.rank || response.level || 0,
        organizationId: response.organization_id?.toString() ?? (response.organization_id != null ? String(response.organization_id) : null),
        isReadOnly: response.isReadOnly || false
      };
      console.log('✅ Role created successfully:', role);
      return role;
    } catch (error) {
      console.error('❌ Failed to create role:', error);
      throw error;
    }
  }

  // delete a role
  static async deleteRole(roleId: string): Promise<void> {
    try {
      console.log('🔄 Deleting role via API...', roleId);
      await ApiClient.delete(`/roles/${roleId}/`);
      console.log('✅ Role deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete role:', error);
      throw error;
    }
  }

  // update a role
  static async updateRole(roleId: string, data: { name?: string; level?: number; organization_id?: number | null }): Promise<Role> {
    try {
      console.log('🔄 Updating role via API...', roleId, data);
      const response = await ApiClient.put<any>(`/roles/${roleId}/`, data);
      const role = {
        id: response.id.toString(),
        name: response.name,
        description: response.description || `Role: ${response.name}`,
        rank: response.rank || response.level || 0,
        organizationId: response.organization_id?.toString() ?? (response.organization_id != null ? String(response.organization_id) : null),
        isReadOnly: response.isReadOnly || false
      };
      console.log('✅ Role updated successfully:', role);
      return role;
    } catch (error) {
      console.error('❌ Failed to update role:', error);
      throw error;
    }
  }




  // fetch current user's roles from /auth/me/ endpoint (which queries UserRole table)
  // This function ONLY returns roles that actually exist in the database for the current user
  // No fallback logic - if user has no roles, returns empty array
  static async getCurrentUserRoles(): Promise<Role[]> {
    console.log('🔍 getCurrentUserRoles called, USE_MOCK_DATA:', USE_MOCK_DATA);

    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(200);
      console.log('📦 Using mock user roles data');
      return [{
        id: '1',
        name: 'Super Admin',
        description: 'Super Administrator with full access',
        rank: 1,
        isReadOnly: false
      }];
    }

    try {
      // Get current user from auth store
      const { useAuthStore } = await import('../authStore');
      const currentUser = useAuthStore.getState().user;
      
      if (!currentUser) {
        console.warn('⚠️ No current user found - returning empty roles');
        return [];
      }
      
      console.log('👤 Current user:', currentUser.email);
      
      // Strategy 1: Check if user object already has roles from /auth/me/
      if (currentUser.roles && Array.isArray(currentUser.roles) && currentUser.roles.length > 0) {
        console.log('✅ Found roles in user object:', currentUser.roles);
        
        // Get all roles to find matching role objects
        const allRoles = await this.getRoles();
        const userRoleObjects = allRoles.filter(role => 
          currentUser.roles.includes(role.name)
        );
        
        if (userRoleObjects.length > 0) {
          console.log('✅ Matched user roles from database:', userRoleObjects);
          console.log('📊 Role ranks:', userRoleObjects.map(r => ({ name: r.name, rank: r.rank })));
          
          // Verify: check if all role names from /auth/me/ were matched
          const unmatchedRoles = currentUser.roles.filter(roleName => 
            !userRoleObjects.some(role => role.name === roleName)
          );
          if (unmatchedRoles.length > 0) {
            console.warn('⚠️ Some role names from /auth/me/ could not be matched:', unmatchedRoles);
            console.warn('This might indicate a data inconsistency between UserRole table and Role table');
          }
          
          return userRoleObjects;
        } else {
          console.warn('⚠️ No matching roles found for role names:', currentUser.roles);
          console.warn('User has roles in /auth/me/ but they do not exist in Role table');
          // Return empty array - user has no valid roles
          return [];
        }
      }
      
      // Strategy 2: Force refresh user data from /auth/me/ to get latest roles
      console.log('🔄 Refreshing user data from /auth/me/ to get latest roles...');
      
      try {
        // Import authAPI to call /auth/me/ directly
        const { authAPI } = await import('../api');
        const freshUserData = await authAPI.getCurrentUser();
        console.log('📡 Fresh user data from /auth/me/:', freshUserData);
        
        if (freshUserData.roles && Array.isArray(freshUserData.roles) && freshUserData.roles.length > 0) {
          console.log('✅ Found fresh roles from /auth/me/:', freshUserData.roles);
          
          // Get all roles to find matching role objects
          const allRoles = await this.getRoles();
          console.log('📋 All available roles:', allRoles.map(r => ({ name: r.name, rank: r.rank })));
          
          const userRoleObjects = allRoles.filter(role => 
            freshUserData.roles.includes(role.name)
          );
          
          if (userRoleObjects.length > 0) {
            console.log('✅ Matched fresh user roles:', userRoleObjects);
            console.log('📊 Role ranks:', userRoleObjects.map(r => ({ name: r.name, rank: r.rank })));
            
            // Verify: check if all role names from /auth/me/ were matched
            const unmatchedRoles = freshUserData.roles.filter(roleName => 
              !userRoleObjects.some(role => role.name === roleName)
            );
            if (unmatchedRoles.length > 0) {
              console.warn('⚠️ Some role names from /auth/me/ could not be matched:', unmatchedRoles);
              console.warn('This might indicate a data inconsistency between UserRole table and Role table');
            }
            
            // Update auth store with fresh data
            const authStore = useAuthStore.getState();
            authStore.setUser(freshUserData);
            
            return userRoleObjects;
          } else {
            console.warn('⚠️ No matching roles found for role names:', freshUserData.roles);
            console.warn('User has roles in /auth/me/ but they do not exist in Role table');
            // Return empty array - user has no valid roles
            return [];
          }
        } else {
          console.log('ℹ️ User has no roles assigned in database (empty roles array from /auth/me/)');
          // User exists but has no roles - this is valid, return empty array
          return [];
        }
        
      } catch (authError) {
        console.error('❌ Could not refresh user data from /auth/me/:', authError);
        // If we can't get fresh data, return empty array for safety
        return [];
      }
      
      // No fallback logic - if user has no roles, return empty array
      // This ensures we never assign roles that don't belong to the user
      console.log('ℹ️ User has no roles - returning empty array (safe default)');
      return [];
      
    } catch (error) {
      console.error('❌ Error in getCurrentUserRoles:', error);
      // Return empty array on error for safety
      return [];
    }
  }

  // fetch permissions
  static async getPermissions(): Promise<Permission[]> {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(350);
      console.log('📦 Using mock permissions data');
      return mockPermissions;
    }

    try {
      console.log('🔄 Fetching permissions from API...');
      const response = await ApiClient.get<any[]>('/permissions/');
      const permissions = response.map(permission => ({
        id: permission.id, // AUTH-06 return data like "asset_view"
        name: permission.name,
        description: permission.description,
        module: permission.module, 
        action: permission.action   
      }));
      console.log('✅ Permissions loaded from API:', permissions);
      return permissions;
    } catch (error) {
      console.warn('⚠️ Failed to fetch permissions from API, falling back to mock data:', error);
      return mockPermissions;
    }
  }

  // fetch role-permissions
  static async getRolePermissions(roleId?: string): Promise<RolePermission[]> {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(300);
      console.log('📦 Using mock role permissions data');
      return roleId ? getMockRolePermissions(roleId) : mockRolePermissions;
    }

    try {
      console.log('🔄 Fetching role permissions from API...');
      const endpoint = roleId 
        ? `/role-permissions/?role_id=${roleId}`
        : '/role-permissions/';
      
      const response = await ApiClient.get<any[]>(endpoint);
      const rolePermissions = response.map(rp => ({
        roleId: rp.roleId || rp.role_id?.toString() || '',
        permissionId: rp.permissionId || rp.permission_id?.toString() || '',
        granted: rp.granted !== undefined ? rp.granted : true
      }));
      console.log('✅ Role permissions loaded from API:', rolePermissions);
      return rolePermissions;
    } catch (error) {
      console.warn('⚠️ Failed to fetch role permissions from API, falling back to mock data:', error);
      return roleId ? getMockRolePermissions(roleId) : mockRolePermissions;
    }
  }

  // update role permissions
  static async updateRolePermissions(
    roleId: string, 
    permissions: { permissionId: string; granted: boolean }[]
  ): Promise<any> {
    console.log('🚀 updateRolePermissions START:', {
      roleId,
      permissionsCount: permissions.length,
      USE_MOCK_DATA,
      API_BASE_URL
    });

    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(800);
      console.log(`🔄 Mock: Updating permissions for role ${roleId}:`, permissions);
      
      // update mock data
      permissions.forEach(({ permissionId, granted }) => {
        const existingIndex = mockRolePermissions.findIndex(
          rp => rp.roleId === roleId && rp.permissionId === permissionId
        );
        
        if (existingIndex >= 0) {
          mockRolePermissions[existingIndex].granted = granted;
        } else {
          mockRolePermissions.push({ roleId, permissionId, granted });
        }
      });
      console.log('✅ Mock permissions updated (in memory only - will be lost on refresh)');
      return;
    }

    try {
      console.log(`🔄 Sending POST request to /roles/${roleId}/permissions/`);
      const payload = {
        permissions: permissions.map(p => ({
          permissionId: p.permissionId, // AUTH-06 expected data
          granted: p.granted
        }))
      };
      console.log('📤 Request payload:', JSON.stringify(payload, null, 2));
      
      // AUTH-06 api format
      const response = await ApiClient.post(`/roles/${roleId}/permissions/`, payload);
      console.log('✅ Permissions updated successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to update permissions:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update permissions');
    }
  }

  // copy
  static async copyRolePermissions(fromRoleId: string, toRoleId: string): Promise<void> {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(600);
      console.log(`🔄 Mock: Copying permissions from ${fromRoleId} to ${toRoleId}`);
      
      // Mock copy
      const sourcePermissions = mockRolePermissions.filter(rp => rp.roleId === fromRoleId);
      
      // delete
      for (let i = mockRolePermissions.length - 1; i >= 0; i--) {
        if (mockRolePermissions[i].roleId === toRoleId) {
          mockRolePermissions.splice(i, 1);
        }
      }
      
      // copy
      sourcePermissions.forEach(perm => {
        mockRolePermissions.push({
          roleId: toRoleId,
          permissionId: perm.permissionId,
          granted: perm.granted
        });
      });
      
      console.log('✅ Mock permissions copied successfully');
      return;
    }

    try {
      console.log(`🔄 Copying permissions from role ${fromRoleId} to ${toRoleId}...`);
      // AUTH-06 api format
      const response = await ApiClient.post(`/roles/${toRoleId}/copy-permissions/`, {
        from_role_id: fromRoleId
      });
      console.log('✅ Permissions copied successfully:', response);
    } catch (error) {
      console.error('❌ Failed to copy permissions:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to copy permissions');
    }
  }

  // RolePermission[] transferred to  PermissionMatrix
  static buildPermissionMatrix(rolePermissions: RolePermission[]): PermissionMatrix {
    const matrix: PermissionMatrix = {};
    
    rolePermissions.forEach(rp => {
      if (!matrix[rp.roleId]) {
        matrix[rp.roleId] = {};
      }
      matrix[rp.roleId][rp.permissionId] = rp.granted;
    });
    
    return matrix;
  }

  // get role permissions from PermissionMatrix 
  static extractRolePermissions(
    matrix: PermissionMatrix, 
    roleId: string
  ): { permissionId: string; granted: boolean }[] {
    const rolePermissions = matrix[roleId] || {};
    return Object.entries(rolePermissions).map(([permissionId, granted]) => ({
      permissionId,
      granted
    }));
  }

  // check the changes of permission
  static hasPermissionChanges(
    original: PermissionMatrix,
    current: PermissionMatrix,
    roleId: string
  ): boolean {
    const originalPermissions = original[roleId] || {};
    const currentPermissions = current[roleId] || {};
    
    const allPermissionIds = new Set([
      ...Object.keys(originalPermissions),
      ...Object.keys(currentPermissions)
    ]);
    
    return Array.from(allPermissionIds).some(permissionId => 
      originalPermissions[permissionId] !== currentPermissions[permissionId]
    );
  }
}

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  useMockData: USE_MOCK_DATA,
};

export const permissionApiMethods = {
  getOrganizations: PermissionAPI.getOrganizations,
  getTeams: PermissionAPI.getTeams,
  getRoles: PermissionAPI.getRoles,
  getCurrentUserRoles: PermissionAPI.getCurrentUserRoles,
  getPermissions: PermissionAPI.getPermissions,
  getRolePermissions: PermissionAPI.getRolePermissions,
  updateRolePermissions: PermissionAPI.updateRolePermissions,
  copyRolePermissions: PermissionAPI.copyRolePermissions,
  buildPermissionMatrix: PermissionAPI.buildPermissionMatrix,
  extractRolePermissions: PermissionAPI.extractRolePermissions,
  hasPermissionChanges: PermissionAPI.hasPermissionChanges
};