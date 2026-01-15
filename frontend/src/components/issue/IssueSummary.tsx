import { useEffect, useRef, useState } from 'react';

type IssueSummaryProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  isReadOnly?: boolean;
  rows?: number;
  className?: string;
  isSaving?: boolean;
  errorMessage?: string;
  autoEdit?: boolean;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
};

export default function IssueSummary({
  value,
  defaultValue = '',
  placeholder = 'Add a summary',
  isReadOnly = false,
  rows = 1,
  className = '',
  isSaving = false,
  errorMessage,
  autoEdit = false,
  onChange,
  onSave,
}: IssueSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [draftValue, setDraftValue] = useState(defaultValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentValue = value ?? internalValue;

  useEffect(() => {
    if (!isEditing) return;
    textareaRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (!autoEdit || isReadOnly) return;
    setIsEditing(true);
  }, [autoEdit, isReadOnly]);

  useEffect(() => {
    if (value === undefined) return;
    setInternalValue(value);
    setDraftValue(value);
  }, [value]);

  const startEditing = () => {
    if (isReadOnly) return;
    setDraftValue(currentValue);
    setIsEditing(true);
  };

  const commitChanges = () => {
    setIsEditing(false);
    if (value === undefined) {
      setInternalValue(draftValue);
    }
    onSave?.(draftValue);
  };

  const discardChanges = () => {
    setDraftValue(currentValue);
    setIsEditing(false);
  };

  const handleChange = (nextValue: string) => {
    setDraftValue(nextValue);
    onChange?.(nextValue);
  };

  if (isEditing) {
    return (
      <div className={`w-full ${className}`}>
        <textarea
          ref={textareaRef}
          value={draftValue}
          rows={rows}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={commitChanges}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              discardChanges();
            }
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              commitChanges();
            }
          }}
          className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">Press Esc to cancel, Ctrl+Enter to save.</span>
          {isSaving ? <span className="text-slate-500">Saving...</span> : null}
          {errorMessage ? <span className="text-red-500">{errorMessage}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={`group w-full text-left ${className}`}
      disabled={isReadOnly}
    >
      <div
        className={`flex w-full items-start justify-between gap-4 rounded-lg border px-3 py-2 text-sm transition ${
          isReadOnly
            ? 'border-transparent bg-transparent text-slate-500'
            : 'border-transparent bg-transparent text-slate-800 hover:border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-200'
        }`}
      >
        <span className={`whitespace-pre-wrap ${currentValue ? 'text-slate-900' : 'text-slate-400'}`}>
          {currentValue || placeholder}
        </span>
        {!isReadOnly ? (
          <span className="text-xs font-semibold text-slate-400 opacity-0 transition group-hover:opacity-100">
            Edit
          </span>
        ) : null}
      </div>
    </button>
  );
}
