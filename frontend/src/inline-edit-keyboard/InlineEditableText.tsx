import { useState } from 'react';
import { useInlineEdit } from './useInlineEdit';

type InlineEditableTextProps = {
  label?: string;
  initialValue?: string;
};

export function InlineEditableText({
  label = 'Title',
  initialValue = 'Quarterly roadmap review',
}: InlineEditableTextProps) {
  const [value, setValue] = useState(initialValue);
  const { isEditing, inputProps, viewProps } = useInlineEdit(value, setValue);

  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      {isEditing ? (
        <div className="flex flex-col gap-2">
          <input
            {...inputProps}
            aria-label={`${label} input`}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          />
          <div className="text-xs text-slate-500">
            Enter saves. Esc cancels.
          </div>
        </div>
      ) : (
        <div
          {...viewProps}
          aria-label={`${label} value`}
          className="cursor-text rounded-lg border border-dashed border-slate-300 px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
        >
          {value}
        </div>
      )}
    </div>
  );
}
