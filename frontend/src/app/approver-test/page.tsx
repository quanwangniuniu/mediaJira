'use client';

import React, { useState } from 'react';
import ApproverSelect from '../../components/ui/ApproverSelect';
import { ApproverUser } from '@/types/approver';

const MOCK_USERS: ApproverUser[] = [
  { id: 1, username: 'Jane', email: 'jane@company.com' },
  { id: 2, username: 'John Smith', email: 'john.smith@company.com' },
  { id: 3, username: 'Alice Lee', email: 'alice.lee@company.com' },
  { id: 4, username: 'Bob Manager', email: 'bob@company.com' },
  { id: 5, username: 'Team Leader', email: 'team.leader@company.com' },
  { id: 6, username: 'Campaign Manager', email: 'campaign@company.com' },
];

const ApproverSelectTestPage: React.FC = () => {
  const [singleValue, setSingleValue] = useState<ApproverUser[]>([]);
  const [multipleValue, setMultipleValue] = useState<ApproverUser[]>([]);
  const [filteredValue, setFilteredValue] = useState<ApproverUser[]>([]);

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
                  <li>• &quot;No results found&quot; fallback</li>
                  <li>• Accessible & keyboard navigable</li>
                  <li>• Next.js + Tailwind + Headless UI</li>
                </ul>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">🔍 Test Instructions</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Try &quot;Jane&quot; for name search</li>
                  <li>• Try &quot;john.smith&quot; for email search</li>
                  <li>• Try &quot;Manager&quot; for role search</li>
                  <li>• Try &quot;xyz&quot; for no results</li>
                  <li>• Use Tab and Arrow keys for navigation</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Test Case 1: Single Select (limit to 1) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 1: Single Select
              </h2>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  🔍 <strong>Try searching by:</strong> name (e.g. &quot;Jane&quot;), email (e.g.
                  &quot;john.smith&quot;)
                </p>
                <ApproverSelect
                  users={MOCK_USERS}
                  value={singleValue}
                  onChange={(v) => setSingleValue(v.length > 1 ? [v[v.length - 1]] : v)}
                  placeholder="Type to search users by name or email..."
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Selected:</strong>{' '}
                  {singleValue.length > 0
                    ? `${singleValue[0].username} (${singleValue[0].email})`
                    : 'No selection'}
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
                  🔍 <strong>Search examples:</strong> &quot;Team Leader&quot;,
                  &quot;alice.lee@company.com&quot;
                </p>
                <ApproverSelect
                  users={MOCK_USERS}
                  value={multipleValue}
                  onChange={setMultipleValue}
                  placeholder="Type to search and select multiple users..."
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Selected ({multipleValue.length}):</strong>
                  {multipleValue.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {multipleValue.map((user, index) => (
                        <li key={user.id}>
                          {index + 1}. {user.username} - {user.email}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    ' No selections'
                  )}
                </div>
              </div>
            </div>

            {/* Test Case 3: Filtered by role (mock subset) */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 3: Filtered Users (Team Leader, Campaign Manager)
              </h2>
              <div className="mb-4">
                <div className="mb-2 text-sm text-gray-600">
                  Filtered to show only: <strong>Team Leader, Campaign Manager</strong>
                </div>
                <ApproverSelect
                  users={MOCK_USERS.filter((u) =>
                    ['Team Leader', 'Campaign Manager'].includes(u.username)
                  )}
                  value={filteredValue}
                  onChange={setFilteredValue}
                  placeholder="Search filtered users..."
                  className="mb-4"
                />
                <div className="p-3 bg-gray-50 rounded text-sm">
                  <strong>Selected:</strong>{' '}
                  {filteredValue.length > 0
                    ? filteredValue.map((u) => u.username).join(', ')
                    : 'No selection'}
                </div>
              </div>
            </div>

            {/* Test Case 4: Disabled State */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Test Case 4: Disabled State
              </h2>
              <div className="mb-4">
                <ApproverSelect
                  users={MOCK_USERS}
                  value={[]}
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
                    <li>
                      • Single select: {singleValue.length > 0 ? '✅ Working' : '⏳ Not tested'}
                    </li>
                    <li>
                      • Multiple select: {multipleValue.length > 0 ? '✅ Working' : '⏳ Not tested'}
                    </li>
                    <li>
                      • Filtered: {filteredValue.length > 0 ? '✅ Working' : '⏳ Not tested'}
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">📊 Current Selections</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>Single: {singleValue[0]?.username || 'None'}</div>
                    <div>Multiple: {multipleValue.length} selected</div>
                    <div>Filtered: {filteredValue.map((u) => u.username).join(', ') || 'None'}</div>
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
