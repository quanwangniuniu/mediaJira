// src/data/permissionMockData.ts - Mock data for permission management
import { Organization, Team, Role, Permission, RolePermission } from '@/types/permission';

// Mock Organizations
export const mockOrganizations: Organization[] = [
  { id: '1', name: 'Organization A' },
  { id: '2', name: 'Organization B' },
  { id: '3', name: 'Organization C' },
];

// Mock Teams
export const mockTeams: Team[] = [
  { id: '1', name: 'Team Alpha', organizationId: '1' },
  { id: '2', name: 'Team Beta', organizationId: '1' },
  { id: '3', name: 'Team Gamma', organizationId: '2' },
  { id: '4', name: 'Team Delta', organizationId: '2' },
  { id: '5', name: 'Team Epsilon', organizationId: '3' },
];

// Mock Roles
export const mockRoles: Role[] = [
  {
    id: '1',
    name: 'Admin',
    description: 'Full system access',
    rank: 1,
    organizationId: '1',
  },
  {
    id: '2',
    name: 'Manager',
    description: 'Team management access',
    rank: 2,
    organizationId: '1',
  },
  {
    id: '3',
    name: 'Viewer',
    description: 'Read-only access',
    rank: 3,
    organizationId: '1',
    isReadOnly: true,
  },
  {
    id: '4',
    name: 'Editor',
    description: 'Can edit content',
    rank: 2,
    organizationId: '2',
  },
];

// Mock Permissions
export const mockPermissions: Permission[] = [
  {
    id: 'asset_view',
    name: 'View Assets',
    description: 'Can view asset information',
    module: 'Asset',
    action: 'View',
  },
  {
    id: 'asset_edit',
    name: 'Edit Assets',
    description: 'Can edit asset information',
    module: 'Asset',
    action: 'Edit',
  },
  {
    id: 'asset_delete',
    name: 'Delete Assets',
    description: 'Can delete assets',
    module: 'Asset',
    action: 'Delete',
  },
  {
    id: 'campaign_view',
    name: 'View Campaigns',
    description: 'Can view campaign information',
    module: 'Campaign',
    action: 'View',
  },
  {
    id: 'campaign_edit',
    name: 'Edit Campaigns',
    description: 'Can edit campaign information',
    module: 'Campaign',
    action: 'Edit',
  },
  {
    id: 'campaign_create',
    name: 'Create Campaigns',
    description: 'Can create new campaigns',
    module: 'Campaign',
    action: 'Create',
  },
  {
    id: 'budget_view',
    name: 'View Budget',
    description: 'Can view budget information',
    module: 'Budget',
    action: 'View',
  },
  {
    id: 'budget_edit',
    name: 'Edit Budget',
    description: 'Can edit budget information',
    module: 'Budget',
    action: 'Edit',
  },
  {
    id: 'budget_approve',
    name: 'Approve Budget',
    description: 'Can approve budget requests',
    module: 'Budget',
    action: 'Approve',
  },
  {
    id: 'user_view',
    name: 'View Users',
    description: 'Can view user information',
    module: 'User',
    action: 'View',
  },
  {
    id: 'user_edit',
    name: 'Edit Users',
    description: 'Can edit user information',
    module: 'User',
    action: 'Edit',
  },
];

// Mock Role Permissions
export const mockRolePermissions: RolePermission[] = [
  // Admin role (full access)
  { roleId: '1', permissionId: 'asset_view', granted: true },
  { roleId: '1', permissionId: 'asset_edit', granted: true },
  { roleId: '1', permissionId: 'asset_delete', granted: true },
  { roleId: '1', permissionId: 'campaign_view', granted: true },
  { roleId: '1', permissionId: 'campaign_edit', granted: true },
  { roleId: '1', permissionId: 'campaign_create', granted: true },
  { roleId: '1', permissionId: 'budget_view', granted: true },
  { roleId: '1', permissionId: 'budget_edit', granted: true },
  { roleId: '1', permissionId: 'budget_approve', granted: true },
  { roleId: '1', permissionId: 'user_view', granted: true },
  { roleId: '1', permissionId: 'user_edit', granted: true },
  
  // Manager role (limited access)
  { roleId: '2', permissionId: 'asset_view', granted: true },
  { roleId: '2', permissionId: 'asset_edit', granted: true },
  { roleId: '2', permissionId: 'asset_delete', granted: false },
  { roleId: '2', permissionId: 'campaign_view', granted: true },
  { roleId: '2', permissionId: 'campaign_edit', granted: true },
  { roleId: '2', permissionId: 'campaign_create', granted: true },
  { roleId: '2', permissionId: 'budget_view', granted: true },
  { roleId: '2', permissionId: 'budget_edit', granted: true },
  { roleId: '2', permissionId: 'budget_approve', granted: false },
  { roleId: '2', permissionId: 'user_view', granted: true },
  { roleId: '2', permissionId: 'user_edit', granted: false },
  
  // Viewer role (read-only)
  { roleId: '3', permissionId: 'asset_view', granted: true },
  { roleId: '3', permissionId: 'asset_edit', granted: false },
  { roleId: '3', permissionId: 'asset_delete', granted: false },
  { roleId: '3', permissionId: 'campaign_view', granted: true },
  { roleId: '3', permissionId: 'campaign_edit', granted: false },
  { roleId: '3', permissionId: 'campaign_create', granted: false },
  { roleId: '3', permissionId: 'budget_view', granted: true },
  { roleId: '3', permissionId: 'budget_edit', granted: false },
  { roleId: '3', permissionId: 'budget_approve', granted: false },
  { roleId: '3', permissionId: 'user_view', granted: true },
  { roleId: '3', permissionId: 'user_edit', granted: false },
  
  // Editor role
  { roleId: '4', permissionId: 'asset_view', granted: true },
  { roleId: '4', permissionId: 'asset_edit', granted: true },
  { roleId: '4', permissionId: 'asset_delete', granted: false },
  { roleId: '4', permissionId: 'campaign_view', granted: true },
  { roleId: '4', permissionId: 'campaign_edit', granted: true },
  { roleId: '4', permissionId: 'campaign_create', granted: true },
  { roleId: '4', permissionId: 'budget_view', granted: true },
  { roleId: '4', permissionId: 'budget_edit', granted: false },
  { roleId: '4', permissionId: 'budget_approve', granted: false },
  { roleId: '4', permissionId: 'user_view', granted: true },
  { roleId: '4', permissionId: 'user_edit', granted: false },
];

// Helper function to get teams by organization
export function getTeamsByOrganization(organizationId: string): Team[] {
  return mockTeams.filter(team => team.organizationId === organizationId);
}

// Helper function to get role permissions by role ID
export function getRolePermissions(roleId?: string): RolePermission[] {
  if (!roleId) {
    return mockRolePermissions;
  }
  return mockRolePermissions.filter(rp => rp.roleId === roleId);
}

