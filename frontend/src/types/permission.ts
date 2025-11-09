// src/types/permission.ts

// Core permission types
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
  canEdit?: boolean;
  permissionEditLevel?: PermissionEditLevel;
  editableModules?: string[];
  editableActions?: string[];
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  granted: boolean;
}

// Permission edit level types
export type PermissionEditLevel = 'NONE' | 'VIEW_ONLY' | 'LIMITED' | 'FULL';

// User context types
export interface UserContext {
  user: {
    id: number;
    username: string;
    email: string;
  };
  roles: Array<{
    id: number;
    name: string;
    level: number;
    permissionEditLevel: PermissionEditLevel;
    editableModules: string[];
    editableActions: string[];
    permissions: Permission[];
  }>;
  highestPermissionLevel: PermissionEditLevel;
  canEditPermissions: boolean;
}

// Permission audit types
export interface PermissionChangeAudit {
  id: number;
  changedBy: {
    id: number;
    username: string;
    email: string;
  };
  role: {
    id: number;
    name: string;
  };
  permission: {
    id: string;
    name: string;
  };
  changeType: 'GRANT' | 'REVOKE' | 'BULK_UPDATE' | 'COPY';
  oldValue: boolean | null;
  newValue: boolean | null;
  reason: string;
  createdAt: string;
  ipAddress: string | null;
}

// Permission summary types
export interface PermissionSummary {
  level: PermissionEditLevel;
  canEdit: boolean;
  editableModules: string[];
  editableActions: string[];
  description: string;
}

// Organization structure types
export interface Organization {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  organizationId: string;
}

// Permission matrix and filters
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

// Extended types - reserved for future features
export interface User {
  id: string;
  name: string;
  email: string;
  organizationId: string;
  teamId: string;
  roleIds: string[];
  avatar?: string;
}

export interface CreateUserRole {
  role_id: number;
  team_id: number | null;
  validFrom?: string;
  validTo?: string;
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

// API response types
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

// Generic option type - for dropdowns
export interface SelectOption {
  id: string;
  name: string;
  disabled?: boolean;
}