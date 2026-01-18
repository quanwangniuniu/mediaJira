import { useEffect, useRef } from 'react';

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
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement>;
};

export function useFocusTrap({ isOpen, onClose, containerRef }: UseFocusTrapOptions) {
  const triggerRef = useRef<HTMLElement | null>(null);

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
      getInitialFocus(container).focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

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
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!container.contains(event.target as Node)) {
        focusFirst();
      }
    };

    const raf = requestAnimationFrame(focusFirst);
    container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      cancelAnimationFrame(raf);
      container.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen, onClose, containerRef]);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    const trigger = triggerRef.current;
    if (trigger) {
      requestAnimationFrame(() => trigger.focus());
    }
  }, [isOpen]);
}
