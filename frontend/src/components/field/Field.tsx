import type { ReactNode } from 'react';

type FieldProps = {
  label: string;
  value?: ReactNode;
  emptyText?: string;
  isEditable?: boolean;
  isReadOnly?: boolean;
  onEdit?: () => void;
  className?: string;
};

export default function Field({
  label,
  value,
  emptyText = 'Empty',
  isEditable = false,
  isReadOnly = false,
  onEdit,
  className = '',
}: FieldProps) {
  const isEmpty = value === undefined || value === null || value === '';
  const canEdit = isEditable && !isReadOnly && Boolean(onEdit);
  const containerClasses = isReadOnly
    ? 'border-slate-300 bg-slate-50'
    : 'border-slate-200 bg-white';
  const editHoverClasses = canEdit ? 'hover:border-slate-400 hover:shadow-md' : '';

  return (
    <div
      className={`group flex w-full items-start justify-between gap-4 rounded-xl border p-4 shadow-sm transition hover:bg-slate-50 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 ${containerClasses} ${editHoverClasses} ${className}`}
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {isEmpty ? (
          <span className="text-sm italic text-slate-400">{emptyText}</span>
        ) : (
          <span className={`text-base font-medium ${isReadOnly ? 'text-slate-500' : 'text-slate-800'}`}>
            {value}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isReadOnly ? (
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
            Read only
          </span>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <span aria-hidden="true">✎</span>
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}
