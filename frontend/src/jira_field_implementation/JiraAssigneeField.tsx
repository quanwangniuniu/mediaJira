'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import JiraField from '../jira_field_pattern/JiraField';
import AssigneeSelector, {
  AssigneeValue,
  RecentUser,
  User,
} from '../people/AssigneeSelector';
import UserAvatar from '../people/UserAvatar';

export interface IssueAssigneeFieldProps {
  label?: string;
  users: User[];
  recentUsers?: RecentUser[];
  value?: AssigneeValue;
  editable?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  error?: string;
  emptyText?: string;
  labelWidth?: string;
  className?: string;
  onChange?: (value: AssigneeValue) => void;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}

const IssueAssigneeField: React.FC<IssueAssigneeFieldProps> = ({
  label = 'Assignee',
  users,
  recentUsers,
  value = null,
  editable = true,
  isEditing: isEditingProp,
  isLoading = false,
  error,
  emptyText = 'Assign',
  labelWidth,
  className,
  onChange,
  onEditStart,
  onEditCancel,
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = isEditingProp ?? internalEditing;
  const editorRef = useRef<HTMLDivElement>(null);
  const canEdit = editable && Boolean(onChange);
  const showLoading = isLoading && !isEditing;

  const selectedUser = useMemo(() => {
    if (value === null || value === 'unassigned') return null;
    return users.find((user) => String(user.id) === String(value)) ?? null;
  }, [users, value]);

  const startEdit = () => {
    if (!canEdit) return;
    onEditStart?.();
    if (isEditingProp === undefined) {
      setInternalEditing(true);
    }
  };

  const cancelEdit = () => {
    onEditCancel?.();
    if (isEditingProp === undefined) {
      setInternalEditing(false);
    }
  };

  const handleChange = (nextValue: AssigneeValue) => {
    onChange?.(nextValue);
    cancelEdit();
  };

  useEffect(() => {
    if (!isEditing) return;
    const button = editorRef.current?.querySelector('button');
    if (button && !isLoading) {
      requestAnimationFrame(() => button.click());
    }
  }, [isEditing, isLoading]);

  return (
    <JiraField
      label={label}
      value={
        selectedUser ? (
          <div className="flex items-center gap-2 text-sm">
            <UserAvatar user={selectedUser} size="sm" className="shrink-0" />
            <span className="truncate">{selectedUser.name}</span>
          </div>
        ) : null
      }
      valueText={selectedUser?.name ?? ''}
      emptyText={emptyText}
      editable={canEdit}
      isEditing={isEditing}
      isLoading={showLoading}
      error={error}
      labelWidth={labelWidth}
      valueClassName="w-[240px] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      className={className}
      onEditStart={startEdit}
      onEditCancel={cancelEdit}
      showEditIcon={false}
      editor={
        <div ref={editorRef} className={cn('w-full')}>
          <AssigneeSelector
            users={users}
            recentUsers={recentUsers}
            value={value}
            onChange={handleChange}
            disabled={!canEdit || isLoading}
            loading={isLoading}
            placeholder="Assign to..."
            className="w-[240px]"
            triggerClassName="border-transparent hover:border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      }
    />
  );
};

export default IssueAssigneeField;
