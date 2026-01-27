import { useCallback, useEffect, useRef, useState } from 'react';

export type UseInlineEditOptions = {
  onCancel?: () => void;
  autoFocus?: boolean;
};

type ViewProps = {
  tabIndex: number;
  role: 'button';
  onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
};

type InputProps = {
  ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => void;
  value: any;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

export type UseInlineEditReturn<T> = {
  isEditing: boolean;
  draft: T;
  setDraft: (next: T) => void;
  beginEdit: () => void;
  commit: () => void;
  cancel: () => void;
  viewProps: ViewProps;
  inputProps: InputProps;
};

export function useInlineEdit<T>(
  value: T,
  onCommit: (next: T) => void,
  options: UseInlineEditOptions = {}
): UseInlineEditReturn<T> {
  const { onCancel, autoFocus = true } = options;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const originalValueRef = useRef(value);
  const triggerRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
      originalValueRef.current = value;
    }
  }, [isEditing, value]);

  useEffect(() => {
    if (isEditing && autoFocus) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isEditing, autoFocus]);

  const focusTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, []);

  const beginEdit = useCallback(() => {
    originalValueRef.current = value;
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const commit = useCallback(() => {
    onCommit(draft);
    originalValueRef.current = draft;
    setIsEditing(false);
    focusTrigger();
  }, [draft, onCommit, focusTrigger]);

  const cancel = useCallback(() => {
    setDraft(originalValueRef.current);
    setIsEditing(false);
    onCancel?.();
    focusTrigger();
  }, [focusTrigger, onCancel]);

  const viewProps: ViewProps = {
    tabIndex: 0,
    role: 'button',
    onKeyDown: (event) => {
      if (event.key !== 'Enter') {
        return;
      }
      event.preventDefault();
      triggerRef.current = event.currentTarget;
      beginEdit();
    },
    onClick: (event) => {
      triggerRef.current = event.currentTarget;
      beginEdit();
    },
  };

  const inputProps: InputProps = {
    ref: (element) => {
      inputRef.current = element;
    },
    value: draft as any,
    onChange: (event) => {
      setDraft(event.target.value as unknown as T);
    },
    onKeyDown: (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
        return;
      }

      if (event.key === 'Enter') {
        const isTextArea = event.currentTarget.tagName === 'TEXTAREA';
        if (isTextArea) {
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            commit();
          }
          return;
        }
        event.preventDefault();
        commit();
      }
    },
  };

  return {
    isEditing,
    draft,
    setDraft,
    beginEdit,
    commit,
    cancel,
    viewProps,
    inputProps,
  };
}
