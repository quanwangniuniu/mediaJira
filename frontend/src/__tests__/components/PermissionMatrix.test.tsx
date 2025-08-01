import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PermissionMatrix from '@/components/ui/PermissionMatrix';
import { Permission, Role, PermissionMatrix as PermissionMatrixType } from '@/types/permission';

// Mock data
const mockPermissions: Permission[] = [
  {
    id: 'asset_view',
    name: 'View Assets',
    description: 'Can view asset information',
    module: 'Asset',
    action: 'View'
  },
  {
    id: 'asset_edit',
    name: 'Edit Assets',
    description: 'Can edit asset information',
    module: 'Asset',
    action: 'Edit'
  },
  {
    id: 'campaign_view',
    name: 'View Campaigns',
    description: 'Can view campaign information',
    module: 'Campaign',
    action: 'View'
  },
  {
    id: 'campaign_edit',
    name: 'Edit Campaigns',
    description: 'Can edit campaign information',
    module: 'Campaign',
    action: 'Edit'
  },
  {
    id: 'budget_approve',
    name: 'Approve Budget',
    description: 'Can approve budget requests',
    module: 'Budget',
    action: 'Approve'
  }
];

const mockRoles: Role[] = [
  {
    id: 'role1',
    name: 'Admin',
    description: 'Full system access',
    rank: 1
  },
  {
    id: 'role2',
    name: 'Manager',
    description: 'Team management access',
    rank: 2
  },
  {
    id: 'role3',
    name: 'Viewer',
    description: 'Read-only access',
    rank: 3,
    isReadOnly: true
  }
];

const mockPermissionMatrix: PermissionMatrixType = {
  role1: {
    asset_view: true,
    asset_edit: true,
    campaign_view: true,
    campaign_edit: true,
    budget_approve: true
  },
  role2: {
    asset_view: true,
    asset_edit: false,
    campaign_view: true,
    campaign_edit: true,
    budget_approve: false
  },
  role3: {
    asset_view: true,
    asset_edit: false,
    campaign_view: true,
    campaign_edit: false,
    budget_approve: false
  }
};

const defaultProps = {
  roles: mockRoles,
  permissions: mockPermissions,
  permissionMatrix: mockPermissionMatrix,
  selectedRoleId: 'role1',
  onPermissionChange: jest.fn(),
  isLoading: false,
  className: '',
  showDescription: false,
  compactMode: false,
  highlightChanges: false
};

describe('PermissionMatrix Component - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing', () => {
    render(<PermissionMatrix {...defaultProps} />);
    expect(screen.getByText('Admin Permissions')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    render(<PermissionMatrix {...defaultProps} isLoading={true} />);
    
    // Look for the animate-pulse class which indicates loading state
    const container = document.querySelector('.animate-pulse');
    expect(container).toBeInTheDocument();
  });

  test('shows no role selected state', () => {
    render(<PermissionMatrix {...defaultProps} selectedRoleId="" />);
    expect(screen.getByText('Please select a role to view permissions')).toBeInTheDocument();
  });

  test('shows empty permissions state', () => {
    render(<PermissionMatrix {...defaultProps} permissions={[]} />);
    expect(screen.getByText('No permissions available')).toBeInTheDocument();
  });

  test('displays permission statistics', () => {
    render(<PermissionMatrix {...defaultProps} />);
    expect(screen.getByText('5 of 5 granted')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('shows module name', () => {
    render(<PermissionMatrix {...defaultProps} />);
    expect(screen.getByText('Asset')).toBeInTheDocument();
  });

  test('shows action headers', () => {
    render(<PermissionMatrix {...defaultProps} />);
    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  test('renders with custom className', () => {
    render(<PermissionMatrix {...defaultProps} className="custom-class" />);
    
    const container = screen.getByText('Admin Permissions').closest('.bg-white');
    expect(container).toHaveClass('custom-class');
  });
}); 