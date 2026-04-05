import type { MeetingListQueryParams } from '@/types/meeting';
import { DEFAULT_MEETING_ORDERING } from '@/lib/meetings/meetingOrdering';

const BOOL = new Set(['true', '1', 'yes']);

/**
 * Query keys persisted in the **browser URL** for the meetings hub (`parseMeetingDiscoveryParams` /
 * `discoveryParamsToSearchParamsString`). This is a superset of what the list API accepts.
 *
 * **Sent to `GET .../meetings/`:** all keys below (same as API). Section sort for Incoming/Completed is **not**
 * stored in the URL — it lives in React state on the hub page.
 */
export const MEETING_DISCOVERY_QUERY_KEYS = [
  'q',
  'meeting_type',
  'participant',
  'exclude_participant',
  'tag',
  'date_from',
  'date_to',
  'is_archived',
  'has_generated_decisions',
  'has_generated_tasks',
  'ordering',
  'page',
] as const;

/** Tri-state UI (Any / With / Without) ↔ API boolean | omitted. */
export function triBoolToSelect(v: boolean | undefined): '' | 'yes' | 'no' {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
}

export function selectToTriBool(s: string): boolean | undefined {
  if (s === 'yes') return true;
  if (s === 'no') return false;
  return undefined;
}

export function parseMeetingDiscoveryParams(
  searchParams: URLSearchParams,
): MeetingListQueryParams {
  const q = searchParams.get('q')?.trim() || undefined;
  const meetingTypeList = searchParams
    .getAll('meeting_type')
    .map((s) => String(s).trim())
    .filter(Boolean);
  const meeting_type =
    meetingTypeList.length > 0 ? [...new Set(meetingTypeList)] : undefined;
  const tag = searchParams.get('tag')?.trim() || undefined;
  const participantList = searchParams
    .getAll('participant')
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n) && n >= 1);
  const participant =
    participantList.length > 0 ? [...new Set(participantList)] : undefined;
  const excludeList = searchParams
    .getAll('exclude_participant')
    .map((s) => Number(String(s).trim()))
    .filter((n) => Number.isFinite(n) && n >= 1);
  const exclude_participant =
    excludeList.length > 0 ? [...new Set(excludeList)] : undefined;
  const date_from = searchParams.get('date_from')?.trim() || undefined;
  const date_to = searchParams.get('date_to')?.trim() || undefined;
  const ordering = searchParams.get('ordering')?.trim() || undefined;
  const pageRaw = searchParams.get('page');
  const page =
    pageRaw != null && pageRaw !== '' ? Math.max(1, Number(pageRaw) || 1) : undefined;

  let is_archived: boolean | undefined;
  if (searchParams.has('is_archived')) {
    const v = searchParams.get('is_archived')?.toLowerCase() ?? '';
    if (v === 'false' || v === '0' || v === 'no') is_archived = false;
    else if (BOOL.has(v)) is_archived = true;
  }

  const out: MeetingListQueryParams = {};
  if (q) out.q = q;
  if (meeting_type != null && meeting_type.length > 0) {
    out.meeting_type = meeting_type;
  }
  if (tag) out.tag = tag;
  if (participant != null && participant.length > 0) {
    out.participant = participant;
  }
  if (exclude_participant != null && exclude_participant.length > 0) {
    out.exclude_participant = exclude_participant;
  }
  if (date_from) out.date_from = date_from;
  if (date_to) out.date_to = date_to;
  if (is_archived !== undefined) out.is_archived = is_archived;

  let has_generated_decisions: boolean | undefined;
  if (searchParams.has('has_generated_decisions')) {
    const v = searchParams.get('has_generated_decisions')?.toLowerCase() ?? '';
    if (v === 'false' || v === '0' || v === 'no') has_generated_decisions = false;
    else if (BOOL.has(v)) has_generated_decisions = true;
  }
  let has_generated_tasks: boolean | undefined;
  if (searchParams.has('has_generated_tasks')) {
    const v = searchParams.get('has_generated_tasks')?.toLowerCase() ?? '';
    if (v === 'false' || v === '0' || v === 'no') has_generated_tasks = false;
    else if (BOOL.has(v)) has_generated_tasks = true;
  }

  if (has_generated_decisions !== undefined) {
    out.has_generated_decisions = has_generated_decisions;
  }
  if (has_generated_tasks !== undefined) {
    out.has_generated_tasks = has_generated_tasks;
  }
  if (ordering) out.ordering = ordering;
  if (page != null) out.page = page;
  return out;
}

/**
 * Merge a partial patch into current discovery params (same rules as the meetings page router.replace).
 * Use for tests and any other caller that must mirror URL state updates.
 */
export function mergeMeetingDiscoveryPatch(
  current: MeetingListQueryParams,
  patch: Partial<MeetingListQueryParams>,
  options: { resetPage: boolean; defaultOrdering: string },
): MeetingListQueryParams {
  const { resetPage, defaultOrdering } = options;
  const merged: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) {
      delete merged[k];
    } else {
      merged[k] = v;
    }
  }
  if (resetPage && patch.page === undefined) {
    delete merged.page;
  }
  if (merged.page === 1) {
    delete merged.page;
  }
  const ord = merged.ordering as string | undefined;
  if (!ord || ord === defaultOrdering) {
    delete merged.ordering;
  }
  return merged as MeetingListQueryParams;
}

export function hasActiveDiscoveryFilters(params: MeetingListQueryParams): boolean {
  return Boolean(
    params.q ||
      (params.meeting_type && params.meeting_type.length > 0) ||
      params.tag ||
      (params.participant && params.participant.length > 0) ||
      (params.exclude_participant && params.exclude_participant.length > 0) ||
      params.date_from ||
      params.date_to ||
      params.is_archived !== undefined ||
      params.has_generated_decisions !== undefined ||
      params.has_generated_tasks !== undefined ||
      (params.ordering && params.ordering !== DEFAULT_MEETING_ORDERING),
  );
}

/** Structured filters only (excludes keyword `q` and `page`) — for Filter badge count. */
export function activeMeetingDiscoveryFilterCount(
  params: MeetingListQueryParams,
): number {
  let n = 0;
  /* meeting_type is toolbar-only — not counted toward Filter popover badge */
  if (params.tag) n++;
  if (params.participant != null && params.participant.length > 0) n++;
  if (params.exclude_participant != null && params.exclude_participant.length > 0)
    n++;
  if (params.date_from) n++;
  if (params.date_to) n++;
  if (params.is_archived !== undefined) n++;
  if (params.has_generated_decisions !== undefined) n++;
  if (params.has_generated_tasks !== undefined) n++;
  if (params.ordering && params.ordering !== DEFAULT_MEETING_ORDERING) n++;
  return n;
}

export function discoveryParamsToSearchParamsString(
  params: MeetingListQueryParams,
): string {
  const p = new URLSearchParams();
  if (params.q?.trim()) p.set('q', params.q.trim());
  if (params.meeting_type?.length) {
    for (const slug of params.meeting_type) {
      const s = slug.trim();
      if (s) p.append('meeting_type', s);
    }
  }
  if (params.tag?.trim()) p.set('tag', params.tag.trim());
  if (params.participant?.length) {
    for (const id of params.participant) {
      if (Number.isFinite(id) && id >= 1) p.append('participant', String(id));
    }
  }
  if (params.exclude_participant?.length) {
    for (const id of params.exclude_participant) {
      if (Number.isFinite(id) && id >= 1) {
        p.append('exclude_participant', String(id));
      }
    }
  }
  if (params.date_from) p.set('date_from', params.date_from);
  if (params.date_to) p.set('date_to', params.date_to);
  if (params.is_archived === true) p.set('is_archived', 'true');
  if (params.is_archived === false) p.set('is_archived', 'false');
  if (params.has_generated_decisions === true) p.set('has_generated_decisions', 'true');
  if (params.has_generated_decisions === false) p.set('has_generated_decisions', 'false');
  if (params.has_generated_tasks === true) p.set('has_generated_tasks', 'true');
  if (params.has_generated_tasks === false) p.set('has_generated_tasks', 'false');
  if (params.ordering && params.ordering !== DEFAULT_MEETING_ORDERING) {
    p.set('ordering', params.ordering);
  }
  if (params.page != null && params.page > 1) p.set('page', String(params.page));
  return p.toString();
}
