import { useId, useMemo, useState } from 'react';
import type {
  ChangeEvent,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
  required?: boolean;
};

const baseInputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

const baseLabelClass = 'text-sm font-medium text-slate-700';

function LabelText({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {label}
      {required ? <span className="text-red-500">*</span> : null}
    </span>
  );
}

export function TextInput({ label, hint, error, className = '', ...props }: FieldProps &
  InputHTMLAttributes<HTMLInputElement>) {
  const inputId = useId();
  const hintId = useId();

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {label ? (
        <label className={baseLabelClass} htmlFor={inputId}>
          <LabelText label={label} required={props.required} />
        </label>
      ) : null}
      <input
        id={inputId}
        className={`${baseInputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function TextArea({ label, hint, error, className = '', ...props }: FieldProps &
  TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const inputId = useId();
  const hintId = useId();

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {label ? (
        <label className={baseLabelClass} htmlFor={inputId}>
          <LabelText label={label} required={props.required} />
        </label>
      ) : null}
      <textarea
        id={inputId}
        className={`${baseInputClass} min-h-[120px] ${
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''
        }`}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

type CheckboxProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    description?: string;
  };

export function Checkbox({ label, description, hint, error, className = '', ...props }: CheckboxProps) {
  const inputId = useId();
  const hintId = useId();

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      <label htmlFor={inputId} className="flex items-start gap-3">
        <input
          id={inputId}
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={Boolean(error) || undefined}
          {...props}
        />
        <span className="flex flex-col">
          {label ? (
            <span className={baseLabelClass}>
              <LabelText label={label} required={props.required} />
            </span>
          ) : null}
          {description ? <span className="text-xs text-slate-500">{description}</span> : null}
        </span>
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

type SelectProps = FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
    options: Option[];
  };

export function Select({ label, hint, error, options, className = '', ...props }: SelectProps) {
  const inputId = useId();
  const hintId = useId();

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {label ? (
        <div className={baseLabelClass}>
          <LabelText label={label} required={props.required} />
        </div>
      ) : null}
      <select
        id={inputId}
        className={`${baseInputClass} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''}`}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={Boolean(error) || undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

type MultiSelectProps = FieldProps & {
  options: Option[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
};

export function MultiSelect({
  label,
  hint,
  error,
  options,
  value,
  defaultValue = [],
  onChange,
  className = '',
  required,
}: MultiSelectProps) {
  const inputId = useId();
  const hintId = useId();
  const [internalValue, setInternalValue] = useState<string[]>(defaultValue);
  const selectedValues = value ?? internalValue;
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedValues.includes(option.value)),
    [options, selectedValues],
  );

  const updateValue = (nextValue: string[]) => {
    if (!value) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  const toggleValue = (nextValue: string) => {
    if (selectedValues.includes(nextValue)) {
      updateValue(selectedValues.filter((item) => item !== nextValue));
    } else {
      updateValue([...selectedValues, nextValue]);
    }
  };

  const onCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    toggleValue(event.target.value);
  };

  return (
    <div className={`flex w-full flex-col gap-2 ${className}`}>
      {label ? (
        <div className={baseLabelClass}>
          <LabelText label={label} required={required} />
        </div>
      ) : null}
      <div className={`rounded-lg border border-slate-300 bg-white p-3 ${error ? 'border-red-400' : ''}`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleValue(option.value)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                {option.label}
                <span className="text-slate-400">×</span>
              </button>
            ))
          ) : (
            <span className="text-xs text-slate-400">No selection yet</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const optionId = `${inputId}-${option.value}`;
            return (
              <label
                key={option.value}
                htmlFor={optionId}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
              <input
                id={optionId}
                type="checkbox"
                value={option.value}
                checked={selectedValues.includes(option.value)}
                onChange={onCheckboxChange}
                disabled={option.disabled}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {option.label}
              </label>
            );
          })}
        </div>
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
