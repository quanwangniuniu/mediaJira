'use client';

import React, { useState, useMemo } from 'react';
import { Check, Plus } from 'lucide-react';
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
import Label, { LabelData } from './JiraLabel';
import JiraPickerTrigger from './JiraPickerTrigger';

export interface LabelPickerProps {
  value?: LabelData[];
  onChange?: (labels: LabelData[]) => void;
  availableLabels?: LabelData[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  createLabelPlaceholder?: string;
  allowCreate?: boolean;
  onCreateLabel?: (name: string) => LabelData | Promise<LabelData>;
  maxDisplayed?: number;
  multiple?: boolean;
}

const LabelPicker: React.FC<LabelPickerProps> = ({
  value = [],
  onChange,
  availableLabels = [],
  placeholder = 'Add label',
  disabled = false,
  loading = false,
  className = '',
  searchPlaceholder = 'Search labels',
  emptyMessage = 'No labels found',
  createLabelPlaceholder = 'Create label',
  allowCreate = true,
  onCreateLabel,
  maxDisplayed = 3,
  multiple = true,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedLabels = value || [];
  const selectedLabelIds = new Set(selectedLabels.map((label) => label.id));

  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return availableLabels;
    const query = searchQuery.toLowerCase();
    return availableLabels.filter((label) => label.name.toLowerCase().includes(query));
  }, [availableLabels, searchQuery]);

  const canCreateNewLabel = useMemo(() => {
    if (!allowCreate || !searchQuery.trim() || isCreating) return false;
    const query = searchQuery.trim().toLowerCase();
    const exists = availableLabels.some((label) => label.name.toLowerCase() === query);
    const selected = selectedLabelIds.has(query);
    return !exists && !selected;
  }, [allowCreate, searchQuery, isCreating, availableLabels, selectedLabelIds]);

  const handleToggleLabel = (label: LabelData) => {
    const isSelected = selectedLabelIds.has(String(label.id));
    if (isSelected) {
      const newSelection = selectedLabels.filter((l) => l.id !== label.id);
      onChange?.(newSelection);
    } else {
      onChange?.([...selectedLabels, label]);
    }
  };

  const handleSingleSelect = (label: LabelData) => {
    onChange?.([label]);
    setOpen(false);
    setSearchQuery('');
  };

  const handleSelect = multiple ? handleToggleLabel : handleSingleSelect;

  const handleCreateLabelMultiple = async (newLabel: LabelData) => {
    onChange?.([...selectedLabels, newLabel]);
  };

  const handleCreateLabelSingle = async (newLabel: LabelData) => {
    onChange?.([newLabel]);
    setOpen(false);
  };

  const handleCreateLabel = async () => {
    if (!canCreateNewLabel || !onCreateLabel) return;
    setIsCreating(true);
    try {
      const newLabel = await onCreateLabel(searchQuery.trim());
      if (!newLabel) return;
      if (multiple) {
        await handleCreateLabelMultiple(newLabel);
      } else {
        await handleCreateLabelSingle(newLabel);
      }
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create label:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRemove = (label: LabelData) => {
    const newSelection = selectedLabels.filter((l) => l.id !== label.id);
    onChange?.(newSelection);
  };

  const displayLabels = selectedLabels.slice(0, maxDisplayed);
  const remainingCount = selectedLabels.length - maxDisplayed;

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <JiraPickerTrigger
            aria-expanded={open}
            aria-controls="label-options"
            aria-haspopup="listbox"
            disabled={disabled}
            loading={loading}
            placeholder={placeholder}
            selectedLabels={selectedLabels}
            maxDisplayed={maxDisplayed}
            onRemoveLabel={handleRemove}
          />
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black/60"></div>
                    <span className="text-sm text-gray-500">Loading labels...</span>
                  </div>
                </div>
              ) : (
                <>
                  {canCreateNewLabel && (
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateLabel}
                        className="flex items-center gap-2 cursor-pointer"
                        disabled={isCreating}
                      >
                        <Plus className="h-4 w-4 text-black/70" />
                        <span className="font-medium">
                          {createLabelPlaceholder}: &quot;{searchQuery.trim()}&quot;
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {filteredLabels.length === 0 && !canCreateNewLabel ? (
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {filteredLabels.map((label) => {
                        const isSelected = selectedLabelIds.has(String(label.id));
                        return (
                          <CommandItem
                            key={label.id}
                            onSelect={() => handleSelect(label)}
                            className="flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Label label={label} size="sm" maxWidth="200px" />
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 flex-shrink-0 text-black/70" />
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default LabelPicker;
