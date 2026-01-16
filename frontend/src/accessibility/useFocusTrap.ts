import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { getFocusableElements } from './utils';

interface UseFocusTrapOptions {
  containerRef: RefObject<HTMLElement>;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  isOpen: boolean;
}

export function useFocusTrap({
  containerRef,
  initialFocusRef,
  returnFocusRef,
  isOpen,
}: UseFocusTrapOptions) {
  const savedTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // save trigger if returnFocusRef not provided
      savedTriggerRef.current = document.activeElement as HTMLElement | null;

      requestAnimationFrame(() => {
        const target =
          initialFocusRef?.current ?? getFocusableElements(containerRef.current)[0];

        if (target) {
          target.focus();
        } else {
          containerRef.current?.setAttribute('tabindex', '-1');
          containerRef.current?.focus();
        }
      });
    } else {
      requestAnimationFrame(() => {
        const toFocus = returnFocusRef?.current ?? savedTriggerRef.current;
        if (toFocus && typeof toFocus.focus === 'function') {
          toFocus.focus();
        }
      });
    }
  }, [isOpen, initialFocusRef, returnFocusRef, containerRef]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || e.key !== 'Tab') return;

    const focusable = getFocusableElements(containerRef.current);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (!active) return;

    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }
  };

  const handleFocusCapture = (e: React.FocusEvent) => {
    if (!isOpen) return;
    const target = e.target as HTMLElement;
    if (!containerRef.current) return;
    if (containerRef.current.contains(target)) return;

    const focusable = getFocusableElements(containerRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      containerRef.current.focus();
    }
  };

  return { handleKeyDown, handleFocusCapture };
}


