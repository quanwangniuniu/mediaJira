import { useId, useRef, useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

export function FocusTrapModalDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const { handleKeyDown, handleFocusCapture } = useFocusTrap({
    isOpen,
    onClose: () => setIsOpen(false),
    containerRef,
  });

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Focus Trap Modal</h2>
        <p className="text-sm text-slate-600">
          Press Enter or click the button to open. Tab and Shift+Tab loop within the modal.
          Press Esc to close and return focus.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
      >
        Open modal
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onFocusCapture={handleFocusCapture}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={titleId} className="text-base font-semibold text-slate-900">
                  Invite collaborator
                </h3>
                <p id={descriptionId} className="text-sm text-slate-600">
                  This dialog traps focus until it closes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
                aria-label="Close dialog"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700" htmlFor="modal-email">
                Email address
              </label>
              <input
                id="modal-email"
                type="email"
                placeholder="name@example.com"
                data-autofocus
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
              />
              <a
                href="https://example.com"
                className="text-sm font-semibold text-slate-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
              >
                Review access policy
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
                >
                  Send invite
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
