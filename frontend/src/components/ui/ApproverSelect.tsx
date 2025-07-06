// src/components/ui/ApproverSelect.tsx
import React, { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { ChevronsUpDown, Check, X, Search } from 'lucide-react';

// Types
interface User {
  id: number;
  name: string;
  email: string;
  organization_id: number;
  team_id: number;
  avatar?: string;
  organization?: Organization;
  team?: Team;
  userRoles?: UserRole[];
}

interface Organization {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  organization_id: number;
}

interface Role {
  id: number;
  name: string;
  description: string;
  rank: number;
}

interface UserRole {
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

interface ApproverSelectProps {
  multiple?: boolean;
  roleFilter?: string[];
  teamFilter?: number[];
  organizationFilter?: number[];
  value?: User | User[] | null;
  onChange: (value: User | User[] | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// Mock data matching your database structure
const mockUsers: User[] = [
  {
    id: 1,
    name: 'Jane Doe',
    email: 'jane.doe@company.com',
    organization_id: 1,
    team_id: 1,
    avatar: 'https://ui-avatars.com/api/?name=Jane+Doe&background=0D8ABC&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 1, name: 'Regional team - SG', organization_id: 1 },
    userRoles: [
      {
        id: 1,
        user_id: 1,
        role_id: 1,
        team_id: 1,
        organization_id: 1,
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        role: { id: 1, name: 'Senior Media Buyer', description: 'Senior Media Buyer', rank: 3 }
      }
    ]
  },
  {
    id: 2,
    name: 'John Smith',
    email: 'john.smith@company.com',
    organization_id: 1,
    team_id: 1,
    avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=7C3AED&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 1, name: 'Regional team - SG', organization_id: 1 },
    userRoles: [
      {
        id: 2,
        user_id: 2,
        role_id: 2,
        team_id: 1,
        organization_id: 1,
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        role: { id: 2, name: 'Team Leader', description: 'Team Leader', rank: 4 }
      }
    ]
  },
  {
    id: 3,
    name: 'Alice Lee',
    email: 'alice.lee@company.com',
    organization_id: 1,
    team_id: 2,
    avatar: 'https://ui-avatars.com/api/?name=Alice+Lee&background=059669&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 2, name: 'Marketing team', organization_id: 1 },
    userRoles: [
      {
        id: 3,
        user_id: 3,
        role_id: 3,
        team_id: 2,
        organization_id: 1,
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        role: { id: 3, name: 'Campaign Manager', description: 'Campaign Manager', rank: 3 }
      }
    ]
  },
  {
    id: 4,
    name: 'Daniel Kim',
    email: 'daniel.kim@company.com',
    organization_id: 1,
    team_id: 1,
    avatar: 'https://ui-avatars.com/api/?name=Daniel+Kim&background=DC2626&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 1, name: 'Regional team - SG', organization_id: 1 },
    userRoles: [
      {
        id: 4,
        user_id: 4,
        role_id: 4,
        team_id: 1,
        organization_id: 1,
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        role: { id: 4, name: 'Media Analyst', description: 'Media Analyst', rank: 2 }
      }
    ]
  },
  {
    id: 5,
    name: 'Peter Chen',
    email: 'peter.chen@company.com',
    organization_id: 1,
    team_id: 2,
    avatar: 'https://ui-avatars.com/api/?name=Peter+Chen&background=EA580C&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 2, name: 'Marketing team', organization_id: 1 },
    userRoles: [
      {
        id: 5,
        user_id: 5,
        role_id: 5,
        team_id: 2,
        organization_id: 1,
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        role: { id: 5, name: 'Creative Director', description: 'Creative Director', rank: 4 }
      }
    ]
  },
  {
    id: 6,
    name: 'Catherine Nguyen',
    email: 'catherine.nguyen@company.com',
    organization_id: 1,
    team_id: 2,
    avatar: 'https://ui-avatars.com/api/?name=Catherine+Nguyen&background=7C2D12&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 2, name: 'Marketing team', organization_id: 1 },
    userRoles: [
      {
        id: 6,
        user_id: 6,
        role_id: 6,
        team_id: 2,
        organization_id: 1,
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        role: { id: 6, name: 'Account Manager', description: 'Account Manager', rank: 3 }
      }
    ]
  },
  {
    id: 7,
    name: 'Oliver Wu',
    email: 'oliver.wu@company.com',
    organization_id: 1,
    team_id: 1,
    avatar: 'https://ui-avatars.com/api/?name=Oliver+Wu&background=1F2937&color=fff',
    organization: { id: 1, name: 'ACME Corp' },
    team: { id: 1, name: 'Regional team - SG', organization_id: 1 },
    userRoles: [
      {
        id: 7,
        user_id: 7,
        role_id: 7,
        team_id: 1,
        organization_id: 1,
        valid_from: '2024-01-01',
        valid_to: '2024-12-31',
        role: { id: 7, name: 'Data Analyst', description: 'Data Analyst', rank: 2 }
      }
    ]
  }
];

// Custom hook for users with debounced search
const useUsers = (options: { 
  search?: string; 
  roleFilter?: string[]; 
  teamFilter?: number[];
  organizationFilter?: number[];
  enabled?: boolean 
} = {}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (
    search?: string,
    roleFilter?: string[],
    teamFilter?: number[],
    organizationFilter?: number[]
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call to /users with 300ms delay
      await new Promise(resolve => setTimeout(resolve, 300));

      let filteredUsers = [...mockUsers];

      // Search filter - search by name, email, role name, team name, organization name
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => {
          const roleName = user.userRoles?.[0]?.role?.name?.toLowerCase() || '';
          const teamName = user.team?.name?.toLowerCase() || '';
          const orgName = user.organization?.name?.toLowerCase() || '';
          
          return user.name.toLowerCase().includes(searchLower) ||
                 user.email.toLowerCase().includes(searchLower) ||
                 roleName.includes(searchLower) ||
                 teamName.includes(searchLower) ||
                 orgName.includes(searchLower);
        });
      }

      // Role filter
      if (roleFilter && roleFilter.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          user.userRoles?.some(userRole => 
            roleFilter.includes(userRole.role?.name || '')
          )
        );
      }

      // Team filter
      if (teamFilter && teamFilter.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          teamFilter.includes(user.team_id)
        );
      }

      // Organization filter
      if (organizationFilter && organizationFilter.length > 0) {
        filteredUsers = filteredUsers.filter(user =>
          organizationFilter.includes(user.organization_id)
        );
      }

      setUsers(filteredUsers);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchUsers(options.search, options.roleFilter, options.teamFilter, options.organizationFilter);
    }
  }, [options.search, options.roleFilter, options.teamFilter, options.organizationFilter, options.enabled, fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
};

// Main ApproverSelect Component using Headless UI
const ApproverSelect: React.FC<ApproverSelectProps> = ({
  multiple = false,
  roleFilter,
  teamFilter,
  organizationFilter,
  value,
  onChange,
  placeholder = 'Search for user...',
  className = '',
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Debounced search implementation
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const { users, loading, error } = useUsers({
    search: debouncedQuery,
    roleFilter,
    teamFilter,
    organizationFilter,
    enabled: !disabled,
  });

  const selectedUsers = multiple ? (value as User[] || []) : (value as User | null);

  const handleSelectionChange = (selectedValue: User | User[] | null) => {
    if (multiple) {
      onChange(selectedValue as User[] || []);
    } else {
      onChange(selectedValue as User | null);
      setQuery('');
    }
  };

  const handleRemove = (userId: number) => {
    if (multiple) {
      const currentSelected = selectedUsers as User[];
      onChange(currentSelected.filter(u => u.id !== userId));
    } else {
      onChange(null);
    }
  };

  const getPrimaryRole = (user: User) => {
    return user.userRoles?.[0]?.role?.name || 'No Role';
  };

  const getRoleRank = (user: User) => {
    return user.userRoles?.[0]?.role?.rank || 0;
  };

  const displayValue = (user: User | null) => {
    return user?.name || '';
  };

  return (
    <div className={`relative ${className}`}>
      <Combobox 
        value={selectedUsers} 
        onChange={handleSelectionChange}
        multiple={multiple}
        disabled={disabled}
      >
        <div className="relative">
          {/* Selected tags for multiple mode */}
          {multiple && (selectedUsers as User[]).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {(selectedUsers as User[]).map((user) => (
                <div
                  key={user.id}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-4 h-4 rounded-full"
                  />
                  <span>{user.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(user.id)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input field */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Combobox.Input
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              displayValue={multiple ? () => query : displayValue}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              disabled={disabled}
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center px-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" />
            </Combobox.Button>
          </div>

          {/* Dropdown Options */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery('')}
          >
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {/* Loading state */}
              {loading && (
                <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Loading...
                </div>
              )}

              {/* Error state */}
              {error && (
                <div className="px-4 py-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              {/* No results found */}
              {!loading && !error && users.length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  <span>No users found matching your search criteria</span>
                </div>
              )}

              {/* User options */}
              {!loading && !error && users.map((user) => (
                <Combobox.Option
                  key={user.id}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-3 px-4 ${
                      active ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                    } border-b border-gray-100 last:border-b-0`
                  }
                  value={user}
                >
                  {({ selected, active }) => (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full border-2 border-gray-200"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{user.name}</div>
                          <div className="text-sm font-medium text-blue-600">
                            {getPrimaryRole(user)}
                            <span className="text-xs text-gray-400 ml-1">
                              (Rank {getRoleRank(user)})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">
                            {user.team?.name} • {user.organization?.name}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-400 uppercase tracking-wide">
                          {user.team?.name?.split(' ')[0] || 'TEAM'}
                        </div>
                        {selected && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
};

export default ApproverSelect;
export type { User, ApproverSelectProps };