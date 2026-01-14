'use client';

import { format } from 'date-fns';
import type { TimelineScale } from './timelineUtils';

interface TimelineHeaderProps {
  rangeStart: Date;
  rangeEnd: Date;
  scale: TimelineScale;
  onRangeChange: (start: Date, end: Date) => void;
  onScaleChange: (scale: TimelineScale) => void;
}

const SCALE_LABELS: Record<TimelineScale, string> = {
  today: 'Today',
  week: 'Week',
  month: 'Month',
};

const TimelineHeader = ({
  rangeStart,
  rangeEnd,
  scale,
  onRangeChange,
  onScaleChange,
}: TimelineHeaderProps) => {
  const handleStartChange = (value: string) => {
    const nextStart = new Date(`${value}T00:00:00`);
    if (Number.isNaN(nextStart.getTime())) return;
    const nextEnd = rangeEnd < nextStart ? nextStart : rangeEnd;
    onRangeChange(nextStart, nextEnd);
  };

  const handleEndChange = (value: string) => {
    const nextEnd = new Date(`${value}T00:00:00`);
    if (Number.isNaN(nextEnd.getTime())) return;
    const nextStart = rangeStart > nextEnd ? nextEnd : rangeStart;
    onRangeChange(nextStart, nextEnd);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-gray-200 rounded-lg bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm font-semibold text-gray-800">Timeline Range</div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="date"
            value={format(rangeStart, 'yyyy-MM-dd')}
            onChange={(event) => handleStartChange(event.target.value)}
            aria-label="Timeline start date"
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={format(rangeEnd, 'yyyy-MM-dd')}
            onChange={(event) => handleEndChange(event.target.value)}
            aria-label="Timeline end date"
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(Object.keys(SCALE_LABELS) as TimelineScale[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onScaleChange(mode)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              scale === mode
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {SCALE_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimelineHeader;
