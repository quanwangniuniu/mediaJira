import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement) {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((node) => !node.hasAttribute('disabled') && !node.getAttribute('aria-hidden'));
}

function getInitialFocus(container: HTMLElement, initialFocusRef?: React.RefObject<HTMLElement>) {
  if (initialFocusRef?.current) {
    return initialFocusRef.current;
  }
  const preferred = container.querySelector<HTMLElement>('[data-autofocus], [autofocus]');
  if (preferred && !preferred.hasAttribute('disabled') && !preferred.getAttribute('aria-hidden')) {
    return preferred;
  }
  const focusable = getFocusableElements(container);
  return focusable[0] ?? container;
}

type UseFocusTrapOptions = {
  isOpen: boolean;
  containerRef: React.RefObject<HTMLElement>;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
};

export function useFocusTrap({ 
  isOpen, 
  containerRef, 
  initialFocusRef, 
  returnFocusRef 
}: UseFocusTrapOptions) {
  const triggerRef = useRef<HTMLElement | null>(null);

  // Focus initial element when opened
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    triggerRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const focusFirst = () => {
      const element = getInitialFocus(container, initialFocusRef);
      element?.focus();
    };

    requestAnimationFrame(focusFirst);
  }, [isOpen, containerRef, initialFocusRef]);

  // Return focus when closed
  useEffect(() => {
    if (isOpen) {
      return;
    }
    const trigger = returnFocusRef?.current || triggerRef.current;
    if (trigger) {
      requestAnimationFrame(() => trigger.focus());
    }
  }, [isOpen, returnFocusRef]);

  // Handle keyboard events for focus trapping
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      e.preventDefault();
      container.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, [containerRef]);

  // Handle focus capture to keep focus within container
  const handleFocusCapture = useCallback((e: React.FocusEvent) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (!container.contains(e.target as Node)) {
      e.preventDefault();
      const element = getInitialFocus(container, initialFocusRef);
      element?.focus();
    }
  }, [containerRef, initialFocusRef]);

  return {
    handleKeyDown,
    handleFocusCapture,
  };
}
