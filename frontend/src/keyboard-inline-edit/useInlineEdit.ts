import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseInlineEditOptions {
  onCancel?: () => void;
  autoFocus?: boolean;
}

export interface UseInlineEditReturn<T> {
  isEditing: boolean;
  draft: T;
  setDraft: (next: T) => void;
  beginEdit: () => void;
  commit: () => void;
  cancel: () => void;
  viewProps: {
    ref: (el: HTMLElement | null) => void;
    tabIndex: number;
    role: 'button';
    onKeyDown: (e: React.KeyboardEvent) => void;
    onClick: () => void;
  };
  inputProps: {
    ref: (el: HTMLElement | null) => void;
    value: T;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

/**
 * Generic hook for inline editing with keyboard shortcuts and focus management.
 * Supports Enter to start editing, Esc to cancel/revert, and native Tab navigation.
 */
export function useInlineEdit<T>(
  value: T,
  onCommit: (next: T) => void,
  options: UseInlineEditOptions = {}
): UseInlineEditReturn<T> {
  const { onCancel, autoFocus = true } = options;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<T>(value);
  const originalValueRef = useRef<T>(value);
  const inputRef = useRef<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Sync draft with external value changes when not editing
  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
      originalValueRef.current = value;
    }
  }, [value, isEditing]);

  const beginEdit = useCallback(() => {
    originalValueRef.current = value;
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const commit = useCallback(() => {
    onCommit(draft);
    setIsEditing(false);
    // Return focus to trigger element
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, [draft, onCommit]);

  const cancel = useCallback(() => {
    setDraft(originalValueRef.current);
    setIsEditing(false);
    onCancel?.();
    // Return focus to trigger element
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, [onCancel]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && autoFocus && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [isEditing, autoFocus]);

  const handleViewKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        beginEdit();
      }
    },
    [beginEdit]
  );

  const handleViewClick = useCallback(() => {
    beginEdit();
  }, [beginEdit]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // For generic T, we assume the input value can be cast to T
      // In practice, you might need type guards or converters based on your use case
      setDraft(e.target.value as T);
    },
    []
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        // For textarea, require Ctrl/Cmd + Enter to commit
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            commit();
          }
          // Otherwise, allow Enter for new line
        } else {
          // For input, Enter directly commits
          e.preventDefault();
          commit();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
      // Tab is not handled - let native behavior work
    },
    [commit, cancel]
  );

  return {
    isEditing,
    draft,
    setDraft,
    beginEdit,
    commit,
    cancel,
    viewProps: {
      ref: (el) => {
        triggerRef.current = el;
      },
      tabIndex: 0,
      role: 'button',
      onKeyDown: handleViewKeyDown,
      onClick: handleViewClick,
    },
    inputProps: {
      ref: (el) => {
        inputRef.current = el;
      },
      value: draft,
      onChange: handleInputChange,
      onKeyDown: handleInputKeyDown,
    },
  };
}

