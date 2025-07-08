// src/lib/api/permissionApi.ts
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

// API 配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const API_TIMEOUT = 10000; // 10秒超时

// 网络延迟模拟 - 开发时使用
const simulateNetworkDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

// 错误模拟 - 用于测试错误处理
const simulateRandomError = (errorRate: number = 0.1) => {
  if (Math.random() < errorRate) {
    throw new Error('Simulated network error');
  }
};

// HTTP 客户端封装 - 未来可以替换为 axios 或其他库
class ApiClient {
  private static async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        // TODO: 添加认证头
        // 'Authorization': `Bearer ${getToken()}`,
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
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

// 权限管理 API 类
export class PermissionAPI {
  // 获取组织列表
  static async getOrganizations(): Promise<Organization[]> {
    await simulateNetworkDelay(300);
    simulateRandomError(0.05); // 5% 错误率
    
    // TODO: 替换为真实 API 调用
    // return ApiClient.get<ApiResponse<Organization[]>>('/organizations')
    //   .then(response => response.data);
    
    return mockOrganizations;
  }

  // 根据组织ID获取团队列表
  static async getTeams(organizationId?: string): Promise<Team[]> {
    await simulateNetworkDelay(250);
    simulateRandomError(0.05);
    
    // TODO: 替换为真实 API 调用
    // const endpoint = organizationId 
    //   ? `/teams?organizationId=${organizationId}`
    //   : '/teams';
    // return ApiClient.get<ApiResponse<Team[]>>(endpoint)
    //   .then(response => response.data);
    
    return organizationId 
      ? getTeamsByOrganization(organizationId)
      : mockTeams;
  }

  // 获取角色列表
  static async getRoles(): Promise<Role[]> {
    await simulateNetworkDelay(200);
    simulateRandomError(0.05);
    
    // TODO: 替换为真实 API 调用
    // return ApiClient.get<ApiResponse<Role[]>>('/roles')
    //   .then(response => response.data);
    
    return mockRoles;
  }

  // 获取权限列表
  static async getPermissions(): Promise<Permission[]> {
    await simulateNetworkDelay(350);
    simulateRandomError(0.05);
    
    // TODO: 替换为真实 API 调用
    // return ApiClient.get<ApiResponse<Permission[]>>('/permissions')
    //   .then(response => response.data);
    
    return mockPermissions;
  }

  // 获取角色权限映射
  static async getRolePermissions(roleId?: string): Promise<RolePermission[]> {
    await simulateNetworkDelay(300);
    simulateRandomError(0.05);
    
    // TODO: 替换为真实 API 调用
    // const endpoint = roleId 
    //   ? `/roles/${roleId}/permissions`
    //   : '/role-permissions';
    // return ApiClient.get<ApiResponse<RolePermission[]>>(endpoint)
    //   .then(response => response.data);
    
    return roleId 
      ? getMockRolePermissions(roleId)
      : mockRolePermissions;
  }

  // 更新角色权限
  static async updateRolePermissions(
    roleId: string, 
    permissions: { permissionId: string; granted: boolean }[]
  ): Promise<void> {
    await simulateNetworkDelay(800); // 保存操作稍慢
    simulateRandomError(0.1); // 10% 错误率，模拟保存可能失败
    
    // TODO: 替换为真实 API 调用
    // return ApiClient.post<ApiResponse<void>>(`/roles/${roleId}/permissions`, {
    //   permissions
    // }).then(response => {
    //   if (!response.success) {
    //     throw new Error(response.message || 'Failed to update permissions');
    //   }
    // });
    
    console.log(`🔄 Mock: Updating permissions for role ${roleId}:`, permissions);
    
    // 模拟更新本地数据（实际应用中不需要）
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
  }

  // 批量更新多个角色权限
  static async batchUpdateRolePermissions(
    updates: { roleId: string; permissions: { permissionId: string; granted: boolean }[] }[]
  ): Promise<void> {
    await simulateNetworkDelay(1200);
    simulateRandomError(0.15);
    
    // TODO: 替换为真实 API 调用
    // return ApiClient.post<ApiResponse<void>>('/roles/batch-update-permissions', {
    //   updates
    // }).then(response => {
    //   if (!response.success) {
    //     throw new Error(response.message || 'Failed to batch update permissions');
    //   }
    // });
    
    console.log('🔄 Mock: Batch updating permissions:', updates);
  }

  // 复制角色权限
  static async copyRolePermissions(fromRoleId: string, toRoleId: string): Promise<void> {
    await simulateNetworkDelay(600);
    simulateRandomError(0.1);
    
    // TODO: 替换为真实 API 调用
    // return ApiClient.post<ApiResponse<void>>(`/roles/${toRoleId}/copy-permissions`, {
    //   fromRoleId
    // }).then(response => {
    //   if (!response.success) {
    //     throw new Error(response.message || 'Failed to copy permissions');
    //   }
    // });
    
    console.log(`🔄 Mock: Copying permissions from ${fromRoleId} to ${toRoleId}`);
  }

  // 获取权限模板
  static async getPermissionTemplates(): Promise<{ name: string; permissions: string[] }[]> {
    await simulateNetworkDelay(400);
    
    // TODO: 替换为真实 API 调用
    // return ApiClient.get<ApiResponse<any[]>>('/permission-templates')
    //   .then(response => response.data);
    
    return [
      {
        name: 'Basic User',
        permissions: ['asset_view', 'campaign_view', 'reporting_view']
      },
      {
        name: 'Editor',
        permissions: ['asset_view', 'asset_edit', 'campaign_view', 'campaign_edit', 'reporting_view']
      },
      {
        name: 'Manager',
        permissions: ['asset_view', 'asset_edit', 'asset_approve', 'campaign_view', 'campaign_edit', 'campaign_approve', 'reporting_view', 'reporting_edit']
      }
    ];
  }

  // 工具方法：将 RolePermission[] 转换为 PermissionMatrix
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

  // 工具方法：从 PermissionMatrix 提取单个角色的权限
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

  // 工具方法：检查权限变更
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

// 导出默认配置
export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  // 可以添加其他配置项
};

// 导出便捷方法
export const permissionApiMethods = {
  getOrganizations: PermissionAPI.getOrganizations,
  getTeams: PermissionAPI.getTeams,
  getRoles: PermissionAPI.getRoles,
  getPermissions: PermissionAPI.getPermissions,
  getRolePermissions: PermissionAPI.getRolePermissions,
  updateRolePermissions: PermissionAPI.updateRolePermissions,
  batchUpdateRolePermissions: PermissionAPI.batchUpdateRolePermissions,
  copyRolePermissions: PermissionAPI.copyRolePermissions,
  getPermissionTemplates: PermissionAPI.getPermissionTemplates,
  buildPermissionMatrix: PermissionAPI.buildPermissionMatrix,
  extractRolePermissions: PermissionAPI.extractRolePermissions,
  hasPermissionChanges: PermissionAPI.hasPermissionChanges
};