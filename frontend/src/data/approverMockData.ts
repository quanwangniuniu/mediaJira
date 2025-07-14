import { Module, User } from '@/types/approver';

export const mockModules: Module[] = [
  {
    id: 'asset_management',
    name: 'Asset Management',
    description: 'Digital asset creation and management approvals',
    requiresApproval: true,
  },
  {
    id: 'budget_approval',
    name: 'Budget Approval',
    description: 'Budget allocation and spending approvals',
    requiresApproval: true,
  },
  {
    id: 'campaign_execution',
    name: 'Campaign Execution',
    description: 'Campaign launch and execution approvals',
    requiresApproval: true,
  },
  {
    id: 'reporting',
    name: 'Reporting',
    description: 'Report publication and distribution approvals',
    requiresApproval: false,
  },
];

export const mockApproverUsers: User[] = [
  {
    id: 1,
    name: 'Jane Doe',
    email: 'jane.doe@company.com',
    organization_id: 1,
    team_id: 1,
    role: 'Team Leader',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Doe&background=0D8ABC&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 1, name: 'Regional team - SG', organization_id: 1 },
  },
  {
    id: 2,
    name: 'John Smith',
    email: 'john.smith@company.com',
    organization_id: 1,
    team_id: 1,
    role: 'Senior Media Buyer',
    avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=7C3AED&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 1, name: 'Regional team - SG', organization_id: 1 },
  },
  {
    id: 3,
    name: 'Alice Lee',
    email: 'alice.lee@company.com',
    organization_id: 1,
    team_id: 2,
    role: 'Campaign Manager',
    avatar: 'https://ui-avatars.com/api/?name=Alice+Lee&background=059669&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 2, name: 'Marketing team', organization_id: 1 },
  },
  {
    id: 4,
    name: 'Peter Chen',
    email: 'peter.chen@company.com',
    organization_id: 1,
    team_id: 2,
    role: 'Creative Director',
    avatar: 'https://ui-avatars.com/api/?name=Peter+Chen&background=EA580C&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 2, name: 'Marketing team', organization_id: 1 },
  },
];

export const initialApprovers: Record<string, User[]> = {
  'asset_management': [mockApproverUsers[0], mockApproverUsers[1]],
  'budget_approval': [mockApproverUsers[0], mockApproverUsers[3]],
  'campaign_execution': [mockApproverUsers[2], mockApproverUsers[0]],
  'reporting': [],
};