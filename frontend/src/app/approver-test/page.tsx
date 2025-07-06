'use client';

import React, { useState } from 'react';
import ApproverSelect, { User } from '../../components/ui/ApproverSelect';



const ApproverSelectTestPage: React.FC = () => {
  const [singleValue, setSingleValue] = useState<User | null>(null);
  const [multipleValue, setMultipleValue] = useState<User[]>([]);
  const [filteredValue, setFilteredValue] = useState<User | null>(null);
  const [teamFilteredValue, setTeamFilteredValue] = useState<User[]>([]);

  const handleSingleChange = (value: User | User[] | null) => {
    setSingleValue(value as User | null);
  };

  const handleMultipleChange = (value: User | User[] | null) => {
    setMultipleValue(value as User[] || []);
  };

  const handleFilteredChange = (value: User | User[] | null) => {
    setFilteredValue(value as User | null);
  };

  const handleTeamFilteredChange = (value: User | User[] | null) => {
    setTeamFilteredValue(value as User[] || []);
  };

  const getPrimaryRole = (user: User) => {
    return user.userRoles?.[0]?.role?.name || 'No Role';
  };

  return (  

    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ApproverSelect Component Test Suite
            </h1>
            <p className="text-gray-600 mb-4">
              <strong>UI-02:</strong> Build Approver Selection Component - Mock Test Page
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">✅ Component Features</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Debounced search API call (300ms)</li>
                  <li>• Avatar + name + role preview</li>
                  <li>• Single/multi-select support</li>
                  <li>• Role/team filtering</li>
                  <li>• "No results found" fallback</li>
                  <li>• Accessible & keyboard navigable</li>
                  <li>• Next.js + Tailwind + Headless UI</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">🔍 Test Instructions</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Try "Jane" for name search</li>
                  <li>• Try "john.smith" for email search</li>
                  <li>• Try "Manager" for role search</li>
                  <li>• Try "xyz" for no results</li>
                  <li>• Use Tab and Arrow keys for navigation</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Test Case 1: Single Select */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 1: Single Select
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  🔍 <strong>Try searching by:</strong> name (e.g., "Jane"), email (e.g., "john.smith"), or role (e.g., "Manager")
                </p>
                <ApproverSelect
                  value={singleValue}
                  onChange={handleSingleChange}
                  placeholder="Type to search users by name, email, or role..."
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Selected:</strong> {singleValue ? 
                    `${singleValue.name} (${getPrimaryRole(singleValue)})` : 
                    'No selection'
                  }
                </div>
              </div>
            </div>

            {/* Test Case 2: Multiple Select */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 2: Multiple Select
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  🔍 <strong>Search examples:</strong> "Team Leader", "alice.lee@company.com", "Media"
                </p>
                <ApproverSelect
                  multiple
                  value={multipleValue}
                  onChange={handleMultipleChange}
                  placeholder="Type to search and select multiple users..."
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Selected ({multipleValue.length}):</strong>
                  {multipleValue.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {multipleValue.map((user, index) => (
                        <li key={user.id}>
                          {index + 1}. {user.name} ({getPrimaryRole(user)}) - {user.email}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    ' No selections'
                  )}
                </div>
              </div>
            </div>

            {/* Test Case 3: Role Filtering */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 3: Role Filtering
              </h2>
              <div className="mb-4">
                <div className="mb-2 text-sm text-gray-600">
                  Filtered to show only: <strong>Team Leader, Campaign Manager</strong>
                </div>
                <ApproverSelect
                  value={filteredValue}
                  onChange={handleFilteredChange}
                  roleFilter={['Team Leader', 'Campaign Manager']}
                  placeholder="Search filtered roles..."
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Selected:</strong> {filteredValue ? 
                    `${filteredValue.name} (${getPrimaryRole(filteredValue)})` : 
                    'No selection'
                  }
                </div>
              </div>
            </div>

            {/* Test Case 4: Team Filtering */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 4: Team Filtering
              </h2>
              <div className="mb-4">
                <div className="mb-2 text-sm text-gray-600">
                  Filtered to show only: <strong>Marketing team (team_id: 2)</strong>
                </div>
                <ApproverSelect
                  multiple
                  value={teamFilteredValue}
                  onChange={handleTeamFilteredChange}
                  teamFilter={[2]}
                  placeholder="Search team filtered users..."
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Selected ({teamFilteredValue.length}):</strong>
                  {teamFilteredValue.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {teamFilteredValue.map((user, index) => (
                        <li key={user.id}>
                          {index + 1}. {user.name} - {user.team?.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    ' No selections'
                  )}
                </div>
              </div>
            </div>

            {/* Test Case 5: Disabled State */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 5: Disabled State
              </h2>
              <div className="mb-4">
                <ApproverSelect
                  value={null}
                  onChange={() => {}}
                  disabled
                  placeholder="This component is disabled"
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Status:</strong> Component is disabled and non-interactive
                </div>
              </div>
            </div>

            {/* Test Results Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Results Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">✅ Functional Tests</h3>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Single select: {singleValue ? '✅ Working' : '⏳ Not tested'}</li>
                    <li>• Multiple select: {multipleValue.length > 0 ? '✅ Working' : '⏳ Not tested'}</li>
                    <li>• Role filtering: {filteredValue ? '✅ Working' : '⏳ Not tested'}</li>
                    <li>• Team filtering: {teamFilteredValue.length > 0 ? '✅ Working' : '⏳ Not tested'}</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">📊 Current Selections</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>Single: {singleValue?.name || 'None'}</div>
                    <div>Multiple: {multipleValue.length} selected</div>
                    <div>Role filtered: {filteredValue?.name || 'None'}</div>
                    <div>Team filtered: {teamFilteredValue.length} selected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApproverSelectTestPage;