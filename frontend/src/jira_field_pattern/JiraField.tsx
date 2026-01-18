'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface IssueFieldProps {
  label: string;
  value?: React.ReactNode;
  valueText?: string;
  emptyText?: string;
  editable?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  error?: string;
  commitOnBlur?: boolean;
  showEditIcon?: boolean;
  labelWidth?: string;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  errorClassName?: string;
  placeholderClassName?: string;
  editor?: React.ReactNode;
  onEditStart?: () => void;
  onEditCancel?: () => void;
  onEditSave?: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}

const IssueField: React.FC<IssueFieldProps> = ({
  label,
  value,
  valueText,
  emptyText = 'None',
  editable = false,
  isEditing: isEditingProp,
  isLoading = false,
  error,
  commitOnBlur = true,
  showEditIcon = true,
  labelWidth = '240px',
  className,
  labelClassName,
  valueClassName,
  errorClassName,
  placeholderClassName,
  editor,
  onEditStart,
  onEditCancel,
  onEditSave,
  onKeyDown,
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = isEditingProp ?? internalEditing;

  const initialValueText = useMemo(() => {
    if (typeof valueText === 'string') return valueText;
    if (typeof value === 'string') return value;
    return '';
  }, [valueText, value]);

  const [draftValue, setDraftValue] = useState(initialValueText);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(initialValueText);
    }
  }, [initialValueText, isEditing]);

  const hasValue = useMemo(() => {
    if (valueText !== undefined) return String(valueText).trim().length > 0;
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }, [valueText, value]);

  const startEdit = () => {
    if (!editable || isLoading) return;
    onEditStart?.();
    if (isEditingProp === undefined) {
      setInternalEditing(true);
    }
  };

  const cancelEdit = () => {
    onEditCancel?.();
    setDraftValue(initialValueText);
    if (isEditingProp === undefined) {
      setInternalEditing(false);
    }
  };

  const saveEdit = () => {
    onEditSave?.(draftValue);
    if (isEditingProp === undefined) {
      setInternalEditing(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (isEditing) {
        saveEdit();
      } else {
        startEdit();
      }
    }
    if (event.key === 'Escape' && isEditing) {
      event.preventDefault();
      cancelEdit();
    }
  };

  const renderLoading = () => (
    <div className="flex items-center gap-2 py-1.5">
      <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
      <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
    </div>
  );

  const renderEdit = () => (
    <div className="flex items-center gap-2">
      {editor ? (
        <fieldset className="flex-1 min-w-0">{editor}</fieldset>
      ) : (
        <input
          className={cn(
            'w-full rounded border px-2 py-1.5 text-sm',
            error ? 'border-red-500' : 'border-black/30',
            'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
            valueClassName
          )}
          autoFocus
          disabled={isLoading}
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={commitOnBlur ? saveEdit : undefined}
          onKeyDown={handleKeyDown}
        />
      )}
      {showEditIcon && !editor && (
        <button
          type="button"
          aria-label={`Cancel ${label}`}
          onClick={cancelEdit}
          className="rounded px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          Esc
        </button>
      )}
    </div>
  );

  const renderValue = () => {
    let displayValue: React.ReactNode;
    if (!hasValue) {
      displayValue = (
        <span className={cn('text-[14px] text-gray-500', placeholderClassName)}>
          {emptyText}
        </span>
      );
    } else if (typeof value === 'string' || typeof value === 'number') {
      displayValue = <span className="text-[14px] text-gray-900 truncate">{value}</span>;
    } else {
      displayValue = <div className={cn('w-full', valueClassName)}>{value}</div>;
    }

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={startEdit}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left',
            editable ? 'hover:bg-gray-50 focus:bg-gray-50 focus:ring-2 focus:ring-blue-200 focus:ring-inset focus:border-blue-400' : '',
            error ? 'border border-red-500' : 'border border-transparent',
            valueClassName
          )}
          aria-label={`Edit ${label}`}
        >
          {displayValue}
        </button>
        {editable && showEditIcon && (
          <button
            type="button"
            onClick={startEdit}
            className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label={`Edit ${label}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  let content = renderValue();
  if (isLoading) {
    content = renderLoading();
  } else if (isEditing) {
    content = renderEdit();
  }

  return (
    <div className={cn('group flex items-center gap-2', className)}>
      <div
        className={cn(
          'text-[14px] font-medium text-gray-600 rounded px-1.5 py-1.5',
          'group-hover:bg-gray-100',
          labelClassName
        )}
        style={{ width: labelWidth, minWidth: labelWidth, maxWidth: labelWidth }}
      >
        {label}
      </div>
      <div className="flex-1 min-w-0">
        {content}
        {error && (
          <div className={cn('mt-1 flex items-center gap-1 text-xs text-red-600', errorClassName)}>
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueField;
