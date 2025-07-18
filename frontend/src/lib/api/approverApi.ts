import { mockModules, mockApproverUsers, initialApprovers } from '@/data/approverMockData';
import { Module, User, ApproverFilter, ApproverUser } from '@/types/approver';

// API settings
const APPROVER_API_BASE_URL = process.env.NEXT_PUBLIC_PERMISSION_API_URL || '/api/access_control';
const API_TIMEOUT = 10000;
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

const BASE_URL = '/api/access_control/approvers';

const simulateNetworkDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

// HTTP client
class ApproverApiClient {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${APPROVER_API_BASE_URL}${cleanEndpoint}`;
    
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
      
      console.log(`🌐 Approver API Request: ${url}`);
      
      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Approver API Response for ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Approver API request failed: ${url}`, error);
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

  // add delete method
  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const approverApi = {
  // Fetch all modules
  getModules: async (): Promise<Module[]> => {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(300);
      console.log('📦 Using mock modules data');
      return mockModules;
    }

    try {
      console.log('🔄 Fetching modules from API...');
      const permissions = await ApproverApiClient.get<any[]>('/permissions/');
      

      const moduleMap = new Map<string, Module>();
      
      permissions.forEach(permission => {
        const moduleId = permission.module.toLowerCase().replace(' ', '_');
        if (!moduleMap.has(moduleId)) {
          moduleMap.set(moduleId, {
            id: moduleId,
            name: permission.module,
            description: `${permission.module} module approvals`,
            requiresApproval: true, 
          });
        }
      });
      
      const modules = Array.from(moduleMap.values());
      console.log('✅ Modules loaded from API:', modules);
      return modules;
    } catch (error) {
      console.warn('⚠️ Failed to fetch modules from API, falling back to mock data:', error);
      return mockModules;
    }
  },

  // fetch user lists from AUTH-06
  getUsers: async (filter: ApproverFilter = {}): Promise<User[]> => {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(300);
      console.log('📦 Using mock users data');
      
      let filteredUsers = [...mockApproverUsers];
      
      if (filter.organizationId) {
        filteredUsers = filteredUsers.filter(user => 
          user.organization_id === filter.organizationId
        );
      }
      
      if (filter.teamId) {
        filteredUsers = filteredUsers.filter(user => 
          user.team_id === filter.teamId
        );
      }
      
      if (filter.roleFilter && filter.roleFilter.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filter.roleFilter!.includes(user.role || '')
        );
      }
      
      return filteredUsers;
    }

    try {
      console.log('🔄 Fetching users from API...');
      
      // fetch users from organizations API
      const [organizations, teams, roles] = await Promise.all([
        ApproverApiClient.get<any[]>('/organizations/'),
        ApproverApiClient.get<any[]>('/teams/'),
        ApproverApiClient.get<any[]>('/roles/')
      ]);
      
      // mock data
      const users: User[] = [];
      let userId = 1;
      
      organizations.forEach(org => {
        const orgTeams = teams.filter(t => t.organization_id === parseInt(org.id));
        
        orgTeams.forEach(team => {
          roles.slice(0, 3).forEach((role, index) => { 
            users.push({
              id: userId++,
              name: `User ${userId} ${role.name}`,
              email: `user${userId}@${org.name.toLowerCase().replace(' ', '')}.com`,
              organization_id: parseInt(org.id),
              team_id: team.id,
              role: role.name,
              avatar: `https://ui-avatars.com/api/?name=User+${userId}&background=random&color=fff`,
              organization: { id: parseInt(org.id), name: org.name },
              team: { id: team.id, name: team.name, organization_id: parseInt(org.id) }
            });
          });
        });
      });
      
      // apply filter
      let filteredUsers = users;
      
      if (filter.organizationId) {
        filteredUsers = filteredUsers.filter(user => 
          user.organization_id === filter.organizationId
        );
      }
      
      if (filter.teamId) {
        filteredUsers = filteredUsers.filter(user => 
          user.team_id === filter.teamId
        );
      }
      
      if (filter.roleFilter && filter.roleFilter.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filter.roleFilter!.includes(user.role || '')
        );
      }
      
      console.log('✅ Users loaded from API:', filteredUsers);
      return filteredUsers;
    } catch (error) {
      console.warn('⚠️ Failed to fetch users from API, falling back to mock data:', error);
      
      // return mock data if failed
      let filteredUsers = [...mockApproverUsers];
      
      if (filter.organizationId) {
        filteredUsers = filteredUsers.filter(user => 
          user.organization_id === filter.organizationId
        );
      }
      
      if (filter.teamId) {
        filteredUsers = filteredUsers.filter(user => 
          user.team_id === filter.teamId
        );
      }
      
      if (filter.roleFilter && filter.roleFilter.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          filter.roleFilter!.includes(user.role || '')
        );
      }
      
      return filteredUsers;
    }
  },

  // get module approvers
  getModuleApprovers: async (moduleId: string): Promise<User[]> => {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(300);
      console.log(`📦 Using mock approvers data for module ${moduleId}`);
      return initialApprovers[moduleId] || [];
    }

    try {
      console.log(`🔄 Fetching approvers for module ${moduleId}...`);
      
      // will updated with real API route
      const response = await ApproverApiClient.get<any[]>(`/modules/${moduleId}/approvers/`);
      
      const approvers = response.map(approver => ({
        id: approver.user_id || approver.id,
        name: approver.user?.name || approver.name,
        email: approver.user?.email || approver.email,
        organization_id: approver.user?.organization_id || 1,
        team_id: approver.user?.team_id || 1,
        role: approver.user?.role || 'Approver',
        avatar: approver.user?.avatar || `https://ui-avatars.com/api/?name=${approver.name}&background=random&color=fff`
      }));
      
      console.log(`✅ Approvers loaded for module ${moduleId}:`, approvers);
      return approvers;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch approvers for module ${moduleId}, falling back to mock data:`, error);
      return initialApprovers[moduleId] || [];
    }
  },

  // update module approvers
  updateModuleApprovers: async (moduleId: string, userIds: number[]): Promise<void> => {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(500);
      console.log(`🔄 Mock: Updating approvers for module ${moduleId}:`, userIds);
      
      const users = mockApproverUsers.filter(user => userIds.includes(user.id));
      initialApprovers[moduleId] = users;
      
      console.log(`✅ Mock approvers updated for module ${moduleId}`);
      return;
    }

    try {
      console.log(`🔄 Updating approvers for module ${moduleId}...`);
      
      const response = await ApproverApiClient.post(`/modules/${moduleId}/approvers/`, {
        user_ids: userIds
      });
      
      console.log(`✅ Approvers updated for module ${moduleId}:`, response);
    } catch (error) {
      console.error(`❌ Failed to update approvers for module ${moduleId}:`, error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update module approvers');
    }
  },

  // update approvers
  bulkUpdateApprovers: async (updates: Record<string, number[]>): Promise<void> => {
    if (USE_MOCK_DATA) {
      await simulateNetworkDelay(800);
      console.log('🔄 Mock: Bulk updating approvers:', updates);
      
      for (const [moduleId, userIds] of Object.entries(updates)) {
        const users = mockApproverUsers.filter(user => userIds.includes(user.id));
        initialApprovers[moduleId] = users;
      }
      
      console.log('✅ Mock bulk approvers updated');
      return;
    }

    try {
      console.log('🔄 Bulk updating approvers...');
      
      const response = await ApproverApiClient.post('/modules/bulk-update-approvers/', {
        updates
      });
      
      console.log('✅ Bulk approvers updated:', response);
    } catch (error) {
      console.error('❌ Failed to bulk update approvers:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to bulk update approvers');
    }
  },

  // fetch all users that can be configured as approvers
  getAllUsers: async (): Promise<ApproverUser[]> => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  // get approvers under one permission
  getApprovers: async (permissionId: string | number): Promise<ApproverUser[]> => {
    // fetch all approvers
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error('Failed to fetch approvers');
    const allApprovers = await res.json();
    
    // filter approvers by permissionId
    return allApprovers.filter((approver: any) => 
      approver.permission_id === permissionId || 
      approver.permission === permissionId ||
      approver.permission_id === String(permissionId) ||
      approver.permission === String(permissionId)
    );
  },

  // set approvers under one permission
  setApprovers: async (permissionId: string | number, userIds: number[]): Promise<void> => {
    // use POST request body instead of path parameters
    const res = await fetch(`${BASE_URL}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        permission_id: permissionId,
        user_ids: userIds 
      }),
    });
    if (!res.ok) throw new Error('Failed to set approvers');
  },

  // remove approvers under one permission
  removeApprover: async (permissionId: string | number, userId: number): Promise<void> => {
    // use query parameters instead of path parameters
    const res = await fetch(`${BASE_URL}/?permission_id=${permissionId}&user_id=${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to remove approver');
  },
};