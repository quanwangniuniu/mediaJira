import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseInlineEditOptions {
  initialValue: string;
  onSave: (value: string) => Promise<void> | void;
  enableBlurToSave?: boolean;
  validate?: (value: string) => Promise<string | null> | string | null;
  inputType?: 'input' | 'textarea';
}

export interface UseInlineEditReturn {
  isEditing: boolean;
  value: string;
  setValue: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  startEdit: () => void;
  save: () => void;
  cancel: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleBlur: () => void;
}


// Hook for managing inline edit state and logic
 
export const useInlineEdit = ({
  initialValue,
  onSave,
  enableBlurToSave = true,
  validate,
  inputType = 'input',
}: UseInlineEditOptions): UseInlineEditReturn => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const originalValueRef = useRef(initialValue);

  // Sync value when initialValue changes externally (only when not editing)
  useEffect(() => {
    if (!isEditing && value !== initialValue) {
      setValue(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing, value]);

  const startEdit = useCallback(() => {
    originalValueRef.current = value;
    setIsEditing(true);
    setError(null);
  }, [value]);

  const cancel = useCallback(() => {
    setValue(originalValueRef.current);
    setIsEditing(false);
    setError(null);
  }, []);

  const save = useCallback(async () => {
    // Validate
    if (validate) {
      const validationError = await validate(value);
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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        // For textarea, require Ctrl/Cmd + Enter to save
        if (inputType === 'textarea') {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            save();
          }
          // Otherwise, allow Enter for new line
        } else {
          // For input, Enter directly saves
          e.preventDefault();
          save();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [save, cancel, inputType]
  );

  const handleBlur = useCallback(() => {
    if (enableBlurToSave) {
      save();
    } else {
      cancel();
    }
  }, [enableBlurToSave, save, cancel]);

  return {
    isEditing,
    value,
    setValue,
    isLoading,
    error,
    startEdit,
    save,
    cancel,
    handleKeyDown,
    handleBlur,
  };
};

