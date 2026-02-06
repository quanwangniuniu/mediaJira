'use client';

import { format } from 'date-fns';
import { ChevronDown, Search } from 'lucide-react';
import type { TimelineScale } from './timelineUtils';

export interface TimelineFilterOption {
  value: string;
  label: string;
}

export interface TimelineHeaderUser {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
}

interface TimelineHeaderProps {
  rangeStart: Date;
  rangeEnd: Date;
  scale: TimelineScale;
  searchValue: string;
  onSearchChange: (value: string) => void;
  epicOptions: TimelineFilterOption[];
  selectedEpic: string;
  onEpicChange: (value: string) => void;
  statusOptions: TimelineFilterOption[];
  selectedStatusCategory: string;
  onStatusCategoryChange: (value: string) => void;
  currentUser?: TimelineHeaderUser;
  onRangeChange: (start: Date, end: Date) => void;
  onScaleChange: (scale: TimelineScale) => void;
}

const SCALE_LABELS: Record<TimelineScale, string> = {
  today: 'Today',
  week: 'Week',
  month: 'Month',
};

const getUserInitials = (user?: TimelineHeaderUser) => {
  if (!user) return 'U';

  const first = (user.first_name || '').trim();
  const last = (user.last_name || '').trim();

  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'U';
  }

  const fallback = (user.username || user.email || '').trim();
  if (!fallback) return 'U';

  return fallback
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
};

const TimelineHeader = ({
  rangeStart,
  rangeEnd,
  scale,
  searchValue,
  onSearchChange,
  epicOptions,
  selectedEpic,
  onEpicChange,
  statusOptions,
  selectedStatusCategory,
  onStatusCategoryChange,
  currentUser,
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
    <div className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 rounded-md bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search timeline"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search timeline"
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.username || currentUser.email || 'Current user'}
              className="h-full w-full object-cover"
            />
          ) : (
            getUserInitials(currentUser)
          )}
        </div>
        <div className="relative">
          <select
            value={selectedEpic}
            onChange={(event) => onEpicChange(event.target.value)}
            aria-label="Epic filter"
            className="h-9 appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {epicOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
        <div className="relative">
          <select
            value={selectedStatusCategory}
            onChange={(event) => onStatusCategoryChange(event.target.value)}
            aria-label="Status category filter"
            className="h-9 appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="date"
            value={format(rangeStart, 'yyyy-MM-dd')}
            onChange={(event) => handleStartChange(event.target.value)}
            aria-label="Timeline start date"
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <span className="text-slate-300">to</span>
          <input
            type="date"
            value={format(rangeEnd, 'yyyy-MM-dd')}
            onChange={(event) => handleEndChange(event.target.value)}
            aria-label="Timeline end date"
            className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        {(Object.keys(SCALE_LABELS) as TimelineScale[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onScaleChange(mode)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              scale === mode
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
