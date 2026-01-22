'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import FieldActions from '@/jiraProfile/ProfileFieldActions';

type EditableFieldProps<T> = Readonly<{
  value: T;
  onSave: (value: T) => Promise<void>;
  renderView: (value: T) => React.ReactNode;
  renderEdit: (value: T, onChange: (value: T) => void) => React.ReactNode;
  isEditable?: boolean;
  showActions?: boolean;
  saveOnBlur?: boolean;
  cancelOnEscape?: boolean;
  className?: string;
}>;

export default function EditableField<T>({
  value,
  onSave,
  renderView,
  renderEdit,
  isEditable = true,
  showActions = true,
  saveOnBlur = false,
  cancelOnEscape = false,
  className,
}: EditableFieldProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;
    setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && cancelOnEscape) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          handleCancel();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [cancelOnEscape, isEditing]);

  const startEdit = () => {
    if (isEditable) {
      setError(null);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value);
    setError(null);
    setIsEditing(false);
  };

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {isEditing ? (
        <div
          role="presentation"
          tabIndex={-1}
          onBlur={(event) => {
            if (saveOnBlur) {
              const isInside = event.currentTarget.contains(event.relatedTarget as Node);
              if (isInside) return;
              handleSave();
            }
          }}
        >
          {renderEdit(draft, setDraft)}
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
      ) : isEditable ? (
        <button
          type="button"
          onClick={startEdit}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              startEdit();
            }
          }}
          className="cursor-text bg-transparent p-0 text-left"
        >
          {renderView(value)}
        </button>
      ) : (
        <div>{renderView(value)}</div>
      )}
      {showActions ? (
        <FieldActions
          mode={isEditing ? 'edit' : 'view'}
          onEdit={startEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          loading={isSaving}
        />
      ) : null}
    </div>
  );
}
