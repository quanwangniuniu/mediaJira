'use client';

import type { ReactNode } from 'react';
import type { TimelineColumn } from './timelineUtils';

interface TimelineGridProps {
  columns: TimelineColumn[];
  leftColumnWidth?: number;
  todayPosition?: number | null;
  children: ReactNode;
}

const TimelineGrid = ({
  columns,
  leftColumnWidth = 280,
  todayPosition,
  children,
}: TimelineGridProps) => {
  const columnWidth = columns[0]?.width ?? 80;
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  return (
    <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
      <div
        className="grid items-stretch border-b border-slate-200 bg-slate-50"
        style={{ gridTemplateColumns: `${leftColumnWidth}px 1fr` }}
      >
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Work
        </div>
        <div className="overflow-x-auto scrollbar-hide" data-timeline-scroll>
          <div className="flex" style={{ minWidth: totalWidth }}>
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex h-full items-center justify-center border-l border-slate-200 px-2 py-2 text-[11px] font-medium text-slate-500"
                style={{ width: column.width }}
              >
                {column.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-200">
        {columns.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            Select a date range to view the timeline.
          </div>
        ) : (
          <div className="relative">
            {typeof todayPosition === 'number' ? (
              <div
                className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-blue-500 z-20"
                style={{ left: leftColumnWidth + todayPosition }}
              />
            ) : null}
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineGrid;
