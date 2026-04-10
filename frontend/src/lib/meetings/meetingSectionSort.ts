import type { MeetingListItem } from '@/types/meeting';

/** Client-side ordering for Incoming / Completed lists (not the API `ordering` param). */
export type MeetingSortKey =
  | 'date_desc'
  | 'date_asc'
  | 'title_asc'
  | 'title_desc';

export const DEFAULT_MEETING_SORT: MeetingSortKey = 'date_desc';

export const MEETING_SORT_OPTIONS: { value: MeetingSortKey; label: string }[] = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
];

function stableId(a: MeetingListItem, b: MeetingListItem): number {
  return a.id - b.id;
}

function scheduledMs(m: MeetingListItem): number | null {
  const d = m.scheduled_date;
  if (!d) return null;
  const t = Date.parse(d.length <= 10 ? `${d}T12:00:00` : d);
  return Number.isNaN(t) ? null : t;
}

/** Meetings without a scheduled date sort after dated rows for both date orders. */
function compareByScheduledDate(
  a: MeetingListItem,
  b: MeetingListItem,
  dir: 'asc' | 'desc',
): number {
  const ha = scheduledMs(a);
  const hb = scheduledMs(b);
  const hasA = ha != null;
  const hasB = hb != null;
  if (!hasA && !hasB) return stableId(a, b);
  if (!hasA) return 1;
  if (!hasB) return -1;
  const diff = ha! - hb!;
  if (diff !== 0) return dir === 'asc' ? diff : -diff;
  return stableId(a, b);
}

export function applyMeetingSort(
  meetings: MeetingListItem[],
  sortKey: MeetingSortKey,
): MeetingListItem[] {
  const next = [...meetings];

  switch (sortKey) {
    case 'date_desc':
      return next.sort((a, b) => compareByScheduledDate(a, b, 'desc'));
    case 'date_asc':
      return next.sort((a, b) => compareByScheduledDate(a, b, 'asc'));
    case 'title_asc':
      return next.sort((a, b) => {
        const c = a.title.localeCompare(b.title);
        if (c !== 0) return c;
        return stableId(a, b);
      });
    case 'title_desc':
      return next.sort((a, b) => {
        const c = b.title.localeCompare(a.title);
        if (c !== 0) return c;
        return stableId(a, b);
      });
    default:
      return next;
  }
}
