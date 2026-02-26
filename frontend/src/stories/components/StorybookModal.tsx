'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Storybook-specific Modal that portals into the story canvas (element with data-modal-root)
 * when present, so modals appear inside the Storybook window instead of the main document.
 * Drop-in replacement for @/components/ui/Modal - same API.
 */
export default function StorybookModal({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const portalTarget =
    document.querySelector('[data-modal-root]') || document.body;
  const isContained = portalTarget !== document.body;

  return createPortal(
    <div
      className={`z-50 flex items-center justify-center overflow-y-auto p-4 ${
        isContained ? 'absolute inset-0' : 'fixed inset-0'
      }`}
    >
      <div
        className={`bg-black bg-opacity-50 transition-opacity ${
          isContained ? 'absolute inset-0' : 'fixed inset-0'
        }`}
        onClick={onClose}
      />
      <div className="relative z-10 mx-auto">{children}</div>
    </div>,
    portalTarget
  );
}
