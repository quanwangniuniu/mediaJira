'use client';
import { useEffect, useState } from "react";

import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";


/**
 * RemovablePicker
 * A simple single-select picker with a dropdown and an inline clear (X) to remove the selection.
 */
export type PickerOption = { value: string; label: string };

export interface RemovablePickerProps {
  options: PickerOption[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean; // any loading state passed from the parent component
  className?: string;
}

export function RemovablePicker({
  options,
  value = null,
  onChange,
  placeholder = "Select…",
  disabled,
  loading = false,
  className,
}: RemovablePickerProps) {

  const [open, setOpen] = useState(false);



  const selected = options.find((o) => o.value === value) || null;

  const handleSelect = (val: string) => {
    if (val === value) {
      onChange?.(null);
    } else {
      onChange?.(val);
    }
    setOpen(false);
  };

  const handleClear: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled) onChange?.(null);
  };

  return (
    <div className={cn("relative w-64", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              "w-full justify-between gap-2 pr-8 flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed",
              !selected && "text-muted-foreground"
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="text-gray-500">Loading...</span>
                </div>
              ) : selected ? (
                <Badge className="truncate max-w-[13rem] bg-gray-100 text-gray-800 hover:bg-gray-100">
                  {selected.label}
                </Badge>
              ) : (
                <span className="truncate">{placeholder}</span>
              )}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span className="text-sm text-gray-500">Loading options...</span>
                  </div>
                </div>
              ) : options.length === 0 ? (
                <CommandEmpty>No options available</CommandEmpty>
              ) : (
                <>
                  <CommandEmpty>No results.</CommandEmpty>
                  <CommandGroup>
                    {options.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <CommandItem
                          key={opt.value}
                          onSelect={() => handleSelect(opt.value)}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <Check className="h-4 w-4" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && (
        <button
          type="button"
          onClick={handleClear}
          onMouseDown={(e) => e.preventDefault()} // keep popover closed
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4 opacity-70 hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

