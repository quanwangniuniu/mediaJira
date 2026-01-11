import * as React from "react";
import {
  Select as SelectPrimitive,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Label text for the select */
  label?: string;
  /** Array of options to display */
  options: SelectOption[];
  /** Currently selected value */
  value?: string;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error message displayed when error is true */
  errorText?: string;
  /** Whether the select is in an error state */
  error?: boolean;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether the select is required */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback fired when the selected value changes */
  onValueChange?: (value: string) => void;
}

const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive>,
  SelectProps
>(({
  className,
  label,
  options,
  value,
  placeholder,
  helperText,
  errorText,
  error,
  disabled,
  required,
  onValueChange,
  ...props
}, ref) => {
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

      <SelectPrimitive value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          ref={ref}
          id={selectId}
          className={cn(
            error && "border-red-500 focus:ring-red-500"
          )}
          {...props}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPrimitive>

      {helperText && !error && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}

      {error && errorText && (
        <p className="text-sm text-red-600">{errorText}</p>
      )}
    </div>
  );
});

Select.displayName = "Select";

export { Select };
