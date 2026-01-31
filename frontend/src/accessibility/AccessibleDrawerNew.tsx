import React, { useRef } from 'react';
import { useFocusTrap } from './useFocusTrap';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AccessibleDrawerProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

function useStableId(prefix: string) {
  const ref = useRef<string | null>(null);
  if (!ref.current) {
    ref.current = `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return ref.current!;
}

export const AccessibleDrawer: React.FC<AccessibleDrawerProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  initialFocusRef,
  returnFocusRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleId = useStableId('drawer-title');
  const descId = useStableId('drawer-desc');

  const { handleKeyDown, handleFocusCapture } = useFocusTrap({
    containerRef,
    initialFocusRef,
    returnFocusRef,
    isOpen: open,
    onClose: () => onOpenChange(false),
  });

  const handleKeyDownWithEscape = (e: React.KeyboardEvent) => {
    // Handle Escape key to close drawer
    if (e.key === 'Escape') {
      e.stopPropagation();
      onOpenChange(false);
      return;
    }

    // Handle focus trapping
    handleKeyDown(e);
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={() => onOpenChange(false)}
      className="fixed inset-0 z-50 flex justify-end bg-black/80"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownWithEscape}
        onFocusCapture={handleFocusCapture}
        className={cn(
          "w-96 max-w-[90vw] h-full bg-white shadow-xl",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
          "overflow-y-auto"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            onClick={() => onOpenChange(false)}
            className={cn(
              "inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-300",
              "bg-white text-slate-700 hover:bg-slate-50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
              "transition-colors"
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Description */}
        {description && (
          <p id={descId} className="px-6 pt-3 text-sm text-slate-600">
            {description}
          </p>
        )}

        {/* Content */}
        <div className="px-6 py-4">
          {children}
        </div>
      </aside>
    </div>
  );
};

export default AccessibleDrawer;


