'use client';

import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, Loader2, RefreshCw, Download, Users, ArrowLeft, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import FilterDropdown from '@/components/ui/FilterDropdown';
import { ModuleApproverEditor } from '@/components/ui/ModuleApproverEditor';
import { useApproverData } from '@/hooks/useApproverData';

const ApproversPage = () => {
  const router = useRouter();
  const [filters, setFilters] = useState({
    organizationId: 1,
    teamId: 1,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const { modules, users, approvers, loading, error, updateModuleApprovers, saveAll } = useApproverData(filters);

  const handleUpdateApprovers = async (moduleId: string, selectedUsers: any[]) => {
    try {
      await updateModuleApprovers(moduleId, selectedUsers);
      setHasUnsavedChanges(true);
    } catch (err) {
      console.error('Failed to update approvers:', err);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await saveAll();
      setHasUnsavedChanges(false);
      alert('All approver assignments saved successfully!');
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleBackToPermissions = () => {
    router.push('/admin/permissions');
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse p-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="space-y-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-900">Error Loading Data</h3>
            <p className="text-red-700 mt-2">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const totalApprovers = Object.values(approvers).reduce((total, users) => total + users.length, 0);

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Approver Management</h1>
              <p className="mt-2 text-gray-600">
                Assign and manage approvers for different modules and workflows
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToPermissions}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Permissions
              </button>
              <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Config
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalApprovers}</div>
                <div className="text-sm text-gray-600">Total Approvers</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {Object.values(approvers).filter(users => users.length > 0).length}
                </div>
                <div className="text-sm text-gray-600">Configured Modules</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                <div className="text-sm text-gray-600">Eligible Users</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {modules.filter(m => m.requiresApproval).length}
                </div>
                <div className="text-sm text-gray-600">Require Approval</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">Module Approver Assignment</h3>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {modules.map((module) => (
                <ModuleApproverEditor
                  key={module.id}
                  module={module}
                  approvers={approvers[module.id] || []}
                  users={users}
                  onUpdate={handleUpdateApprovers}
                />
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">You have unsaved changes</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveAll}
                  disabled={saving || !hasUnsavedChanges}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ApproversPage;