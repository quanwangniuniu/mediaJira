import { useState } from 'react';
import { useInlineEdit } from './useInlineEdit';

type InlineFieldProps = {
  label: string;
  initialValue: string;
  multiline?: boolean;
};

function InlineField({ label, initialValue, multiline }: InlineFieldProps) {
  const [value, setValue] = useState(initialValue);
  const { isEditing, inputProps, viewProps } = useInlineEdit(value, setValue);

  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      {isEditing ? (
        multiline ? (
          <textarea
            {...inputProps}
            aria-label={`${label} input`}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          />
        ) : (
          <input
            {...inputProps}
            aria-label={`${label} input`}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          />
        )
      ) : (
        <div
          {...viewProps}
          aria-label={`${label} value`}
          className="cursor-text rounded-lg border border-dashed border-slate-300 px-3 py-2 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
        >
          {value}
        </div>
      )}
    </label>
  );
}

export function InlineEditableForm() {
  return (
    <form className="flex w-full max-w-3xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm">
      <InlineField label="Project" initialValue="Nova launch" />
      <InlineField label="Owner" initialValue="Talia Gomez" />
      <InlineField
        label="Notes"
        initialValue="Enter edits text. Tab moves to the next field."
        multiline
      />
      <div className="text-xs text-slate-500">
        Tab key is native. Esc cancels edits. Ctrl/Cmd + Enter saves textarea.
      </div>
    </form>
  );
}
