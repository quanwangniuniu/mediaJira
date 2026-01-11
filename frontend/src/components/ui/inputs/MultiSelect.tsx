import * as React from "react";
import { X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../popover";
import { cn } from "@/lib/utils";
import Icon from "../Icon";

export interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface MultiSelectProps {
  /** Label text for the multi-select */
  label?: string;
  /** Array of options to display */
  options: MultiSelectOption[];
  /** Array of currently selected values */
  value?: string[];
  /** Placeholder text when no options are selected */
  placeholder?: string;
  /** Helper text displayed below the multi-select */
  helperText?: string;
  /** Error message displayed when error is true */
  errorText?: string;
  /** Whether the multi-select is in an error state */
  error?: boolean;
  /** Whether the multi-select is disabled */
  disabled?: boolean;
  /** Whether the multi-select is required */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback fired when the selected values change */
  onValueChange?: (value: string[]) => void;
}

const MultiSelect = React.forwardRef<
  HTMLButtonElement,
  MultiSelectProps
>(({
  className,
  label,
  options,
  value = [],
  placeholder = "Select options",
  helperText,
  errorText,
  error,
  disabled,
  required,
  onValueChange,
  ...props
}, ref) => {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange?.(newValue);
  };

  const handleRemove = (optionValue: string) => {
    const newValue = value.filter((v) => v !== optionValue);
    onValueChange?.(newValue);
  };

  const selectedOptions = options.filter((option) =>
    value.includes(option.value)
  );

  const selectId = React.useId();

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={ref}
            id={selectId}
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-500 focus:ring-red-500",
              !value.length && "text-muted-foreground"
            )}
            {...props}
          >
            <div className="flex flex-wrap gap-1">
              {selectedOptions.length > 0 ? (
                selectedOptions.map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
                  >
                    {option.label}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(option.value);
                      }}
                      className="hover:bg-primary-foreground/20 rounded-sm p-0.5"
                    >
                      <Icon name="x" size="xs" />
                    </button>
                  </span>
                ))
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            <Icon
              name="chevron-down"
              size="sm"
              className={cn(
                "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search options..." />
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    disabled={option.disabled}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground"
                        )}
                      >
                        {isSelected && <Icon name="check" size="xs" />}
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}

      {error && errorText && (
        <p className="text-sm text-red-600">{errorText}</p>
      )}
    </div>
  );
});

MultiSelect.displayName = "MultiSelect";

export { MultiSelect };

