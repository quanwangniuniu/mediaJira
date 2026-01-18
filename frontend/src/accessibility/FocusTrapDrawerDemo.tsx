import { useId, useRef, useState } from 'react';
import { useFocusTrap } from './useFocusTrap';

export function FocusTrapDrawerDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap({
    isOpen,
    onClose: () => setIsOpen(false),
    containerRef,
  });

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Focus Trap Drawer</h2>
        <p className="text-sm text-slate-600">
          Open the drawer with the button. Tab cycles inside; Esc closes and restores focus.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
      >
        Open drawer
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30">
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className="h-full w-full max-w-sm bg-white p-6 shadow-xl focus-visible:outline-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={titleId} className="text-base font-semibold text-slate-900">
                  Filter results
                </h3>
                <p id={descriptionId} className="text-sm text-slate-600">
                  Focus is trapped inside this drawer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
                aria-label="Close drawer"
              >
                Close
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm font-medium text-slate-700" htmlFor="drawer-search">
                Keyword
              </label>
              <input
                id="drawer-search"
                type="text"
                placeholder="Search term"
                data-autofocus
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
              />
              <label className="text-sm font-medium text-slate-700" htmlFor="drawer-status">
                Status
              </label>
              <select
                id="drawer-status"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
              >
                <option>All</option>
                <option>Active</option>
                <option>Paused</option>
              </select>
              <a
                href="https://example.com"
                className="text-sm font-semibold text-slate-900 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
              >
                View filter tips
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
                >
                  Apply filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
