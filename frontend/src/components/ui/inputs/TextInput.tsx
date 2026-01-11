import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text for the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message displayed when error is true */
  errorText?: string;
  /** Whether the input is in an error state */
  error?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the input is required */
  required?: boolean;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({
    className,
    type = "text",
    label,
    helperText,
    errorText,
    error,
    required,
    id,
    ...props
  }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <input
          type={type}
          id={inputId}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500",
            !error && "focus-visible:ring-ring"
          )}
          ref={ref}
          {...props}
        />

        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}

        {error && errorText && (
          <p className="text-sm text-red-600">{errorText}</p>
        )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";

export { TextInput };

