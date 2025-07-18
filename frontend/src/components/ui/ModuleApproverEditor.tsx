import React, { useState, useEffect } from 'react';
import { Shield, Check, User, X } from 'lucide-react';
import { useApproverData } from '@/hooks/useApproverData';
import ApproverSelect from './ApproverSelect';

interface ModuleApproverEditorProps {
  permissionId: string | number;
  moduleName?: string;
  moduleDescription?: string;
  requiresApproval?: boolean;
}

const ModuleApproverEditor: React.FC<ModuleApproverEditorProps> = ({
  permissionId,
  moduleName = 'Module',
  moduleDescription = '',
  requiresApproval = true,
}) => {
  const { users, approvers, setApprovers, loading, error } = useApproverData(permissionId);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<typeof approvers>([]);

  useEffect(() => {
    setSelectedUsers(approvers);
  }, [approvers]);

  const handleStartEdit = () => {
    setSelectedUsers([...approvers]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    await setApprovers(selectedUsers.map(u => u.id));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setSelectedUsers(approvers);
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{moduleName}</h3>
            <p className="text-sm text-gray-600">{moduleDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            {requiresApproval ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                <Shield className="h-3 w-3" />
                Requires Approval
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                <Check className="h-3 w-3" />
                No Approval Required
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {!requiresApproval ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">This module does not require approval</p>
          </div>
        ) : (
          <>
            {!isEditing ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Current Approvers ({approvers.length})
                  </span>
                  <button
                    onClick={handleStartEdit}
                    className="px-3 py-1 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    Edit Approvers
                  </button>
                </div>

                {approvers.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No approvers assigned</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {approvers.map((approver) => (
                      <div key={approver.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <img
                          src={approver.avatar ? approver.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(approver.username)}&background=random&color=fff`}
                          alt={approver.username}
                          className="w-8 h-8 rounded-full border border-gray-200"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{approver.username}</div>
                          <div className="text-xs text-gray-500">{approver.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Approvers for {moduleName}
                  </label>
                  <ApproverSelect
                    users={users}
                    value={selectedUsers}
                    onChange={setSelectedUsers}
                    placeholder="Search and select users..."
                    className="w-full"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                    disabled={loading}
                  >
                    <Check className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {error && <div className="text-red-500 mt-2">{error}</div>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ModuleApproverEditor;