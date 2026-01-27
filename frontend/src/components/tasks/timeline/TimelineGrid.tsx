'use client';

import type { ReactNode } from 'react';
import type { TimelineColumn } from './timelineUtils';

interface TimelineGridProps {
  columns: TimelineColumn[];
  leftColumnWidth?: number;
  children: ReactNode;
}

const TimelineGrid = ({ columns, leftColumnWidth = 280, children }: TimelineGridProps) => {
  const columnWidth = columns[0]?.width ?? 80;
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div
        className="grid items-stretch border-b border-gray-200 bg-gray-50"
        style={{ gridTemplateColumns: `${leftColumnWidth}px 1fr` }}
      >
        <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Work
        </div>
        <div className="overflow-x-auto scrollbar-hide" data-timeline-scroll>
          <div className="flex" style={{ minWidth: totalWidth }}>
            {columns.map((column) => (
              <div
                key={column.key}
                className="flex h-full items-center justify-center border-l border-gray-200 px-2 py-3 text-xs font-medium text-gray-600"
                style={{ width: column.width }}
              >
                {column.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-200">
        {columns.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-500">
            Select a date range to view the timeline.
          </div>
        ) : (
          <div>{children}</div>
        )}
      </div>
    </div>
  );
};

export default TimelineGrid;
