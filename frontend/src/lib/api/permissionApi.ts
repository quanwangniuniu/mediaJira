// src/lib/api/permissionApi.ts - 连接AUTH-06后端API
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
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/access_control';
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
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
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

  // fetch role list
  static async getRoles(): Promise<Role[]> {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(200);
      console.log('📦 Using mock roles data');
      return mockRoles;
    }

    try {
      console.log('🔄 Fetching roles from API...');
      const response = await ApiClient.get<any[]>('/roles/');
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
      return mockRoles;
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
  ): Promise<void> {
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
      console.log('✅ Mock permissions updated successfully');
      return;
    }

    try {
      console.log(`🔄 Updating permissions for role ${roleId}...`);
      // AUTH-06 api format
      const response = await ApiClient.post(`/roles/${roleId}/permissions/`, {
        permissions: permissions.map(p => ({
          permissionId: p.permissionId, // AUTH-06 expected data
          granted: p.granted
        }))
      });
      console.log('✅ Permissions updated successfully:', response);
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
  getPermissions: PermissionAPI.getPermissions,
  getRolePermissions: PermissionAPI.getRolePermissions,
  updateRolePermissions: PermissionAPI.updateRolePermissions,
  copyRolePermissions: PermissionAPI.copyRolePermissions,
  buildPermissionMatrix: PermissionAPI.buildPermissionMatrix,
  extractRolePermissions: PermissionAPI.extractRolePermissions,
  hasPermissionChanges: PermissionAPI.hasPermissionChanges
};