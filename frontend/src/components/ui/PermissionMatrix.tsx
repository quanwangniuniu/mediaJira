// src/components/ui/PermissionMatrix.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { AlertTriangle, Info, Eye, Edit, Check, FileText, Trash2 } from 'lucide-react';
import { Permission, Role, PermissionMatrix as PermissionMatrixType } from '@/types/permission';

interface PermissionMatrixProps {
  roles: Role[];
  permissions: Permission[];
  permissionMatrix: PermissionMatrixType;
  selectedRoleId: string;
  onPermissionChange: (roleId: string, permissionId: string, granted: boolean) => void;
  isLoading?: boolean;
  className?: string;
  showDescription?: boolean;
  compactMode?: boolean;
  highlightChanges?: boolean;
}

// 操作类型图标映射
const ActionIcons = {
  View: Eye,
  Edit: Edit,
  Approve: Check,
  Export: FileText,
  Delete: Trash2,
} as const;

// 权限复选框组件
interface PermissionCheckboxProps {
  permission: Permission;
  isGranted: boolean;
  isDisabled: boolean;
  isChanged?: boolean;
  onChange: (granted: boolean) => void;
}

const PermissionCheckbox: React.FC<PermissionCheckboxProps> = ({
  permission,
  isGranted,
  isDisabled,
  isChanged = false,
  onChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDisabled) {
      onChange(event.target.checked);
    }
  }, [isDisabled, onChange]);

  return (
    <div className="relative flex justify-center items-center">
      <label 
        className={`
          relative inline-flex items-center cursor-pointer group
          ${isDisabled ? 'cursor-not-allowed' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <input
          type="checkbox"
          checked={isGranted}
          onChange={handleChange}
          disabled={isDisabled}
          className="sr-only peer"
          aria-label={`${permission.action} permission for ${permission.module}`}
        />
        
        {/* 自定义复选框 */}
        <div className={`
          relative w-5 h-5 rounded border-2 transition-all duration-200
          ${isGranted 
            ? 'bg-blue-600 border-blue-600' 
            : 'bg-white border-gray-300'
          }
          ${isDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-blue-500 cursor-pointer group-hover:shadow-sm'
          }
          ${isChanged ? 'ring-2 ring-yellow-300 ring-offset-1' : ''}
          peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2
        `}>
          {/* 选中状态的勾号 */}
          {isGranted && (
            <svg
              className="w-3 h-3 text-white absolute top-0.5 left-0.5 transition-opacity duration-200"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* 工具提示 */}
        {isHovered && !isDisabled && (
          <div className="absolute z-20 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
            <div className="font-medium">{permission.name}</div>
            <div className="text-gray-300 mt-1">{permission.description}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        )}
      </label>
    </div>
  );
};

// 模块行组件
interface ModuleRowProps {
  module: string;
  modulePermissions: Permission[];
  actions: string[];
  selectedRole: Role | undefined;
  permissionMatrix: PermissionMatrixType;
  selectedRoleId: string;
  onPermissionChange: (roleId: string, permissionId: string, granted: boolean) => void;
  showDescription?: boolean;
  compactMode?: boolean;
  highlightChanges?: boolean;
}

const ModuleRow: React.FC<ModuleRowProps> = ({
  module,
  modulePermissions,
  actions,
  selectedRole,
  permissionMatrix,
  selectedRoleId,
  onPermissionChange,
  showDescription = false,
  compactMode = false,
  highlightChanges = false,
}) => {
  const isPermissionGranted = useCallback((permissionId: string): boolean => {
    return permissionMatrix[selectedRoleId]?.[permissionId] || false;
  }, [permissionMatrix, selectedRoleId]);

  const handlePermissionChange = useCallback((permissionId: string, granted: boolean) => {
    if (selectedRole?.isReadOnly) return;
    onPermissionChange(selectedRoleId, permissionId, granted);
  }, [selectedRole?.isReadOnly, onPermissionChange, selectedRoleId]);

  return (
    <div className={`
      grid grid-cols-6 gap-4 px-6 transition-colors duration-150
      ${compactMode ? 'py-2' : 'py-4'}
      hover:bg-gray-50 border-b border-gray-100 last:border-b-0
    `}>
      {/* 模块名称 */}
      <div className="font-medium text-gray-900 flex items-center gap-2">
        <span>{module}</span>
        {showDescription && (
          <Info className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* 权限复选框 */}
      {actions.map(action => {
        const permission = modulePermissions.find(p => p.action === action);
        const isGranted = permission ? isPermissionGranted(permission.id) : false;
        const isDisabled = selectedRole?.isReadOnly || !permission;
        const ActionIcon = ActionIcons[action as keyof typeof ActionIcons];

        return (
          <div key={action} className="flex justify-center items-center">
            {permission ? (
              <PermissionCheckbox
                permission={permission}
                isGranted={isGranted}
                isDisabled={isDisabled}
                isChanged={highlightChanges}
                onChange={(granted) => handlePermissionChange(permission.id, granted)}
              />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-200 rounded bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400 text-xs">—</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 主要权限矩阵组件
const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  roles,
  permissions,
  permissionMatrix,
  selectedRoleId,
  onPermissionChange,
  isLoading = false,
  className = '',
  showDescription = false,
  compactMode = false,
  highlightChanges = false,
}) => {
  // 按模块分组权限
  const permissionsByModule = useMemo(() => {
    const grouped: { [module: string]: Permission[] } = {};
    permissions.forEach(permission => {
      if (!grouped[permission.module]) {
        grouped[permission.module] = [];
      }
      grouped[permission.module].push(permission);
    });
    return grouped;
  }, [permissions]);

  // 获取所有操作类型
  const actions = useMemo(() => {
    const actionSet = new Set(permissions.map(p => p.action));
    return Array.from(actionSet).sort();
  }, [permissions]);

  // 获取选中的角色
  const selectedRole = useMemo(() => {
    return roles.find(role => role.id === selectedRoleId);
  }, [roles, selectedRoleId]);

  // 统计信息
  const permissionStats = useMemo(() => {
    if (!selectedRoleId) return { total: 0, granted: 0, percentage: 0 };
    
    const rolePermissions = permissionMatrix[selectedRoleId] || {};
    const total = permissions.length;
    const granted = Object.values(rolePermissions).filter(Boolean).length;
    const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;
    
    return { total, granted, percentage };
  }, [selectedRoleId, permissionMatrix, permissions]);

  // 加载状态
  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 未选择角色状态
  if (!selectedRoleId) {
    return (
      <div className={`text-center py-12 text-gray-500 ${className}`}>
        <Info className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">Please select a role to view permissions</p>
        <p className="text-sm mt-2">Choose a role from the dropdown above to manage its permissions</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* 权限统计头部 */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedRole?.name} Permissions
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{permissionStats.granted} of {permissionStats.total} granted</span>
              <span className="text-gray-400">•</span>
              <span className={`font-medium ${
                permissionStats.percentage > 75 ? 'text-green-600' :
                permissionStats.percentage > 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {permissionStats.percentage}%
              </span>
            </div>
          </div>
          
          {selectedRole?.description && (
            <div className="text-sm text-gray-500">
              {selectedRole.description}
            </div>
          )}
        </div>
      </div>

      {/* 表格头部 */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-6 gap-4 px-6 py-4">
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            <span>Module</span>
            {showDescription && (
              <Info className="h-4 w-4 text-gray-400" />
            )}
          </div>
          {actions.map(action => {
            const ActionIcon = ActionIcons[action as keyof typeof ActionIcons];
            return (
              <div key={action} className="font-semibold text-gray-900 text-center flex items-center justify-center gap-2">
                {ActionIcon && <ActionIcon className="h-4 w-4" />}
                <span>{action}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 权限矩阵内容 */}
      <div className="divide-y divide-gray-200">
        {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
          <ModuleRow
            key={module}
            module={module}
            modulePermissions={modulePermissions}
            actions={actions}
            selectedRole={selectedRole}
            permissionMatrix={permissionMatrix}
            selectedRoleId={selectedRoleId}
            onPermissionChange={onPermissionChange}
            showDescription={showDescription}
            compactMode={compactMode}
            highlightChanges={highlightChanges}
          />
        ))}
      </div>

      {/* 只读角色提示 */}
      {selectedRole?.isReadOnly && (
        <div className="bg-yellow-50 border-t border-yellow-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Read-only Role
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                This role is marked as read-only and cannot be modified. Changes to permissions are not allowed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {permissions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">No permissions available</p>
          <p className="text-sm mt-2">There are no permissions configured for this system</p>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;