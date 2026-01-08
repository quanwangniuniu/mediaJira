import React from 'react';

export interface InlineEditTriggerProps {
  value: string;
  onStartEdit: () => void;
  placeholder?: string;
  className?: string;
  renderTrigger?: (value: string) => React.ReactNode;
}

const InlineEditTrigger: React.FC<InlineEditTriggerProps> = ({
  value,
  onStartEdit,
  placeholder = 'Click to edit',
  renderTrigger,
  className = ''
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onStartEdit();
  };

  const displayValue = value.trim() || placeholder;
  const isEmpty = !value.trim();

  if (renderTrigger) {
    return (
      <div
        onClick={handleClick}
        className={className}
        role="button"
        tabIndex={0}
      >
        {renderTrigger(value)}
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onStartEdit();
        }
      }}
      className={`
        cursor-pointer hover:bg-gray-50 rounded px-2 py-1 transition-colors
        ${isEmpty ? 'text-gray-400 italic' : 'text-gray-900'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${className}
      `}
      aria-label="Click to edit"
    >
      {displayValue}
    </div>
  );
};

export default InlineEditTrigger;