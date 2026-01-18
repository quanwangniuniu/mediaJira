'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Label, { LabelData } from './JiraLabel';

export interface JiraPickerTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selectedLabels?: LabelData[];
  placeholder?: string;
  loading?: boolean;
  maxDisplayed?: number;
  onRemoveLabel?: (label: LabelData) => void;
}

const JiraPickerTrigger = React.forwardRef<HTMLButtonElement, JiraPickerTriggerProps>(
  (
    {
      selectedLabels = [],
      placeholder = 'Add label',
      loading = false,
      maxDisplayed = 3,
      onRemoveLabel,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const displayLabels = selectedLabels.slice(0, maxDisplayed);
    const remainingCount = selectedLabels.length - maxDisplayed;

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        className={cn(
          'w-full min-h-[36px] flex items-center gap-2 px-3 py-1.5 text-sm',
          'border border-black/30 rounded-md bg-white hover:bg-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          'flex-wrap',
          className
        )}
        {...props}
      >
        {(() => {
          if (loading) {
            return (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black/60"></div>
                <span className="text-gray-500">Loading...</span>
              </div>
            );
          }
          if (selectedLabels.length === 0) {
            return <span className="text-gray-500">{placeholder}</span>;
          }
          return (
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {displayLabels.map((label) => (
                <Label
                  key={label.id}
                  label={label}
                  size="sm"
                  showRemove={Boolean(onRemoveLabel)}
                  onRemove={onRemoveLabel}
                  maxWidth="200px"
                />
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-gray-500 px-2">+{remainingCount} more</span>
              )}
            </div>
          );
        })()}
      </button>
    );
  }
);

JiraPickerTrigger.displayName = 'JiraPickerTrigger';

export default JiraPickerTrigger;
