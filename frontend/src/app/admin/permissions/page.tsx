// src/app/admin/permissions/page.tsx - 简化版本，无认证依赖
'use client';

import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, Loader2, RefreshCw, Copy, Download, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 导入组件
import Layout from '@/components/layout/Layout';
import FilterDropdown from '@/components/ui/FilterDropdown';
import PermissionMatrix from '@/components/ui/PermissionMatrix';
import { usePermissionData } from '@/hooks/usePermissionData';
import { SelectOption } from '@/types/permission';

const PermissionsPage: React.FC = () => {
  const router = useRouter();
  
  // 使用自定义 Hook 管理权限数据
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

  // 额外的UI状态
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyFromRole, setCopyFromRole] = useState('');

  // 处理保存操作
  const handleSave = async () => {
    try {
      setSaveStatus('idle');
      await savePermissions();
      setSaveStatus('success');
      
      // 3秒后清除成功状态
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      console.error('Save failed:', error);
    }
  };

  // 处理刷新数据
  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  // 处理权限复制
  const handleCopyPermissions = async () => {
    if (!copyFromRole || !filters.roleId) return;
    
    try {
      await copyRolePermissions(copyFromRole, filters.roleId);
      setShowCopyDialog(false);
      setCopyFromRole('');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  // 处理权限导出
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

  // 处理跳转到审批人管理页面
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

  // 转换数据为下拉选项格式
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
    disabled: role.isReadOnly,
  }));

  const copyRoleOptions: SelectOption[] = roles
    .filter(role => role.id !== filters.roleId)
    .map(role => ({
      id: role.id,
      name: role.name,
    }));

  // 如果出错，显示错误状态
  if (error) {
    return (
      <Layout>
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
    <Layout>
      <div className="p-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Permission Management</h1>
              <p className="mt-2 text-gray-600">
                Configure role-based permissions for your organization
              </p>
              <div className="mt-2 text-sm text-gray-500">
                <span className="inline-flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    process.env.NEXT_PUBLIC_USE_MOCK === 'true' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  {process.env.NEXT_PUBLIC_USE_MOCK === 'true' ? 'Using Mock Data' : 'Connected to API'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={handleExportPermissions}
                disabled={!selectedRole || loading}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* 筛选器 */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center gap-6">
              <FilterDropdown
                label="Organization"
                value={filters.organizationId}
                onChange={(value) => setFilters({ organizationId: value })}
                options={organizationOptions}
                placeholder="Select organization"
                loading={loading}
              />
              
              <FilterDropdown
                label="Team"
                value={filters.teamId}
                onChange={(value) => setFilters({ teamId: value })}
                options={teamOptions}
                placeholder="Select team"
                disabled={!filters.organizationId}
                loading={loading}
              />
              
              <FilterDropdown
                label="Role"
                value={filters.roleId}
                onChange={(value) => setFilters({ roleId: value })}
                options={roleOptions}
                placeholder="Select role"
                loading={loading}
              />
            </div>
          </div>

          {/* 权限矩阵 */}
          <div className="p-6">
            <PermissionMatrix
              roles={roles}
              permissions={permissions}
              permissionMatrix={permissionMatrix}
              selectedRoleId={filters.roleId}
              onPermissionChange={updatePermission}
              isLoading={loading}
              showDescription={true}
              highlightChanges={hasUnsavedChanges}
            />
          </div>

          {/* 操作栏 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* 状态信息 */}
              <div className="flex items-center gap-4">
                {saveStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Changes saved successfully</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Failed to save changes</span>
                  </div>
                )}
                {hasUnsavedChanges && saveStatus === 'idle' && (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">You have unsaved changes</span>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <button
                    onClick={resetChanges}
                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Reset Changes
                  </button>
                )}
                
                <button
                  onClick={() => setShowCopyDialog(true)}
                  disabled={!filters.roleId || selectedRole?.isReadOnly}
                  className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy Permissions
                </button>
                
                <button
                  onClick={handleConfigureApprover}
                  className="px-4 py-2 text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-2 transition-colors"
                >
                  <Users className="h-4 w-4" />
                  Configure Approvers
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges || !filters.roleId || selectedRole?.isReadOnly}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
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

        {/* 权限复制对话框 */}
        {showCopyDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Copy Permissions
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Copy from role:
                </label>
                <FilterDropdown
                  label=""
                  value={copyFromRole}
                  onChange={setCopyFromRole}
                  options={copyRoleOptions}
                  placeholder="Select role to copy from"
                />
              </div>
              
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  This will overwrite all current permissions for{' '}
                  <span className="font-medium">{selectedRole?.name}</span>.
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCopyDialog(false)}
                  className="flex-1 px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCopyPermissions}
                  disabled={!copyFromRole || saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Copying...' : 'Copy Permissions'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PermissionsPage;