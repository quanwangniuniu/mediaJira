// src/data/permissionMockData.ts
import { 
  Organization, 
  Team, 
  Role, 
  Permission, 
  RolePermission,
  User
} from '@/types/permission';

// Organizations data
export const mockOrganizations: Organization[] = [
  { id: '1', name: 'ACME Corp' },
  { id: '2', name: 'Beta Inc' },
  { id: '3', name: 'Gamma LLC' },
];

// Teams data
export const mockTeams: Team[] = [
  { id: '1', name: 'Regional team - SG', organizationId: '1' },
  { id: '2', name: 'Marketing team', organizationId: '1' },
  { id: '3', name: 'Sales team', organizationId: '1' },
  { id: '4', name: 'Development team', organizationId: '2' },
  { id: '5', name: 'Design team', organizationId: '2' },
  { id: '6', name: 'Operations team', organizationId: '3' },
];

// Roles data
export const mockRoles: Role[] = [
  { 
    id: '1', 
    name: 'Super Admin', 
    description: 'Full system access with all permissions', 
    rank: 5, 
    isReadOnly: true 
  },
  { 
    id: '2', 
    name: 'Team Leader', 
    description: 'Team management and approval permissions', 
    rank: 4 
  },
  { 
    id: '3', 
    name: 'Senior Media Buyer', 
    description: 'Advanced media buying and campaign management', 
    rank: 3 
  },
  { 
    id: '4', 
    name: 'Media Buyer', 
    description: 'Standard media buying operations', 
    rank: 2 
  },
  { 
    id: '5', 
    name: 'Media Analyst', 
    description: 'Data analysis and reporting', 
    rank: 1 
  },
  { 
    id: '6', 
    name: 'Viewer', 
    description: 'Read-only access to reports and data', 
    rank: 0 
  },
];

// permissions data - organized by modules
export const mockPermissions: Permission[] = [
  // Asset Management module
  { 
    id: 'asset_view', 
    name: 'View Assets', 
    description: 'View asset information and details', 
    module: 'Asset Management', 
    action: 'View' 
  },
  { 
    id: 'asset_edit', 
    name: 'Edit Assets', 
    description: 'Edit asset information and properties', 
    module: 'Asset Management', 
    action: 'Edit' 
  },
  { 
    id: 'asset_approve', 
    name: 'Approve Assets', 
    description: 'Approve asset changes and submissions', 
    module: 'Asset Management', 
    action: 'Approve' 
  },
  { 
    id: 'asset_export', 
    name: 'Export Assets', 
    description: 'Export asset data to external formats', 
    module: 'Asset Management', 
    action: 'Export' 
  },
  { 
    id: 'asset_delete', 
    name: 'Delete Assets', 
    description: 'Delete assets permanently', 
    module: 'Asset Management', 
    action: 'Delete' 
  },

  // Budget Approval module
  { 
    id: 'budget_view', 
    name: 'View Budget', 
    description: 'View budget information and allocations', 
    module: 'Budget Approval', 
    action: 'View' 
  },
  { 
    id: 'budget_edit', 
    name: 'Edit Budget', 
    description: 'Edit budget allocations and limits', 
    module: 'Budget Approval', 
    action: 'Edit' 
  },
  { 
    id: 'budget_approve', 
    name: 'Approve Budget', 
    description: 'Approve budget requests and changes', 
    module: 'Budget Approval', 
    action: 'Approve' 
  },
  { 
    id: 'budget_export', 
    name: 'Export Budget', 
    description: 'Export budget data and reports', 
    module: 'Budget Approval', 
    action: 'Export' 
  },
  { 
    id: 'budget_delete', 
    name: 'Delete Budget', 
    description: 'Delete budget entries and allocations', 
    module: 'Budget Approval', 
    action: 'Delete' 
  },

  // Campaign Execution module
  { 
    id: 'campaign_view', 
    name: 'View Campaigns', 
    description: 'View campaign details and performance', 
    module: 'Campaign Execution', 
    action: 'View' 
  },
  { 
    id: 'campaign_edit', 
    name: 'Edit Campaigns', 
    description: 'Edit campaign settings and parameters', 
    module: 'Campaign Execution', 
    action: 'Edit' 
  },
  { 
    id: 'campaign_approve', 
    name: 'Approve Campaigns', 
    description: 'Approve campaign launches and changes', 
    module: 'Campaign Execution', 
    action: 'Approve' 
  },
  { 
    id: 'campaign_export', 
    name: 'Export Campaigns', 
    description: 'Export campaign data and reports', 
    module: 'Campaign Execution', 
    action: 'Export' 
  },
  { 
    id: 'campaign_delete', 
    name: 'Delete Campaigns', 
    description: 'Delete campaigns and related data', 
    module: 'Campaign Execution', 
    action: 'Delete' 
  },

  // Reporting module
  { 
    id: 'reporting_view', 
    name: 'View Reports', 
    description: 'View reports and analytics', 
    module: 'Reporting', 
    action: 'View' 
  },
  { 
    id: 'reporting_edit', 
    name: 'Edit Reports', 
    description: 'Edit report configurations and settings', 
    module: 'Reporting', 
    action: 'Edit' 
  },
  { 
    id: 'reporting_approve', 
    name: 'Approve Reports', 
    description: 'Approve report publications and distributions', 
    module: 'Reporting', 
    action: 'Approve' 
  },
  { 
    id: 'reporting_export', 
    name: 'Export Reports', 
    description: 'Export reports to external formats', 
    module: 'Reporting', 
    action: 'Export' 
  },
  { 
    id: 'reporting_delete', 
    name: 'Delete Reports', 
    description: 'Delete reports and report configurations', 
    module: 'Reporting', 
    action: 'Delete' 
  },
];

// permissions based on roles - 
export const mockRolePermissions: RolePermission[] = [
  // Super Admin - has all permissions
  ...mockPermissions.map(p => ({ roleId: '1', permissionId: p.id, granted: true })),

  // Team Leader - own most of permissions，but not able to delate and approve
  { roleId: '2', permissionId: 'asset_view', granted: true },
  { roleId: '2', permissionId: 'asset_edit', granted: true },
  { roleId: '2', permissionId: 'asset_approve', granted: true },
  { roleId: '2', permissionId: 'asset_export', granted: true },
  { roleId: '2', permissionId: 'asset_delete', granted: false },
  
  { roleId: '2', permissionId: 'budget_view', granted: true },
  { roleId: '2', permissionId: 'budget_edit', granted: true },
  { roleId: '2', permissionId: 'budget_approve', granted: true },
  { roleId: '2', permissionId: 'budget_export', granted: true },
  { roleId: '2', permissionId: 'budget_delete', granted: false },
  
  { roleId: '2', permissionId: 'campaign_view', granted: true },
  { roleId: '2', permissionId: 'campaign_edit', granted: true },
  { roleId: '2', permissionId: 'campaign_approve', granted: true },
  { roleId: '2', permissionId: 'campaign_export', granted: true },
  { roleId: '2', permissionId: 'campaign_delete', granted: false },
  
  { roleId: '2', permissionId: 'reporting_view', granted: true },
  { roleId: '2', permissionId: 'reporting_edit', granted: true },
  { roleId: '2', permissionId: 'reporting_approve', granted: true },
  { roleId: '2', permissionId: 'reporting_export', granted: true },
  { roleId: '2', permissionId: 'reporting_delete', granted: false },

  // Senior Media Buyer - able to view and edit and report，cannot approve
  { roleId: '3', permissionId: 'asset_view', granted: true },
  { roleId: '3', permissionId: 'asset_edit', granted: true },
  { roleId: '3', permissionId: 'asset_approve', granted: false },
  { roleId: '3', permissionId: 'asset_export', granted: true },
  { roleId: '3', permissionId: 'asset_delete', granted: false },
  
  { roleId: '3', permissionId: 'budget_view', granted: true },
  { roleId: '3', permissionId: 'budget_edit', granted: true },
  { roleId: '3', permissionId: 'budget_approve', granted: false },
  { roleId: '3', permissionId: 'budget_export', granted: true },
  { roleId: '3', permissionId: 'budget_delete', granted: false },
  
  { roleId: '3', permissionId: 'campaign_view', granted: true },
  { roleId: '3', permissionId: 'campaign_edit', granted: true },
  { roleId: '3', permissionId: 'campaign_approve', granted: false },
  { roleId: '3', permissionId: 'campaign_export', granted: true },
  { roleId: '3', permissionId: 'campaign_delete', granted: false },
  
  { roleId: '3', permissionId: 'reporting_view', granted: true },
  { roleId: '3', permissionId: 'reporting_edit', granted: false },
  { roleId: '3', permissionId: 'reporting_approve', granted: false },
  { roleId: '3', permissionId: 'reporting_export', granted: true },
  { roleId: '3', permissionId: 'reporting_delete', granted: false },

  // Media Buyer - basic permissions
  { roleId: '4', permissionId: 'asset_view', granted: true },
  { roleId: '4', permissionId: 'asset_edit', granted: true },
  { roleId: '4', permissionId: 'asset_approve', granted: false },
  { roleId: '4', permissionId: 'asset_export', granted: false },
  { roleId: '4', permissionId: 'asset_delete', granted: false },
  
  { roleId: '4', permissionId: 'budget_view', granted: true },
  { roleId: '4', permissionId: 'budget_edit', granted: false },
  { roleId: '4', permissionId: 'budget_approve', granted: false },
  { roleId: '4', permissionId: 'budget_export', granted: false },
  { roleId: '4', permissionId: 'budget_delete', granted: false },
  
  { roleId: '4', permissionId: 'campaign_view', granted: true },
  { roleId: '4', permissionId: 'campaign_edit', granted: true },
  { roleId: '4', permissionId: 'campaign_approve', granted: false },
  { roleId: '4', permissionId: 'campaign_export', granted: false },
  { roleId: '4', permissionId: 'campaign_delete', granted: false },
  
  { roleId: '4', permissionId: 'reporting_view', granted: true },
  { roleId: '4', permissionId: 'reporting_edit', granted: false },
  { roleId: '4', permissionId: 'reporting_approve', granted: false },
  { roleId: '4', permissionId: 'reporting_export', granted: false },
  { roleId: '4', permissionId: 'reporting_delete', granted: false },

  // Media Analyst - mainly view and export
  { roleId: '5', permissionId: 'asset_view', granted: true },
  { roleId: '5', permissionId: 'asset_edit', granted: false },
  { roleId: '5', permissionId: 'asset_approve', granted: false },
  { roleId: '5', permissionId: 'asset_export', granted: true },
  { roleId: '5', permissionId: 'asset_delete', granted: false },
  
  { roleId: '5', permissionId: 'budget_view', granted: true },
  { roleId: '5', permissionId: 'budget_edit', granted: false },
  { roleId: '5', permissionId: 'budget_approve', granted: false },
  { roleId: '5', permissionId: 'budget_export', granted: true },
  { roleId: '5', permissionId: 'budget_delete', granted: false },
  
  { roleId: '5', permissionId: 'campaign_view', granted: true },
  { roleId: '5', permissionId: 'campaign_edit', granted: false },
  { roleId: '5', permissionId: 'campaign_approve', granted: false },
  { roleId: '5', permissionId: 'campaign_export', granted: true },
  { roleId: '5', permissionId: 'campaign_delete', granted: false },
  
  { roleId: '5', permissionId: 'reporting_view', granted: true },
  { roleId: '5', permissionId: 'reporting_edit', granted: true },
  { roleId: '5', permissionId: 'reporting_approve', granted: false },
  { roleId: '5', permissionId: 'reporting_export', granted: true },
  { roleId: '5', permissionId: 'reporting_delete', granted: false },

  // Viewer - only view
  { roleId: '6', permissionId: 'asset_view', granted: true },
  { roleId: '6', permissionId: 'asset_edit', granted: false },
  { roleId: '6', permissionId: 'asset_approve', granted: false },
  { roleId: '6', permissionId: 'asset_export', granted: false },
  { roleId: '6', permissionId: 'asset_delete', granted: false },
  
  { roleId: '6', permissionId: 'budget_view', granted: true },
  { roleId: '6', permissionId: 'budget_edit', granted: false },
  { roleId: '6', permissionId: 'budget_approve', granted: false },
  { roleId: '6', permissionId: 'budget_export', granted: false },
  { roleId: '6', permissionId: 'budget_delete', granted: false },
  
  { roleId: '6', permissionId: 'campaign_view', granted: true },
  { roleId: '6', permissionId: 'campaign_edit', granted: false },
  { roleId: '6', permissionId: 'campaign_approve', granted: false },
  { roleId: '6', permissionId: 'campaign_export', granted: false },
  { roleId: '6', permissionId: 'campaign_delete', granted: false },
  
  { roleId: '6', permissionId: 'reporting_view', granted: true },
  { roleId: '6', permissionId: 'reporting_edit', granted: false },
  { roleId: '6', permissionId: 'reporting_approve', granted: false },
  { roleId: '6', permissionId: 'reporting_export', granted: false },
  { roleId: '6', permissionId: 'reporting_delete', granted: false },
];

// user data - expanded for other functions
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Jane Doe',
    email: 'jane.doe@company.com',
    organizationId: '1',
    teamId: '1',
    roleIds: ['2'],
    avatar: 'https://ui-avatars.com/api/?name=Jane+Doe&background=0D8ABC&color=fff',
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john.smith@company.com',
    organizationId: '1',
    teamId: '1',
    roleIds: ['3'],
    avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=7C3AED&color=fff',
  },
  {
    id: '3',
    name: 'Alice Lee',
    email: 'alice.lee@company.com',
    organizationId: '1',
    teamId: '2',
    roleIds: ['4'],
    avatar: 'https://ui-avatars.com/api/?name=Alice+Lee&background=059669&color=fff',
  },
];

// search function
export const getTeamsByOrganization = (organizationId: string): Team[] => {
  return mockTeams.filter(team => team.organizationId === organizationId);
};

export const getRolePermissions = (roleId: string): RolePermission[] => {
  return mockRolePermissions.filter(rp => rp.roleId === roleId);
};

export const getPermissionsByModule = (module: string): Permission[] => {
  return mockPermissions.filter(p => p.module === module);
};

export const getUsersByTeam = (teamId: string): User[] => {
  return mockUsers.filter(user => user.teamId === teamId);
};