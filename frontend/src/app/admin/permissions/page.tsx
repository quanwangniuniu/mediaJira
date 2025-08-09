'use client';

import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, Loader2, RefreshCw, Copy, Download, Users, Lock, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

// import components
import Layout from '@/components/layout/Layout';
import FilterDropdown from '@/components/ui/FilterDropdown';
import PermissionMatrix from '@/components/ui/PermissionMatrix';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { usePermissionData } from '@/hooks/usePermissionData';
import { usePermissionEditControl } from '@/hooks/usePermissionEditControl';
import { SelectOption, PermissionEditLevel } from '@/types/permission';

const PermissionsPage: React.FC = () => {
  const router = useRouter();
  
  // Use hook to manage permission data
  const {
    organizations,
    teams,
    roles,
    permissions,
    permissionMatrix,
    filters,
    loading,
    error,
    saving,
    hasUnsavedChanges,
    selectedRole,
    isDataReady,
    setFilters,
    updatePermission,
    savePermissions,
    resetChanges,
    refreshData,
    copyRolePermissions,
  } = usePermissionData({
    autoLoadTeams: true,
    autoSelectFirst: true,
    enableAutoSave: false,
  });

  // Use permission edit control hook
  const {
    userRoles,
    loading: userLoading,
    error: userError,
    canEditPermission,
    canEditRole,
    canPerformAction,
    getUserPermissionLevel,
    getUserPermissionSummary,
    getEditableModules,
    getEditableActions,
    getPermissionLevelDescription,
    refresh: refreshUserRoles,
  } = usePermissionEditControl();

  // Extra UI status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromRole, setCopyFromRole] = useState('');

  // Get user permission level and summary
  const userPermissionLevel = getUserPermissionLevel();
  const userPermissionSummary = getUserPermissionSummary();

  // Handle save actions
  const handleSave = async () => {
    if (!canPerformAction('save')) {
      alert('You do not have permission to save changes');
      return;
    }

    try {
      setSaveStatus('idle');
      await savePermissions();
      setSaveStatus('success');
      
      // Clear success status
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Save failed:', error);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    try {
      console.log('🔄 Refreshing all data...');
      // Refresh permission data and user roles
      await Promise.all([
        refreshData(),
        refreshUserRoles(true) // Force refresh
      ]);
      console.log('✅ All data refreshed successfully');
    } catch (error) {
      console.error('❌ Refresh failed:', error);
    }
  };

  // Handle permissions copy
  const handleCopyPermissions = async () => {
    if (!canPerformAction('copy')) {
      alert('You do not have permission to copy permissions');
      return;
    }

    if (!copyFromRole || !filters.roleId) return;
    
    try {
      await copyRolePermissions(copyFromRole, filters.roleId);
      setShowCopyDialog(false);
      setCopyFromRole('');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // Handle permissions export
  const handleExportPermissions = () => {
    if (!selectedRole) return;
    
    const exportData = {
      role: selectedRole,
      permissions: Object.entries(permissionMatrix[filters.roleId] || {})
        .filter(([, granted]) => granted)
        .map(([permissionId]) => {
          const permission = permissions.find(p => p.id === permissionId);
          return {
            id: permissionId,
            name: permission?.name,
            module: permission?.module,
            action: permission?.action,
          };
        }),
      exportedAt: new Date().toISOString(),
      exportedBy: userPermissionSummary,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedRole.name}-permissions.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Navigate to approvers page
  const handleConfigureApprover = () => {
    if (hasUnsavedChanges) {
      const shouldContinue = window.confirm(
        'You have unsaved changes. Do you want to save them before continuing?'
      );
      if (shouldContinue) {
        handleSave().then(() => {
          router.push('/admin/approvers');
        });
        return;
      }
    }
    
    router.push('/admin/approvers');
  };

  // Transform data format
  const organizationOptions: SelectOption[] = organizations.map(org => ({
    id: org.id,
    name: org.name,
  }));

  const teamOptions: SelectOption[] = teams.map(team => ({
    id: team.id,
    name: team.name,
  }));

  const roleOptions: SelectOption[] = roles.map(role => ({
    id: role.id,
    name: role.name,
    disabled: role.isReadOnly || !canEditRole(role.id),
  }));

  const copyRoleOptions: SelectOption[] = roles
    .filter(role => role.id !== filters.roleId)
    .map(role => ({
      id: role.id,
      name: role.name,
    }));

  // fetch permission level with colors
  const getPermissionLevelColor = (level: PermissionEditLevel) => {
    switch (level) {
      case 'FULL':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'LIMITED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'VIEW_ONLY':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'NONE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const PageContent = () => {
    if (error) {
      return (
        <Layout showPermissionRole={true}>
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Error Loading Data</h3>
                  <p className="text-red-700 mt-1">{error}</p>
                  <p className="text-sm text-red-600 mt-2">
                    This might be normal if the backend server is not running. 
                    The app will fall back to mock data for demonstration.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout showPermissionRole={true}>
        <div className="p-8">
          {/* user permission level */}
          {userPermissionLevel && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-blue-900">
                      Current User Permission Level
                    </h3>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPermissionLevelColor(userPermissionLevel)}`}>
                    {userPermissionLevel}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-700">{userPermissionSummary.description}</p>
                  {userPermissionLevel === 'LIMITED' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Editable: {getEditableModules().join(', ')} modules, {getEditableActions().join(', ')} actions
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* title of page */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Permission Management</h1>
                <p className="mt-2 text-gray-600">
                  Configure role-based permissions for your organization
                </p>
              </div>
              
              {/* action buttons */}
              <div className="flex items-center gap-2">
                {canPerformAction('save') && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasUnsavedChanges}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                )}
                
                {canPerformAction('copy') && (
                  <button
                    onClick={() => setShowCopyDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Permissions
                  </button>
                )}
                
                {canPerformAction('export') && (
                  <button
                    onClick={handleExportPermissions}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </button>
                )}
                
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* access denied */}
          {userPermissionLevel === 'NONE' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-medium text-red-900">
                    Access Denied
                </h3>
                  <p className="text-sm text-red-700 mt-1">
                    You do not have permission to access permission management. Please contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* filter */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <FilterDropdown
              label="Organization"
              options={organizationOptions}
              value={filters.organizationId}
              onChange={(value) => setFilters({ ...filters, organizationId: value })}
              placeholder="Select organization"
            />
            <FilterDropdown
              label="Team"
              options={teamOptions}
              value={filters.teamId}
              onChange={(value) => setFilters({ ...filters, teamId: value })}
              placeholder="Select team"
            />
                  <FilterDropdown
              label="Role"
              options={roleOptions}
              value={filters.roleId}
              onChange={(value) => setFilters({ ...filters, roleId: value })}
              placeholder="Select role"
                  />
                </div>
                
          {/* permission matrix */}
          {isDataReady && selectedRole && (
            <PermissionMatrix
              roles={roles}
              permissions={permissions}
              permissionMatrix={permissionMatrix}
              selectedRoleId={filters.roleId}
              onPermissionChange={updatePermission}
              isLoading={loading}
              showDescription={true}
              compactMode={false}
              highlightChanges={true}
              userPermissionLevel={userPermissionLevel}
              canEditPermission={canEditPermission}
            />
          )}

          {/* copy permission button */}
          {showCopyDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-semibold mb-4">Copy Permissions</h3>
                <p className="text-gray-600 mb-4">
                  Select a role to copy permissions from:
                </p>
                <select
                  value={copyFromRole}
                  onChange={(e) => setCopyFromRole(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg mb-4"
                >
                  <option value="">Select a role</option>
                  {copyRoleOptions.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCopyDialog(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCopyPermissions}
                    disabled={!copyFromRole}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* notification of saving status */}
          {saveStatus === 'success' && (
            <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Permissions saved successfully!</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Failed to save permissions. Please try again.</span>
            </div>
          )}
        </div>
      </Layout>
    );
  };
   
  return (
    <ProtectedRoute
      requiredAuth={true}
      fallback="/unauthorized"
    >
      <PageContent />
    </ProtectedRoute>
  );
};

export default PermissionsPage;