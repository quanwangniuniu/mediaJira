import React, { useEffect, useRef } from 'react';

export interface InlineEditViewProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBlur: () => void;
  isLoading?: boolean;
  error?: string | null;
  inputType?: 'input' | 'textarea';
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// Component that displays the input field in edit mode
const InlineEditView: React.FC<InlineEditViewProps> = ({
  value,
  onChange,
  onSave,
  onCancel,
  onKeyDown,
  onBlur,
  isLoading = false,
  error = null,
  inputType = 'input',
  placeholder = '',
  className = '',
  autoFocus = true,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto focus and select text when entering edit mode
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const baseClasses = `
    w-full px-2 py-1 border rounded
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-blue-500 focus:border-blue-500 focus:ring-blue-500'}
    focus:outline-none focus:ring-2
    disabled:bg-gray-100 disabled:cursor-not-allowed
    ${className}
  `;

  return (
    <div className="relative">
      {inputType === 'input' ? (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={isLoading}
          className={baseClasses}
          aria-label="Edit content"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'inline-edit-error' : undefined}
        />
      ) : (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={isLoading}
          className={`${baseClasses} resize-none`}
          rows={3}
          aria-label="Edit content"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'inline-edit-error' : undefined}
        />
      )}
      {error && (
        <div
          id="inline-edit-error"
          className="absolute top-full left-0 mt-1 text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      )}
      {isLoading && (
        <div
          className="absolute top-1/2 right-2 transform -translate-y-1/2"
          aria-label="Saving"
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
};

export default InlineEditView;

