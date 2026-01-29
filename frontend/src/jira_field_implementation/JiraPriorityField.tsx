'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import JiraField from '../jira_field_pattern/JiraField';
import PrioritySelector from '../priority/PrioritySelector';
import PriorityIcon, { PriorityValue } from '../priority/PriorityIcon';
import { cn } from '@/lib/utils';

const priorityLabels: Record<string, string> = {
  HIGHEST: 'Highest',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  LOWEST: 'Lowest',
};

export interface IssuePriorityFieldProps {
  label?: string;
  value?: PriorityValue;
  editable?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  error?: string;
  emptyText?: string;
  labelWidth?: string;
  className?: string;
  onChange?: (value: PriorityValue) => void;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}

const IssuePriorityField: React.FC<IssuePriorityFieldProps> = ({
  label = 'Priority',
  value = null,
  editable = true,
  isEditing: isEditingProp,
  isLoading = false,
  error,
  emptyText = 'None',
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

  const displayLabel = useMemo(() => {
    if (!value) return '';
    return priorityLabels[value] || String(value);
  }, [value]);

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

  const handleChange = (nextValue: PriorityValue) => {
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
        value ? (
          <div className="flex items-center gap-2 text-sm">
            <PriorityIcon priority={value} size="sm" />
            <span className="truncate">{displayLabel}</span>
          </div>
        ) : null
      }
      valueText={displayLabel}
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
          <PrioritySelector
            value={value}
            onChange={handleChange}
            disabled={!canEdit || isLoading}
            loading={isLoading}
            showIcon
            className="w-[240px]"
            triggerClassName="border-transparent hover:border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      }
    />
  );
};

export default IssuePriorityField;
