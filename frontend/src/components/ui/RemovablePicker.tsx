'use client';

import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type PickerOption = { value: string; label: string };

export interface RemovablePickerProps {
  options: PickerOption[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function RemovablePicker({
  options,
  value = null,
  onChange,
  placeholder = "Select option",
  disabled,
  loading = false,
  className,
}: RemovablePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || null;

  const handleSelect = (nextValue: string) => {
    if (nextValue === value) {
      onChange?.(null);
    } else {
      onChange?.(nextValue);
    }
    setOpen(false);
  };

  const handleClear: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!disabled) onChange?.(null);
  };

  return (
    <div className={cn("relative w-64", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              "flex h-9 w-full items-center rounded-md border border-slate-300 bg-white px-3 pr-14 text-left text-sm text-slate-900",
              "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0c66e4]/20 focus:border-[#0c66e4]",
              "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
              !selected && "text-slate-400"
            )}
          >
            {loading ? (
              <span className="truncate text-slate-500">Loading...</span>
            ) : (
              <span className="truncate">{selected?.label || placeholder}</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0"
          align="start"
        >
          <Command>
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-slate-500">
                  Loading options...
                </div>
              ) : options.length === 0 ? (
                <CommandEmpty>No options available</CommandEmpty>
              ) : (
                <>
                  <CommandEmpty>No results.</CommandEmpty>
                  <CommandGroup>
                    {options.map((option) => {
                      const isSelected = option.value === value;
                      return (
                        <CommandItem
                          key={option.value}
                          onSelect={() => handleSelect(option.value)}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">{option.label}</span>
                          {isSelected ? <Check className="h-4 w-4 text-[#0c66e4]" /> : null}
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

      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />

      {selected ? (
        <button
          type="button"
          onClick={handleClear}
          onMouseDown={(event) => event.preventDefault()}
          className="absolute right-7 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
