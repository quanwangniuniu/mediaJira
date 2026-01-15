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
import Label, { LabelData } from './Label';

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

  // Filter labels based on search query
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return availableLabels;
    const query = searchQuery.toLowerCase();
    return availableLabels.filter((label) => {
      const name = label.name.toLowerCase();
      return name.includes(query);
    });
  }, [availableLabels, searchQuery]);

  // Check if search query matches a new label to create
  const canCreateNewLabel = useMemo(() => {
    if (!allowCreate || !searchQuery.trim() || isCreating) return false;
    const query = searchQuery.trim().toLowerCase();
    // Check if label already exists
    const exists = availableLabels.some(
      (label) => label.name.toLowerCase() === query
    );
    // Check if already selected
    const selected = selectedLabelIds.has(query);
    return !exists && !selected;
  }, [allowCreate, searchQuery, isCreating, availableLabels, selectedLabelIds]);

  const handleToggleLabel = (label: LabelData) => {
    const isSelected = selectedLabelIds.has(String(label.id));
    if (isSelected) {
      // Remove from selection
      const newSelection = selectedLabels.filter((l) => l.id !== label.id);
      onChange?.(newSelection);
    } else {
      // Add to selection
      onChange?.([...selectedLabels, label]);
    }
  };

  const handleSingleSelect = (label: LabelData) => {
    onChange?.([label]);
    setOpen(false);
    setSearchQuery('');
  };

  const handleSelect = multiple ? handleToggleLabel : handleSingleSelect;

  const handleCreateLabelMultiple = async (normalizedNewLabel: LabelData) => {
    onChange?.([...selectedLabels, normalizedNewLabel]);
  };

  const handleCreateLabelSingle = async (normalizedNewLabel: LabelData) => {
    onChange?.([normalizedNewLabel]);
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
          <button
            type="button"
            aria-expanded={open}
            aria-controls="label-options"
            aria-haspopup="listbox"
            disabled={disabled || loading}
            className={cn(
              'w-full min-h-[36px] flex items-center gap-2 px-3 py-1.5 text-sm',
              'border border-black/30 rounded-md bg-white hover:bg-white',
              'focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/40',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              'flex-wrap'
            )}
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
                      showRemove
                      onRemove={handleRemove}
                      maxWidth="200px"
                    />
                  ))}
                  {remainingCount > 0 && (
                    <span className="text-xs text-gray-500 px-2">
                      +{remainingCount} more
                    </span>
                  )}
                </div>
              );
            })()}
          </button>
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
