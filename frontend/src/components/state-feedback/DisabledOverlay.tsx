import type { ReactNode } from 'react';

type DisabledOverlayProps = {
  isDisabled?: boolean;
  message?: string;
  children: ReactNode;
  className?: string;
};

export default function DisabledOverlay({
  isDisabled = false,
  message = 'Disabled',
  children,
  className = '',
}: DisabledOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      <div className={isDisabled ? 'pointer-events-none select-none opacity-60' : ''}>
        {children}
      </div>
      {isDisabled ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl border border-slate-300 bg-slate-900/10 backdrop-blur-sm">
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-lg">
            {message}
          </span>
        </div>
      ) : null}
    </div>
  );
}
