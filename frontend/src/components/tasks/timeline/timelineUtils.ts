import { addDays, addHours, addWeeks, endOfDay, format, isAfter, isBefore, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns';

export type TimelineScale = 'today' | 'week' | 'month';

export interface TimelineColumn {
  key: string;
  label: string;
  start: Date;
  end: Date;
  width: number;
}

const COLUMN_WIDTHS: Record<TimelineScale, number> = {
  today: 64,
  week: 80,
  month: 120,
};

export const getColumnWidth = (scale: TimelineScale) => COLUMN_WIDTHS[scale];

export const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = parseISO(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(value);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const buildTimelineColumns = (
  rangeStart: Date,
  rangeEnd: Date,
  scale: TimelineScale
): TimelineColumn[] => {
  const columns: TimelineColumn[] = [];
  const safeStart = startOfDay(rangeStart);
  const safeEnd = endOfDay(rangeEnd);
  const width = getColumnWidth(scale);

  if (scale === 'today') {
    let cursor = safeStart;
    while (cursor < safeEnd) {
      const next = addHours(cursor, 1);
      columns.push({
        key: format(cursor, 'yyyy-MM-dd-HH'),
        label: format(cursor, 'HH:mm'),
        start: cursor,
        end: next,
        width,
      });
      cursor = next;
    }
    return columns;
  }

  if (scale === 'week') {
    let cursor = startOfDay(safeStart);
    while (cursor <= safeEnd) {
      const next = addDays(cursor, 1);
      columns.push({
        key: format(cursor, 'yyyy-MM-dd'),
        label: format(cursor, 'EEE d'),
        start: cursor,
        end: next,
        width,
      });
      cursor = next;
    }
    return columns;
  }

  let cursor = startOfWeek(startOfMonth(safeStart), { weekStartsOn: 1 });
  while (cursor <= safeEnd) {
    const next = addWeeks(cursor, 1);
    columns.push({
      key: format(cursor, 'yyyy-MM-dd'),
      label: format(cursor, 'MMM d'),
      start: cursor,
      end: next,
      width,
    });
    cursor = next;
  }

  return columns;
};

const clampDate = (value: Date, rangeStart: Date, rangeEnd: Date) => {
  if (isBefore(value, rangeStart)) return rangeStart;
  if (isAfter(value, rangeEnd)) return rangeEnd;
  return value;
};

export const dateToX = (
  value: Date,
  rangeStart: Date,
  rangeEnd: Date,
  columns: TimelineColumn[]
): number => {
  if (!columns.length) return 0;
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const clamped = clampDate(value, rangeStart, rangeEnd);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  if (totalMs <= 0) return 0;
  const delta = clamped.getTime() - rangeStart.getTime();
  return (delta / totalMs) * totalWidth;
};

export const widthFromRange = (
  start: Date,
  end: Date,
  rangeStart: Date,
  rangeEnd: Date,
  columns: TimelineColumn[],
  minWidth = 8
): number => {
  if (!columns.length) return minWidth;
  const safeStart = start.getTime() <= end.getTime() ? start : end;
  const safeEnd = start.getTime() <= end.getTime() ? end : start;
  const left = dateToX(safeStart, rangeStart, rangeEnd, columns);
  const right = dateToX(safeEnd, rangeStart, rangeEnd, columns);
  return Math.max(right - left, minWidth);
};

export const xToDate = (
  x: number,
  rangeStart: Date,
  rangeEnd: Date,
  columns: TimelineColumn[]
): Date => {
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const clamped = Math.max(0, Math.min(x, totalWidth));
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const ratio = totalWidth ? clamped / totalWidth : 0;
  return new Date(rangeStart.getTime() + ratio * totalMs);
};
