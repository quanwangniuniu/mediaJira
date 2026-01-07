import { buildTimelineColumns, dateToX, widthFromRange } from '@/components/tasks/timeline/timelineUtils';

describe('timelineUtils', () => {
  it('builds week columns for a 7-day range', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-07T00:00:00Z');
    const columns = buildTimelineColumns(start, end, 'week');
    expect(columns).toHaveLength(7);
    expect(columns[0].label).toContain('Mon');
  });

  it('maps dates to x positions within the range', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-08T00:00:00Z');
    const columns = buildTimelineColumns(start, end, 'week');
    const left = dateToX(start, start, end, columns);
    const right = dateToX(end, start, end, columns);
    expect(left).toBe(0);
    expect(right).toBeGreaterThan(left);
  });

  it('calculates width from a date range with a minimum size', () => {
    const start = new Date('2024-01-01T00:00:00Z');
    const end = new Date('2024-01-08T00:00:00Z');
    const columns = buildTimelineColumns(start, end, 'week');
    const width = widthFromRange(start, start, start, end, columns, 12);
    expect(width).toBeGreaterThanOrEqual(12);
  });
});
