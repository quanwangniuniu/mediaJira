'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export interface InlineSelectControllerProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onSave: (value: T) => Promise<void> | void;
  validate?: (value: T) => string | null;
  className?: string;
  renderTrigger?: (value: T, label: string) => React.ReactNode;
  placeholder?: string;
}

function InlineSelectController<T extends string>({
  value: initialValue,
  options,
  onSave,
  validate,
  className = '',
  renderTrigger,
  placeholder = 'Click to select',
}: InlineSelectControllerProps<T>) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalValueRef = useRef<T>(initialValue);
  const selectRef = useRef<HTMLButtonElement>(null);

  // Sync value when initialValue changes externally (only when not editing)
  useEffect(() => {
    if (!isEditing && value !== initialValue) {
      setValue(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing, value]);

  // Focus select when entering edit mode
  useEffect(() => {
    if (isEditing && selectRef.current) {
      // Small delay to ensure the select is rendered
      setTimeout(() => {
        selectRef.current?.click();
      }, 0);
    }
  }, [isEditing]);

  const getLabel = useCallback(
    (val: T) => {
      return options.find((opt) => opt.value === val)?.label || val;
    },
    [options]
  );

  const handleSave = useCallback(async () => {
    // Validate
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // If value hasn't changed, just exit edit mode
    if (value === originalValueRef.current) {
      setIsEditing(false);
      return;
    }

    // Save
    try {
      setIsLoading(true);
      setError(null);
      await onSave(value);
      originalValueRef.current = value;
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsLoading(false);
    }
  }, [value, validate, onSave]);

  const handleValueChange = useCallback(
    (newValue: T) => {
      setValue(newValue);
      // Auto-save on selection
      setTimeout(() => {
        handleSave();
      }, 100);
    },
    [handleSave]
  );

  const handleCancel = useCallback(() => {
    setValue(originalValueRef.current);
    setIsEditing(false);
    setError(null);
  }, []);

  const startEdit = useCallback(() => {
    originalValueRef.current = value;
    setIsEditing(true);
    setError(null);
  }, [value]);

  if (isEditing) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Select
          value={value}
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger
            ref={selectRef}
            className="h-auto py-1 px-2 text-sm"
            onBlur={handleCancel}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
              }
            }}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  const currentLabel = getLabel(value);
  const triggerContent = renderTrigger ? renderTrigger(value, currentLabel) : currentLabel;

  return (
    <span
      onClick={startEdit}
      className={`cursor-pointer hover:text-blue-600 transition-colors ${className}`}
      title="Click to edit"
    >
      {triggerContent}
    </span>
  );
}

export default InlineSelectController;

