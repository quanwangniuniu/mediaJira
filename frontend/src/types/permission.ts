// src/types/permission.ts

// core permission types
export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  rank: number;
  isReadOnly?: boolean;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  granted: boolean;
}

// 组织架构类型
export interface Organization {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  organizationId: string;
}

// 权限矩阵和筛选器
export interface PermissionMatrix {
  [roleId: string]: {
    [permissionId: string]: boolean;
  };
}

export interface PermissionFilters {
  organizationId: string;
  teamId: string;
  roleId: string;
}

// 扩展类型 - 为未来功能预留
export interface User {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  teamId: string;
  roleIds: string[];
  avatar?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  timestamp: string;
  details: Record<string, any>;
}

// API 响应类型
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// 通用选项类型 - 用于下拉框
export interface SelectOption {
  id: string;
  name: string;
  disabled?: boolean;
}