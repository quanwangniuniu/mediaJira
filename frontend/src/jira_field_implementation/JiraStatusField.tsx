'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import JiraField from '../jira_field_pattern/JiraField';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

export type IssueStatusTone = 'todo' | 'in_progress' | 'done' | 'default';

export interface IssueStatusOption {
  value: string;
  label: string;
  tone?: IssueStatusTone;
}

export interface IssueStatusFieldProps {
  label?: string;
  value?: string | null;
  options?: IssueStatusOption[];
  editable?: boolean;
  isEditing?: boolean;
  isLoading?: boolean;
  error?: string;
  emptyText?: string;
  labelWidth?: string;
  className?: string;
  onChange?: (value: string) => void;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}

const DEFAULT_STATUS_OPTIONS: IssueStatusOption[] = [
  { value: 'todo', label: 'TO DO', tone: 'todo' },
  { value: 'in_progress', label: 'IN PROGRESS', tone: 'in_progress' },
  { value: 'in_review', label: 'IN REVIEW', tone: 'in_progress' },
  { value: 'done', label: 'DONE', tone: 'done' },
];

const statusToneClasses: Record<IssueStatusTone, string> = {
  todo: 'bg-gray-200 text-black',
  in_progress: 'bg-blue-200 text-black',
  done: 'bg-green-400 text-black',
  default: 'bg-gray-200 text-black',
};

type StatusLozengeProps = Readonly<{
  label: string;
  tone?: IssueStatusTone;
  className?: string;
  showChevron?: boolean;
}>;

function StatusLozenge({
  label,
  tone = 'default',
  className,
  showChevron = false,
}: StatusLozengeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-between gap-1 rounded-sm px-2.5 py-1 text-xs font-semibold uppercase tracking-wide',
        statusToneClasses[tone],
        className
      )}
    >
      {label}
      {showChevron && <ChevronDown className="h-3.5 w-3.5" />}
    </span>
  );
}

type StatusPickerProps = Readonly<{
  options: IssueStatusOption[];
  value?: string | null;
  isLoading?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
}>;

function StatusPicker({
  options,
  value,
  isLoading,
  onSelect,
  onClose,
}: StatusPickerProps) {
  const filteredOptions = useMemo(() => options, [options]);

  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (open) return;
        onClose();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm',
            'bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-0',
            isLoading && 'cursor-not-allowed opacity-70'
          )}
          disabled={isLoading}
        >
          {selected ? (
            <StatusLozenge
              label={selected.label}
              tone={selected.tone ?? 'default'}
              showChevron
            />
          ) : (
            <span className="text-gray-500">Select status</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command shouldFilter={false}>
        <CommandList className="bg-gray-50">
            {(() => {
              if (isLoading) {
                return (
                  <div className="flex items-center justify-center py-6 text-sm text-gray-500">
                    Loading...
                  </div>
                );
              }
              if (filteredOptions.length === 0) {
                return <CommandEmpty>No status found</CommandEmpty>;
              }
              return (
                <CommandGroup>
                  {filteredOptions.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => onSelect(option.value)}
                        className={cn(
                          'flex items-center justify-between gap-2 cursor-pointer',
                          'border-l-2 pl-2 py-1.5',
                          isSelected ? 'border-l-blue-500 bg-gray-100' : 'border-l-transparent',
                          'hover:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusLozenge
                            label={option.label}
                            tone={option.tone ?? 'default'}
                            className="shrink-0"
                          />
                        </div>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              );
            })()}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const IssueStatusField: React.FC<IssueStatusFieldProps> = ({
  label = 'Status',
  value = null,
  options = DEFAULT_STATUS_OPTIONS,
  editable = true,
  isEditing: isEditingProp,
  isLoading = false,
  error,
  emptyText = 'No status',
  labelWidth,
  className,
  onChange,
  onEditStart,
  onEditCancel,
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = isEditingProp ?? internalEditing;

  const selected = options.find((option) => option.value === value) ?? null;
  const canEdit = editable && Boolean(onChange);
  const showLoading = isLoading && !isEditing;

  const startEdit = () => {
    if (!canEdit) return;
    onEditStart?.();
    if (isEditingProp === undefined) {
      setInternalEditing(true);
    }
  };

  const cancelEdit = () => {
    onEditCancel?.();
    if (isEditingProp === undefined) {
      setInternalEditing(false);
    }
  };

  const handleSelect = (nextValue: string) => {
    onChange?.(nextValue);
    cancelEdit();
  };

  return (
    <JiraField
      label={label}
      value={
        selected ? (
          <StatusLozenge label={selected.label} tone={selected.tone ?? 'default'} showChevron />
        ) : null
      }
      valueText={selected?.label ?? ''}
      emptyText={emptyText}
      editable={canEdit}
      isEditing={isEditing}
      isLoading={showLoading}
      error={error}
      labelWidth={labelWidth}
      className={className}
      onEditStart={startEdit}
      onEditCancel={cancelEdit}
      showEditIcon={false}
      valueClassName="hover:bg-transparent focus:bg-transparent"
      editor={
        <StatusPicker
          options={options}
          value={value}
          isLoading={isLoading}
          onSelect={handleSelect}
          onClose={cancelEdit}
        />
      }
    />
  );
};

export default IssueStatusField;
