import React from 'react';
import { useInlineEdit } from './useInlineEdit';

interface InlineEditableTextProps {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  className?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
  showValue?: boolean;
}

/**
 * A simple inline editable text component demonstrating single-input usage.
 */
export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onCommit,
  placeholder = 'Click to edit',
  className = '',
  onCancel,
  autoFocus = true,
  showValue = false,
}) => {
  const { isEditing, viewProps, inputProps } = useInlineEdit(
    value,
    onCommit,
    { onCancel, autoFocus }
  );

  const baseClasses = 'min-h-[1.5rem] px-2 py-1 rounded border border-transparent hover:border-gray-300 focus-visible:border-blue-500 focus-visible:outline-none';
  const editingClasses = 'border-blue-500 bg-white';
  const viewClasses = 'cursor-pointer';

  if (isEditing) {
    return (
      <input
        {...inputProps}
        type="text"
        placeholder={placeholder}
        className={`${baseClasses} ${editingClasses} ${className}`}
      />
    );
  }

  return (
    <div
      {...viewProps}
      className={`${baseClasses} ${viewClasses} ${className}`}
    >
      {showValue ? (
        value || <span className="text-gray-400 italic">{placeholder}</span>
      ) : (
        <span className="text-gray-400 italic">{placeholder}</span>
      )}
    </div>
  );
};
