import type { MeetingListItem } from '@/types/meeting';

/**
 * Incoming vs Completed **section split** for the meetings hub list (client-side only).
 *
 * ## Known limitations (A3 — record before UI / snapshot tests)
 *
 * - **Inputs:** Uses only fields available on **list rows** today — primarily **`scheduled_date`** (calendar
 *   day string). There is no **`lifecycle`** / “happened” flag on the list payload.
 * - **Rule:** A meeting is **Completed** when its scheduled **calendar day** has fully ended in the
 *   **browser’s local timezone**: we compare `now` to **end of that local day** (`23:59:59.999`). This is a
 *   **time inference** from date-only data, not a ground-truth event boundary.
 * - **Undated meetings:** `scheduled_date` null/empty → treated as **Incoming** (not “past”).
 * - **Edge cases:** Meetings near midnight, timezone changes, or ambiguous “today” can land in the “wrong”
 *   section relative to user expectation — that is a **definition** of the current heuristic, not necessarily
 *   a product bug.
 * - **Future:** If the list API adds an explicit **lifecycle** or **completed-at** field, **prefer** switching
 *   this split to that field instead of extending date heuristics.
 *
 * @see `MEETING_LIST_FILTER_CONTRACT.md` — Phase A3
 */
export function isMeetingScheduledDayFullyPast(
  meeting: MeetingListItem,
  now: Date = new Date(),
): boolean {
  const raw = meeting.scheduled_date;
  if (raw == null || String(raw).trim() === '') return false;
  const dateStr = String(raw).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, mo, d] = dateStr.split('-').map((n) => Number(n));
  const endOfDay = new Date(y, mo - 1, d, 23, 59, 59, 999);
  return now.getTime() > endOfDay.getTime();
}

export function splitMeetingRowsBySchedule(
  rows: MeetingListItem[],
  now: Date = new Date(),
): { incoming: MeetingListItem[]; completed: MeetingListItem[] } {
  const incoming: MeetingListItem[] = [];
  const completed: MeetingListItem[] = [];
  for (const m of rows) {
    if (isMeetingScheduledDayFullyPast(m, now)) {
      completed.push(m);
    } else {
      incoming.push(m);
    }
  }
  return { incoming, completed };
}
