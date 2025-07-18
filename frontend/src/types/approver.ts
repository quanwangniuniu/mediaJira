export interface User {
  id: number;
  name: string;
  email: string;
  organization_id: number;
  team_id: number;
  avatar?: string;
  role?: string;
  organization?: Organization;
  team?: Team;
  userRoles?: UserRole[];
}

export interface Organization {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  organization_id: number;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  rank: number;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  team_id?: number;
  organization_id: number;
  valid_from: string;
  valid_to: string;
  role?: Role;
  team?: Team;
}

export interface Module {
  id: string;
  name: string;
  description: string;
  requiresApproval: boolean;
}

export interface ModuleApprover {
  id: string;
  module_id: string;
  user_id: number;
  assigned_at: string;
  assigned_by: number;
}

export interface ApproverFilter {
  organizationId?: number;
  teamId?: number;
  roleFilter?: string[];
}

export interface ApproverUser {
  id: number;
  username: string;
  email: string;
  avatar?: string;
}

export type ApproverList = ApproverUser[];