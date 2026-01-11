import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label text for the textarea */
  label?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
  /** Error message displayed when error is true */
  errorText?: string;
  /** Whether the textarea is in an error state */
  error?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the textarea is required */
  required?: boolean;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    className,
    label,
    helperText,
    errorText,
    error,
    required,
    id,
    rows = 3,
    ...props
  }, ref) => {
    const textareaId = id || React.useId();

    return (
      <div className={cn("space-y-2", className)}>
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          id={textareaId}
          rows={rows}
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y",
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

TextArea.displayName = "TextArea";

export { TextArea };

