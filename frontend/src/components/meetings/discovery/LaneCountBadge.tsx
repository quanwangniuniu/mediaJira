'use client';

import { useEffect } from 'react';

type LaneCountBadgeProps = {
  /** Badge A — filtered count in lane. */
  visible?: number;
  /** Badge B — lane total without discovery filters. */
  total?: number;
  loading: boolean;
  /** For dev-only console (e.g. "incoming meetings"). */
  debugLabel?: string;
};

/**
 * Hub lane header badge: `A OF B`, loading `…`, or missing data fallback.
 * In development, shows `INVALID` when counts are missing (easier than a bare em dash).
 */
export function LaneCountBadge({
  visible,
  total,
  loading,
  debugLabel,
}: LaneCountBadgeProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    console.log('LaneCountBadge props', debugLabel ?? '(lane)', {
      visible,
      total,
    });
  }, [debugLabel, visible, total]);

  const hasAB =
    typeof visible === 'number' &&
    typeof total === 'number' &&
    Number.isFinite(visible) &&
    Number.isFinite(total);
  const hasAOnly =
    typeof visible === 'number' && Number.isFinite(visible) && !hasAB;

  const badgeText = hasAB
    ? `${visible} OF ${total}`
    : loading
      ? '…'
      : hasAOnly
        ? String(visible)
        : process.env.NODE_ENV !== 'production'
          ? 'INVALID'
          : '—';

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-md bg-slate-200/90 px-2 py-0.5 text-[11px] font-semibold uppercase tabular-nums tracking-wide text-slate-700"
      aria-label={
        hasAB
          ? `${visible} of ${total} meetings in this column`
          : loading
            ? 'Loading count'
            : hasAOnly
              ? `${visible} meetings matching filters in this column`
              : 'Counts unavailable'
      }
    >
      {badgeText}
    </span>
  );
}
