import { useCallback, useEffect, useRef } from 'react';

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

function getInitialFocus(container: HTMLElement) {
  const preferred = container.querySelector<HTMLElement>('[data-autofocus], [autofocus]');
  if (preferred && !preferred.hasAttribute('disabled') && !preferred.getAttribute('aria-hidden')) {
    return preferred;
  }
  const focusable = getFocusableElements(container);
  return focusable[0] ?? container;
}

type UseFocusTrapOptions = {
  isOpen: boolean;
  onClose?: () => void;
  containerRef: React.RefObject<HTMLElement>;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
};

export function useFocusTrap({
  isOpen,
  onClose,
  containerRef,
}: UseFocusTrapOptions): {
  handleKeyDown: (event: React.KeyboardEvent) => void;
  handleFocusCapture: () => void;
} {
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [containerRef]
  );

  const handleFocusCapture = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!container.contains(document.activeElement)) {
      getInitialFocus(container).focus();
    }
  }, [containerRef]);

  useEffect(() => {
    if (!isOpen) return;

    triggerRef.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    if (!container) return;

    const focusFirst = () => getInitialFocus(container).focus();

    const handleFocusIn = (event: FocusEvent) => {
      if (!container.contains(event.target as Node)) {
        focusFirst();
      }
    };

    const raf = requestAnimationFrame(focusFirst);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen, containerRef]);

  useEffect(() => {
    if (isOpen) return;
    const trigger = triggerRef.current;
    if (trigger) {
      requestAnimationFrame(() => trigger.focus());
    }
  }, [isOpen]);

  return { handleKeyDown, handleFocusCapture };
}
