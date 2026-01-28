'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, PencilLine } from 'lucide-react';

interface DecisionWorkbenchHeaderProps {
  projectLabel: string;
  status: string;
  title: string;
  dirty: boolean;
  lastSavedAt?: string | null;
  saving?: boolean;
  committing?: boolean;
  onTitleChange: (nextTitle: string) => void;
  onSave: () => void;
  onCommit: () => void;
  mode?: 'edit' | 'readOnly';
  onBack?: () => void;
}

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const statusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-amber-100 text-amber-800';
    case 'AWAITING_APPROVAL':
      return 'bg-blue-100 text-blue-800';
    case 'COMMITTED':
      return 'bg-emerald-100 text-emerald-800';
    case 'REVIEWED':
      return 'bg-purple-100 text-purple-800';
    case 'ARCHIVED':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const DecisionWorkbenchHeader = ({
  projectLabel,
  status,
  title,
  dirty,
  lastSavedAt,
  saving,
  committing,
  onTitleChange,
  onSave,
  onCommit,
  mode = 'edit',
  onBack,
}: DecisionWorkbenchHeaderProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  const indicator = useMemo(() => {
    if (dirty) return 'Unsaved changes';
    if (saving) return 'Saving...';
    return `Last saved ${formatTime(lastSavedAt)}`;
  }, [dirty, saving, lastSavedAt]);

  const handleStartEdit = () => {
    setDraftTitle(title || '');
    setIsEditing(true);
  };

  const handleCommitTitle = () => {
    const next = draftTitle.trim();
    if (next !== title) {
      onTitleChange(next);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftTitle(title || '');
    setIsEditing(false);
  };

  return (
    <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-gray-400">
              {projectLabel}
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(status)}`}
              >
                {status}
              </span>
              {isEditing && mode === 'edit' ? (
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  onBlur={handleCancelEdit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleCommitTitle();
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                  className="w-full max-w-xl rounded border border-gray-300 px-3 py-1 text-lg font-semibold text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Decision title"
                />
              ) : (
                <button
                  type="button"
                  onClick={mode === 'edit' ? handleStartEdit : undefined}
                  className={`group flex items-center gap-2 text-left ${
                    mode === 'readOnly' ? 'cursor-default' : ''
                  }`}
                >
                  <span className="truncate text-lg font-semibold text-gray-900">
                    {title || 'Untitled decision'}
                  </span>
                  {mode === 'edit' ? (
                    <PencilLine className="h-4 w-4 text-gray-400 opacity-0 transition group-hover:opacity-100" />
                  ) : null}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {!dirty && !saving ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : null}
            <span>{indicator}</span>
          </div>
        </div>
        {mode === 'edit' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                dirty && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-500'
              }`}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={onCommit}
              disabled={committing || saving}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                committing || saving
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {committing ? 'Committing...' : 'Commit'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DecisionWorkbenchHeader;
