"use client";

import React, { useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import StatusBadge from './StatusBadge';
import type { StatusOption, StatusWorkflowGroup } from './statusTypes';
import { DEFAULT_STATUS_OPTIONS } from './statusTypes';

export interface StatusDropdownProps {
  value?: string | null;
  options?: StatusOption[];
  groups?: StatusWorkflowGroup[];
  placeholder?: string;
  isLoading?: boolean;
  disabled?: boolean;
  open?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  onOpenChange?: (open: boolean) => void;
  onChange?: (value: string) => void;
}

const buildGroups = (
  options: StatusOption[],
  groups?: StatusWorkflowGroup[]
): StatusWorkflowGroup[] => {
  if (groups && groups.length > 0) {
    return groups;
  }

  const hasWorkflow = options.some((option) => option.workflow);
  if (!hasWorkflow) {
    return [
      {
        id: 'all',
        label: '',
        statuses: options,
      },
    ];
  }

  const grouped = new Map<string, StatusWorkflowGroup>();
  options.forEach((option) => {
    const key = option.workflow ?? 'Other';
    if (!grouped.has(key)) {
      grouped.set(key, { id: key, label: key, statuses: [] });
    }
    grouped.get(key)!.statuses.push(option);
  });

  return Array.from(grouped.values());
};

const StatusDropdown: React.FC<StatusDropdownProps> = ({
  value,
  options = DEFAULT_STATUS_OPTIONS,
  groups,
  placeholder = 'Select status',
  isLoading = false,
  disabled = false,
  open: openProp,
  className,
  triggerClassName,
  contentClassName,
  onOpenChange,
  onChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const commandRef = useRef<HTMLDivElement>(null);

  const setOpen = (nextOpen: boolean) => {
    if (openProp === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const groupedOptions = useMemo(() => buildGroups(options, groups), [options, groups]);
  const selected = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);
  const isDisabled = disabled || isLoading;

  const handleSelect = (nextValue: string) => {
    if (isDisabled) return;
    onChange?.(nextValue);
    setOpen(false);
  };

  const renderOption = (option: StatusOption) => {
    const isSelected = option.value === value;
    return (
      <CommandItem
        key={option.value}
        value={option.value}
        onSelect={() => handleSelect(option.value)}
        className={cn(
          'flex items-center justify-between gap-2 cursor-pointer',
          'border-l-2 pl-2 py-1.5',
          isSelected ? 'border-l-blue-500 bg-gray-100' : 'border-l-transparent',
          'hover:bg-gray-100'
        )}
        disabled={isDisabled}
      >
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge label={option.label} tone={option.tone ?? 'default'} className="shrink-0" />
        </div>
        {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
      </CommandItem>
    );
  };

  const renderGroup = (group: StatusWorkflowGroup) => (
    <CommandGroup key={group.id} heading={group.label || undefined}>
      {group.statuses.map(renderOption)}
    </CommandGroup>
  );

  const renderList = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-6 text-sm text-gray-500">
          Loading...
        </div>
      );
    }
    if (options.length === 0) {
      return <CommandEmpty>No status found</CommandEmpty>;
    }
    return groupedOptions.map(renderGroup);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
            'bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
            isDisabled && 'cursor-not-allowed opacity-70',
            className,
            triggerClassName
          )}
          disabled={isDisabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selected ? (
            <StatusBadge label={selected.label} tone={selected.tone ?? 'default'} showChevron />
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-[240px] p-0', contentClassName)}
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => commandRef.current?.focus());
        }}
      >
        <Command
          shouldFilter={false}
          ref={commandRef}
          tabIndex={0}
          aria-label="Status options"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          <CommandList className="bg-gray-50">
            {renderList()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default StatusDropdown;
