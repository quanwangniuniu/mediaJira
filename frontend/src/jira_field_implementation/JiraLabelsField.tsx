'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import JiraField from '../jira_field_pattern/JiraField';
import { Badge } from '@/components/ui/badge';

export interface IssueLabelsFieldProps {
  label?: string;
  labels?: string[];
  editable?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  error?: string;
  emptyText?: string;
  labelWidth?: string;
  className?: string;
  onChange?: (labels: string[]) => void;
  onCommit?: (labels: string[]) => void;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}

const IssueLabelsField: React.FC<IssueLabelsFieldProps> = ({
  label = 'Labels',
  labels = [],
  editable = true,
  isEditing: isEditingProp,
  isLoading = false,
  error,
  emptyText = 'Add label',
  labelWidth,
  className,
  onChange,
  onCommit,
  onEditStart,
  onEditCancel,
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = isEditingProp ?? internalEditing;
  const [draftLabels, setDraftLabels] = useState(labels);
  const [inputValue, setInputValue] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const canEdit = editable && Boolean(onChange || onCommit);
  const showLoading = isLoading && !isEditing;

  useEffect(() => {
    if (!isEditing) {
      setDraftLabels(labels);
      setInputValue('');
    }
  }, [labels, isEditing]);

  const startEdit = () => {
    if (!canEdit) return;
    onEditStart?.();
    if (isEditingProp === undefined) {
      setInternalEditing(true);
    }
  };

  const cancelEdit = () => {
    onEditCancel?.();
    setDraftLabels(labels);
    setInputValue('');
    if (isEditingProp === undefined) {
      setInternalEditing(false);
    }
  };

  const commitLabels = (nextLabels: string[]) => {
    if (onCommit) {
      onCommit(nextLabels);
      return;
    }
    onChange?.(nextLabels);
  };

  const addLabel = (rawLabel: string) => {
    const trimmed = rawLabel.trim();
    if (!trimmed) return;
    if (draftLabels.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue('');
      return;
    }
    const nextLabels = [...draftLabels, trimmed];
    setDraftLabels(nextLabels);
    setInputValue('');
    onChange?.(nextLabels);
  };

  const removeLabel = (labelToRemove: string) => {
    const nextLabels = draftLabels.filter((item) => item !== labelToRemove);
    setDraftLabels(nextLabels);
    onChange?.(nextLabels);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addLabel(inputValue);
    }
    if (event.key === 'Backspace' && inputValue.length === 0 && draftLabels.length > 0) {
      event.preventDefault();
      removeLabel(draftLabels[draftLabels.length - 1]);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  };

  const handleEditorBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!editorRef.current?.contains(event.relatedTarget as Node)) {
      commitLabels(draftLabels);
      cancelEdit();
    }
  };

  const valueContent = useMemo(() => {
    if (!labels.length) return null;
    return (
      <div className="flex flex-wrap gap-2">
        {labels.map((item) => (
          <Badge
            key={item}
            className="bg-gray-100 text-gray-800 hover:bg-gray-100 rounded-full"
          >
            {item}
          </Badge>
        ))}
      </div>
    );
  }, [labels]);

  return (
    <JiraField
      label={label}
      value={valueContent}
      valueText={labels.join(', ')}
      emptyText={emptyText}
      editable={canEdit}
      isEditing={isEditing}
      isLoading={showLoading}
      error={error}
      labelWidth={labelWidth}
      className={className}
      onEditStart={startEdit}
      onEditCancel={cancelEdit}
      showEditIcon={false}
      editor={
        <div
          ref={editorRef}
          onBlur={handleEditorBlur}
          className={cn(
            'flex w-full flex-wrap items-center gap-2 rounded border px-2 py-1.5',
            'border-gray-300 bg-white focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400 w-[240px]',
            isLoading && 'opacity-70 pointer-events-none'
          )}
        >
          {draftLabels.map((item) => (
            <Badge
              key={item}
              className="flex items-center gap-1 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-100"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeLabel(item)}
                className="rounded-full p-0.5 text-gray-500 hover:text-gray-700"
                aria-label={`Remove ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            placeholder={draftLabels.length ? 'Add label' : emptyText}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !canEdit}
            autoFocus
          />
        </div>
      }
    />
  );
};

export default IssueLabelsField;
