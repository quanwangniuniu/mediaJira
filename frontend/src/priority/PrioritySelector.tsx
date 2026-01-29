'use client';

import React, { useState, useMemo } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import PriorityIcon, { PriorityValue } from './PriorityIcon';

export interface PrioritySelectorProps {
  value?: PriorityValue;
  onChange?: (priority: PriorityValue) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  triggerClassName?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  showIcon?: boolean;
  allowClear?: boolean;
  priorities?: PriorityValue[];
}

const DEFAULT_PRIORITIES: PriorityValue[] = ['HIGHEST', 'HIGH', 'MEDIUM', 'LOW', 'LOWEST'];

const priorityLabels: Record<string, string> = {
  HIGHEST: 'Highest',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  LOWEST: 'Lowest',
};

const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value = null,
  onChange,
  placeholder = 'Select Priority',
  disabled = false,
  loading = false,
  className = '',
  triggerClassName,
  searchPlaceholder = 'Search priorities...',
  emptyMessage = 'No priorities found',
  showIcon = true,
  allowClear = false,
  priorities = DEFAULT_PRIORITIES,
}) => {
  const [open, setOpen] = useState(false);
  const selectedPriority = value;

  const filteredPriorities = useMemo(() => priorities, [priorities]);

  const handleSelect = (priority: PriorityValue) => {
    if (priority === value) {
      // Toggle off if already selected
      if (allowClear) {
        onChange?.(null);
      }
    } else {
      onChange?.(priority);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled && allowClear) {
      onChange?.(null);
    }
  };

  const displayLabel = selectedPriority
    ? priorityLabels[selectedPriority] || selectedPriority
    : placeholder;

  let triggerContent: React.ReactNode;
  if (loading) {
    triggerContent = (
      <div className="flex items-center gap-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        <span className="text-gray-500">Loading...</span>
      </div>
    );
  } else if (selectedPriority) {
    triggerContent = (
      <>
        {showIcon && (
          <PriorityIcon priority={selectedPriority} size="sm" className="flex-shrink-0" />
        )}
        <span className="truncate">{displayLabel}</span>
      </>
    );
  } else {
    triggerContent = <span className="truncate">{placeholder}</span>;
  }

  let listContent: React.ReactNode;
  if (loading) {
    listContent = (
      <div className="flex items-center justify-center py-6">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          <span className="text-sm text-gray-500">Loading priorities...</span>
        </div>
      </div>
    );
  } else if (filteredPriorities.length === 0) {
    listContent = <CommandEmpty>{emptyMessage}</CommandEmpty>;
  } else {
    listContent = (
      <CommandGroup>
        {filteredPriorities.map((priority) => {
          if (!priority) return null;
          const isSelected = priority === value;
          const label = priorityLabels[priority] || priority;
          return (
            <CommandItem
              key={priority}
              onSelect={() => handleSelect(priority)}
              className={cn(
                'flex items-center justify-between gap-2 cursor-pointer',
                'border-l-2 pl-2 py-2 h-9',
                'hover:bg-gray-50',
                isSelected ? 'border-l-blue-500 bg-gray-50' : 'border-l-transparent'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {showIcon && (
                  <PriorityIcon priority={priority} size="sm" className="flex-shrink-0" />
                )}
                <span className="truncate font-medium">{label}</span>
              </div>
              {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
            </CommandItem>
          );
        })}
      </CommandGroup>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="priority-options"
            disabled={disabled || loading}
            className={cn(
              'w-full justify-between gap-2 pr-8 flex items-center px-3 py-2 text-sm',
              'border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-blue-300',
              'focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              !selectedPriority && 'text-gray-500',
              triggerClassName
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">{triggerContent}</div>
            <ChevronDown className="h-4 w-4 text-gray-500" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandList>{listContent}</CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedPriority && allowClear && (
        <button
          type="button"
          onClick={handleClear}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
          aria-label="Clear selection"
        >
          <span className="text-gray-400 hover:text-gray-600 text-sm">×</span>
        </button>
      )}
    </div>
  );
};

export default PrioritySelector;
