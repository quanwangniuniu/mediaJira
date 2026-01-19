'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import JiraField from '../jira_field_pattern/JiraField';

export interface IssueDescriptionFieldProps {
  label?: string;
  value?: string;
  editable?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  error?: string;
  emptyText?: string;
  labelWidth?: string;
  className?: string;
  onSave?: (value: string) => void;
  onCancel?: () => void;
  onEditStart?: () => void;
}

const IssueDescriptionField: React.FC<IssueDescriptionFieldProps> = ({
  label = 'Description',
  value = '',
  editable = true,
  isEditing: isEditingProp,
  isLoading = false,
  error,
  emptyText = 'Add a description',
  labelWidth,
  className,
  onSave,
  onCancel,
  onEditStart,
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = isEditingProp ?? internalEditing;
  const [draftValue, setDraftValue] = useState(value);
  const canEdit = editable && Boolean(onSave);
  const showLoading = isLoading && !isEditing;

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [value, isEditing]);

  const startEdit = () => {
    if (!canEdit) return;
    onEditStart?.();
    if (isEditingProp === undefined) {
      setInternalEditing(true);
    }
  };

  const cancelEdit = () => {
    setDraftValue(value);
    onCancel?.();
    if (isEditingProp === undefined) {
      setInternalEditing(false);
    }
  };

  const saveEdit = () => {
    onSave?.(draftValue);
    if (isEditingProp === undefined) {
      setInternalEditing(false);
    }
  };

  return (
    <JiraField
      label={label}
      value={
        value ? (
          <div className="whitespace-pre-wrap text-sm text-gray-900">{value}</div>
        ) : null
      }
      valueText={value}
      emptyText={emptyText}
      editable={canEdit}
      isEditing={isEditing}
      isLoading={showLoading}
      error={error}
      labelWidth={labelWidth}
      valueClassName="focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
      className={className}
      onEditStart={startEdit}
      onEditCancel={cancelEdit}
      showEditIcon={false}
      editor={
        <div className="flex flex-col gap-2">
          
          <textarea
            className={cn(
              'min-h-[120px] w-full rounded border px-3 py-2 text-sm',
              'border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
              isLoading && 'cursor-not-allowed bg-gray-50'
            )}
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            disabled={isLoading || !canEdit}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              onClick={saveEdit}
              disabled={isLoading || !canEdit}
            >
              Save
            </button>
            <button
              type="button"
              className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              onClick={cancelEdit}
              disabled={isLoading || !canEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      }
    />
  );
};

export default IssueDescriptionField;
