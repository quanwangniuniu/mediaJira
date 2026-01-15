'use client';

import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import PriorityIcon, { PriorityValue } from './PriorityIcon';

export interface PrioritySelectorProps {
  value?: PriorityValue;
  onChange?: (priority: PriorityValue) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
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
  placeholder = 'Select priority...',
  disabled = false,
  loading = false,
  className = '',
  searchPlaceholder = 'Search priorities...',
  emptyMessage = 'No priorities found',
  showIcon = true,
  allowClear = true,
  priorities = DEFAULT_PRIORITIES,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPriority = value;

  const filteredPriorities = useMemo(() => {
    if (!searchQuery.trim()) return priorities;
    const query = searchQuery.toLowerCase();
    return priorities.filter((priority) => {
      if (!priority) return false;
      const label = priorityLabels[priority] || priority;
      return label.toLowerCase().includes(query);
    });
  }, [priorities, searchQuery]);

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
    setSearchQuery('');
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
              className="flex items-center justify-between gap-2 cursor-pointer"
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
              'border border-gray-300 rounded-md bg-white hover:bg-gray-50',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              !selectedPriority && 'text-gray-500'
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">{triggerContent}</div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
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
